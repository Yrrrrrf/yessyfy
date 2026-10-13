use super::{
    Principal, Product,
    discovery::{coverage, slot_key},
    helpers::*,
    store::{Plan, Row},
};
use crate::shared::error::Fault;
use chrono::{Duration, Utc};
use serde_json::{Value, json};
impl Product {
    pub async fn preview_quote(&self, d: &Value, a: &Principal) -> Result<Value, Fault> {
        if !roles(&a.user.data, "customer") {
            return Err(Fault::new("forbidden", "customer account required"));
        }
        let b = &d["booking"];
        validate_booking(b)?;
        let s = self
            .store
            .require("service_catalog", b["service_id"].as_str().unwrap_or(""))
            .await?;
        if s.data["category"] != b["category"]
            || !s.data["modes"]
                .as_array()
                .is_some_and(|m| m.contains(&b["mode"]))
            || !coverage(
                b["address"]["city"].as_str().unwrap_or(""),
                s.data["area"].as_str().unwrap_or(""),
            )
        {
            return Err(Fault::invalid("service does not cover this booking"));
        }
        let urgency = match b["urgency"].as_str() {
            Some("mismo_dia") => 13000,
            Some("emergencia_24_7") => 18000,
            _ => 10000,
        };
        let location = match b["location_type"].as_str() {
            Some("comercial") => 12000,
            Some("premium") => 15000,
            _ => 10000,
        };
        let base = amount(&s.data, "estimate_cents")?
            .checked_mul(urgency)
            .and_then(|n| n.checked_mul(location))
            .ok_or_else(|| Fault::invalid("price overflow"))?
            / 100_000_000;
        let discount = if a.user.data["membership"]["active"] == true {
            base * 1500 / 10000
        } else {
            0
        };
        let id = new_id();
        let quote = json!({"id":id,"revision":1,"expires_at":(Utc::now()+Duration::minutes(10)).to_rfc3339(),"scope":b["description"],"currency":"MXN","base_cents":base,"increment_cents":0,"discount_cents":discount,"previous_total_cents":0,"total_cents":base-discount,"labor_cents":base,"parts_cents":0,"reason":"","status":"preview","allowed_actions":[]});
        let mut plan = a.plan();
        plan.guard(&s);
        plan.put(Row::new(
            "quote",
            &id,
            json!({"id":id,"quote":quote,"booking":b,"consumed":false}),
            Some(a.id()),
            None,
        )?);
        plan.result = quote;
        self.store.commit(plan, None).await
    }
    pub async fn command(
        &self,
        op: &str,
        p: &Value,
        c: &Value,
        a: &Principal,
        plan: &mut Plan,
    ) -> Result<(), Fault> {
        match op {
            "updateProfile" => {
                let mut r = a.user.clone();
                let object = p
                    .as_object()
                    .ok_or_else(|| Fault::invalid("profile fields required"))?;
                let allowed = [
                    "name",
                    "locale",
                    "area",
                    "vehicle",
                    "trades",
                    "fiscal",
                    "addresses",
                ];
                if object.keys().any(|k| !allowed.contains(&k.as_str())) {
                    return Err(Fault::invalid("profile contains protected fields"));
                }
                for k in ["name", "area", "vehicle"] {
                    if p.get(k).is_some() {
                        r.data[k] = json!(text(
                            p,
                            k,
                            if k == "name" { 1 } else { 0 },
                            if k == "name" { 200 } else { 500 }
                        )?);
                    }
                }
                if p.get("locale").is_some() {
                    r.data["locale"] = json!(choice(p, "locale", &["es", "en"])?);
                }
                if let Some(trades) = p.get("trades") {
                    let ts = trades
                        .as_array()
                        .filter(|t| t.len() <= 6)
                        .ok_or_else(|| Fault::invalid("invalid trades"))?;
                    for t in ts {
                        if ![
                            "plomeria",
                            "electricidad",
                            "cerrajeria",
                            "jardineria",
                            "mantenimiento_hogar",
                            "albanileria",
                        ]
                        .contains(&t.as_str().unwrap_or(""))
                        {
                            return Err(Fault::invalid("invalid trade"));
                        }
                    }
                    r.data["trades"] = trades.clone();
                }
                if let Some(fiscal) = p.get("fiscal") {
                    let mut value = json!({});
                    for k in ["rfc", "name", "postal_code", "regime", "use"] {
                        value[k] = json!(text(fiscal, k, 0, 200)?);
                    }
                    if !value["postal_code"].as_str().unwrap_or("").is_empty()
                        && !value["postal_code"]
                            .as_str()
                            .unwrap_or("")
                            .bytes()
                            .all(|b| b.is_ascii_digit())
                    {
                        return Err(Fault::invalid("invalid fiscal postal code"));
                    }
                    r.data["fiscal"] = value;
                }
                if let Some(addresses) = p.get("addresses") {
                    let list = addresses
                        .as_array()
                        .filter(|s| s.len() <= 20)
                        .ok_or_else(|| Fault::invalid("invalid addresses"))?;
                    let mut values = vec![];
                    for v in list {
                        let mut n = json!({});
                        for k in ["label", "street", "city", "postal_code", "access"] {
                            n[k] = json!(text(v, k, 0, 1000)?);
                        }
                        if let Some(id) = v.get("id") {
                            n["id"] = id.clone();
                        }
                        if let Some(g) = v.get("coordinates") {
                            coordinates(g)?;
                            n["coordinates"] = g.clone();
                        }
                        values.push(n);
                    }
                    r.data["addresses"] = json!(values);
                }
                if roles(&r.data, "collaborator")
                    && a.user.data["eligibility"] == "verified"
                    && ["trades", "area", "vehicle"]
                        .iter()
                        .any(|k| r.data[*k] != a.user.data[*k])
                {
                    if !a.user.data["busy_order_id"].is_null() {
                        return Err(Fault::new(
                            "conflict",
                            "finish active work before changing verified qualifications",
                        ));
                    }
                    r.data["eligibility"] = json!("unsubmitted");
                    r.data["duty"] = json!(false);
                }
                bump(&mut r);
                plan.result = r.data.clone();
                plan.put(r);
                plan.event(a.id(), "inbox", a.id());
            }
            "submitVerification" => {
                let mut r = if p.get("id").is_some() {
                    require_ops(&a.user.data)?;
                    self.store.require("user", &text(p, "id", 1, 100)?).await?
                } else {
                    a.user.clone()
                };
                if p.get("id").is_some() {
                    let decision = choice(p, "decision", &["verify", "reject"])?;
                    if r.data["eligibility"] != "submitted"
                        && !(decision == "reject" && r.data["eligibility"] == "verified")
                    {
                        return Err(Fault::new(
                            "conflict",
                            "profile is not awaiting verification",
                        ));
                    }
                    r.data["eligibility"] = json!(if decision == "verify" {
                        "verified"
                    } else {
                        "rejected"
                    });
                    r.data["review_reason"] = json!(text(
                        p,
                        "reason",
                        if decision == "reject" { 5 } else { 0 },
                        2000
                    )?);
                    if decision == "reject" {
                        r.data["duty"] = json!(false);
                    }
                    notify(
                        plan,
                        r.key(),
                        "Verificación actualizada",
                        r.data["eligibility"].as_str().unwrap_or(""),
                        "vision",
                        "/onboarding",
                    )?;
                } else {
                    if !roles(&r.data, "collaborator") {
                        return Err(Fault::new("forbidden", "collaborator account required"));
                    }
                    let docs = r.data["verification_documents"]
                        .as_array()
                        .ok_or_else(|| Fault::invalid("verification documents required"))?;
                    for kind in ["identity", "address", "credential"] {
                        if !docs.iter().any(|d| d["kind"] == kind) {
                            return Err(Fault::invalid(
                                "identity, address and credential documents required",
                            ));
                        }
                    }
                    if r.data["trades"].as_array().is_none_or(|t| t.is_empty())
                        || r.data["area"] != "CDMX"
                    {
                        return Err(Fault::invalid("trade and coverage are required"));
                    }
                    r.data["eligibility"] = json!("submitted");
                    r.data["duty"] = json!(false);
                    r.data["review_reason"] = json!("");
                }
                bump(&mut r);
                plan.result = r.data.clone();
                plan.put(r);
            }
            "duty" => {
                require_field(&a.user.data)?;
                let value = p
                    .get("desired")
                    .or_else(|| p.get("active"))
                    .and_then(|v| v.as_bool())
                    .ok_or_else(|| Fault::invalid("active duty flag required"))?;
                let mut r = a.user.clone();
                r.data["duty"] = json!(value);
                bump(&mut r);
                plan.result = r.data.clone();
                plan.put(r);
            }
            "createOrder" => {
                if !roles(&a.user.data, "customer") {
                    return Err(Fault::new("forbidden", "customer required"));
                }
                let mut q = self
                    .store
                    .require("quote", &text(p, "quote_id", 1, 100)?)
                    .await?;
                if q.owner.as_deref() != Some(a.user.id.as_str())
                    || q.data["consumed"] == true
                    || expired(&q.data["quote"]["expires_at"])
                    || c["expected_revision"] != q.data["quote"]["revision"]
                    || canonical(&q.data["booking"]) != canonical(&p["booking"])
                {
                    return Err(Fault::new("conflict", "quotation changed, used or expired"));
                }
                let b = q.data["booking"].clone();
                let s = self
                    .store
                    .require("service_catalog", b["service_id"].as_str().unwrap_or(""))
                    .await?;
                plan.guard(&s);
                let slot_id = slot_key(
                    s.key(),
                    b["date"].as_str().unwrap_or(""),
                    b["slot"].as_str().unwrap_or(""),
                    b["address"]["city"].as_str().unwrap_or(""),
                );
                let mut slot=self.store.get("service_slot",&slot_id).await?.unwrap_or(Row::new("service_slot",&slot_id,json!({"service_id":s.key(),"date":b["date"],"slot":b["slot"],"reserved":0}),None,None)?);
                let used = slot.data["reserved"].as_u64().unwrap_or(8);
                if used >= 8 {
                    return Err(Fault::new("conflict", "selected slot is full"));
                }
                slot.data["reserved"] = json!(used + 1);
                plan.put(slot);
                q.data["consumed"] = json!(true);
                let mut quote = q.data["quote"].clone();
                quote["status"] = json!("approved");
                let id = new_id();
                quote["order_id"] = json!(id);
                let total = amount(&quote, "total_cents")?;
                let finance = self.finance_values(total)?;
                let mut row = Row::new(
                    "job_order",
                    &id,
                    json!({"id":id,"code":format!("YSF-{}",&id[..12].to_uppercase()),"revision":1,"customer_id":a.id(),"customer_name":a.user.data["name"],"booking":b,"quote":quote,"status":"pending_triage","allowed_actions":[],"evidence":[],"timeline":[],"updated_at":now(),"qa":"not_ready","customer_review":"pending","finance":finance,"slot_key":slot_id}),
                    Some(a.id()),
                    None,
                )?;
                changed(&mut row, &a.user.data, "created", "Solicitud confirmada");
                self.payment_intent(plan, &row, total, "charge")?;
                plan.result = row.data.clone();
                self.emit_order(plan, &row).await?;
                plan.put(row);
                plan.put(q);
            }
            "offer" | "acceptOffer" | "declineOffer" | "progress" | "propose" | "decideQuote"
            | "review" | "qa" | "cancelOrder" | "reconcileFinance" => {
                self.workflow(op, p, c, a, plan).await?
            }
            "beginUpload" | "renewUpload" | "completeUpload" | "attachEvidence"
            | "attachVerification" => self.media_command(op, p, c, a, plan).await?,
            "sendMessage" | "markRead" | "createCase" | "resolveCase" | "requestDocument" => {
                self.outcome_command(op, p, c, a, plan).await?
            }
            _ => return Err(Fault::new("not_found", "operation is not implemented")),
        }
        Ok(())
    }
    pub fn finance_values(&self, total: u64) -> Result<Value, Fault> {
        if total > 1_000_000_000_000 {
            return Err(Fault::invalid("total exceeds centavo limit"));
        }
        let fee = total * self.config.application.fee_basis_points / 10000;
        let withholding = total * self.config.application.withholding_basis_points / 10000;
        Ok(
            json!({"total_cents":total,"fee_cents":fee,"withholding_cents":withholding,"net_cents":total-fee-withholding,"payment":"pending","payout":"not_ready"}),
        )
    }
    pub fn payment_intent(
        &self,
        plan: &mut Plan,
        o: &Row,
        amount: u64,
        action: &str,
    ) -> Result<(), Fault> {
        let id = new_id();
        let data = json!({"id":id,"order_id":o.key(),"amount_cents":amount,"status":"pending","action":action,"provider_receipt":null});
        plan.put(Row::new(
            "payment_attempt",
            &id,
            data,
            Some(o.data["customer_id"].as_str().unwrap_or("")),
            Some(o.key()),
        )?);
        plan.put(job(
            &format!("payment_{id}"),
            "payment",
            json!({"attempt_id":id,"order_id":o.key(),"customer_id":o.data["customer_id"],"amount_cents":amount,"action":action}),
            Some(o.data["customer_id"].as_str().unwrap_or("")),
            Some(o.key()),
        )?);
        Ok(())
    }
}
