use super::{
    Principal, Product,
    discovery::{cancel_fee, eligible},
    helpers::*,
    store::{Plan, Row},
};
use crate::shared::error::Fault;
use chrono::{Duration, Utc};
use serde_json::{Value, json};
impl Product {
    pub async fn workflow(
        &self,
        op: &str,
        p: &Value,
        c: &Value,
        a: &Principal,
        plan: &mut Plan,
    ) -> Result<(), Fault> {
        if op == "acceptOffer" || op == "declineOffer" {
            require_field(&a.user.data)?;
            let mut offer = self
                .store
                .require("dispatch_offer", &text(p, "id", 1, 100)?)
                .await?;
            revision(&offer, c)?;
            if offer.data["collaborator_id"] != a.id()
                || offer.data["status"] != "pending"
                || expired(&offer.data["expires_at"])
            {
                return Err(Fault::new("conflict", "offer unavailable or expired"));
            }
            let mut o = self
                .store
                .require("job_order", offer.data["order_id"].as_str().unwrap_or(""))
                .await?;
            if !matches!(
                o.data["status"].as_str(),
                Some("pending_triage" | "dispatched")
            ) || !o.data["collaborator_id"].is_null()
            {
                return Err(Fault::new("conflict", "order already assigned"));
            }
            if op == "declineOffer" {
                offer.data["status"] = json!("declined");
                bump(&mut offer);
                plan.result = super::discovery::offer_projection(offer.data.clone());
                plan.event(a.id(), "offer", offer.key());
                plan.guard(&o);
                plan.put(offer);
                return Ok(());
            }
            if !eligible(&a.user.data, &o.data) {
                return Err(Fault::new(
                    "conflict",
                    "collaborator eligibility or availability changed",
                ));
            }
            let mut user = a.user.clone();
            user.data["busy_order_id"] = o.data["id"].clone();
            bump(&mut user);
            plan.put(user);
            offer.data["status"] = json!("accepted");
            bump(&mut offer);
            let offer_id = offer.key().to_owned();
            plan.put(offer);
            o.data["collaborator_id"] = json!(a.id());
            o.data["collaborator_name"] = a.user.data["name"].clone();
            o.data["status"] = json!("accepted");
            o.data["pass"] = json!({"code":new_id()[..8].to_owned(),"expires_at":(Utc::now()+Duration::hours(2)).to_rfc3339(),"vehicle":a.user.data["vehicle"]});
            for mut other in self
                .store
                .list(
                    "dispatch_offer",
                    "order_id=type::record($order) AND data.status='pending'",
                    json!({"order":o.id}),
                )
                .await?
            {
                if other.key() != offer_id {
                    other.data["status"] = json!("expired");
                    bump(&mut other);
                    plan.event(
                        other.data["collaborator_id"].as_str().unwrap_or(""),
                        "offer",
                        other.key(),
                    );
                    plan.put(other);
                }
            }
            changed(&mut o, &a.user.data, "assigned", "Asignación aceptada");
            notify(
                plan,
                o.data["customer_id"].as_str().unwrap_or(""),
                "Colaborador asignado",
                a.user.data["name"].as_str().unwrap_or(""),
                "main",
                &format!("/orders/{}", o.key()),
            )?;
            plan.event(a.id(), "offer", &offer_id);
            self.emit_order(plan, &o).await?;
            plan.result = o.data.clone();
            plan.put(o);
            return Ok(());
        }
        let mut o = self
            .store
            .require("job_order", &text(p, "id", 1, 100)?)
            .await?;
        authorize(&o.data, &a.user.data)?;
        revision(&o, c)?;
        match op {
            "offer" => {
                require_ops(&a.user.data)?;
                require_action(&o.data, &a.user.data, "dispatch.offer")?;
                let target = self
                    .store
                    .require("user", &text(p, "collaborator_id", 1, 100)?)
                    .await?;
                if !eligible(&target.data, &o.data) {
                    return Err(Fault::new("conflict", "collaborator is no longer eligible"));
                }
                plan.guard(&target);
                let existing=self.store.list("dispatch_offer","order_id=type::record($order) AND data.collaborator_id=$collaborator AND data.status='pending'",json!({"order":o.id,"collaborator":target.key()})).await?;
                if existing.iter().any(|e| !expired(&e.data["expires_at"])) {
                    return Err(Fault::new("conflict", "an active offer already exists"));
                }
                let id = new_id();
                let offer = Row::new(
                    "dispatch_offer",
                    &id,
                    json!({"id":id,"revision":1,"order_id":o.key(),"order_code":o.data["code"],"collaborator_id":target.key(),"expires_at":(Utc::now()+Duration::seconds(45)).to_rfc3339(),"status":"pending","service":o.data["booking"]["category"],"area":o.data["booking"]["address"]["city"],"description":o.data["booking"]["description"],"net_cents":o.data["finance"]["net_cents"],"allowed_actions":["offer.accept","offer.decline"]}),
                    Some(target.key()),
                    Some(o.key()),
                )?;
                o.data["status"] = json!("dispatched");
                changed(&mut o, &a.user.data, "offer", "Oferta enviada");
                notify(
                    plan,
                    target.key(),
                    "Nueva oferta",
                    o.data["code"].as_str().unwrap_or(""),
                    "vision",
                    "/radar",
                )?;
                plan.event(target.key(), "offer", &id);
                plan.result = offer.data.clone();
                plan.put(offer);
            }
            "progress" => {
                let action = choice(
                    p,
                    "action",
                    &[
                        "order.start_transit",
                        "order.arrive",
                        "order.request_review",
                    ],
                )?;
                require_action(&o.data, &a.user.data, &action)?;
                o.data["status"] = json!(match action.as_str() {
                    "order.start_transit" => "in_transit",
                    "order.arrive" => "in_progress",
                    _ => "pending_validation",
                });
                if let Some(g) = p.get("coordinates") {
                    coordinates(g)?;
                    o.data["telemetry"] = g.clone();
                }
                if action == "order.request_review" {
                    o.data["qa"] = json!("pending");
                    notify(
                        plan,
                        o.data["customer_id"].as_str().unwrap_or(""),
                        "Revisa el resultado",
                        o.data["code"].as_str().unwrap_or(""),
                        "main",
                        &format!("/orders/{}/review", o.key()),
                    )?;
                }
                changed(&mut o, &a.user.data, "progress", "Progreso confirmado");
                plan.result = o.data.clone();
            }
            "propose" => {
                require_action(&o.data, &a.user.data, "order.propose")?;
                let labor = amount(p, "labor_cents")?;
                let parts = amount(p, "parts_cents")?;
                let reason = text(p, "reason", 5, 5000)?;
                let increment = labor
                    .checked_add(parts)
                    .filter(|n| *n > 0 && *n <= 1_000_000_000_000)
                    .ok_or_else(|| Fault::invalid("invalid supplement"))?;
                let previous = amount(&o.data["quote"], "total_cents")?;
                let total = previous
                    .checked_add(increment)
                    .filter(|n| *n <= 1_000_000_000_000)
                    .ok_or_else(|| Fault::invalid("supplement exceeds limit"))?;
                let id = new_id();
                let mut q = o.data["quote"].clone();
                q["id"] = json!(id);
                q["revision"] = json!(1);
                q["order_id"] = o.data["id"].clone();
                q["expires_at"] = json!((Utc::now() + Duration::hours(1)).to_rfc3339());
                q["status"] = json!("pending");
                q["reason"] = json!(reason);
                q["scope"] = json!(reason);
                q["labor_cents"] = json!(labor);
                q["parts_cents"] = json!(parts);
                q["increment_cents"] = json!(increment);
                q["previous_total_cents"] = json!(previous);
                q["total_cents"] = json!(total);
                q["allowed_actions"] = json!([]);
                plan.put(Row::new(
                    "quote",
                    &id,
                    json!({"id":id,"quote":q,"booking":o.data["booking"],"consumed":false}),
                    Some(o.data["customer_id"].as_str().unwrap_or("")),
                    Some(o.key()),
                )?);
                o.data["proposal"] = q;
                o.data["status"] = json!("pending_quote_approval");
                changed(
                    &mut o,
                    &a.user.data,
                    "proposal",
                    "Propuesta adicional enviada",
                );
                notify(
                    plan,
                    o.data["customer_id"].as_str().unwrap_or(""),
                    "Autoriza trabajo adicional",
                    o.data["code"].as_str().unwrap_or(""),
                    "main",
                    &format!("/orders/{}/approvals/{id}", o.key()),
                )?;
                plan.result = o.data.clone();
            }
            "decideQuote" => {
                let decision = choice(p, "decision", &["approve", "reject"])?;
                require_action(
                    &o.data,
                    &a.user.data,
                    if decision == "approve" {
                        "quote.approve"
                    } else {
                        "quote.reject"
                    },
                )?;
                if p["quote_id"] != o.data["proposal"]["id"]
                    || p["quote_revision"] != o.data["proposal"]["revision"]
                    || (decision == "approve" && expired(&o.data["proposal"]["expires_at"]))
                {
                    return Err(Fault::new("conflict", "proposal changed or expired"));
                }
                let id = o.data["proposal"]["id"].as_str().unwrap_or("").to_owned();
                let mut q = self.store.require("quote", &id).await?;
                q.data["consumed"] = json!(true);
                o.data["proposal"]["status"] = json!(if decision == "approve" {
                    "approved"
                } else {
                    "rejected"
                });
                o.data["proposal"]["revision"] =
                    json!(o.data["proposal"]["revision"].as_u64().unwrap_or(0) + 1);
                q.data["quote"] = o.data["proposal"].clone();
                plan.put(q);
                if decision == "approve" {
                    o.data["quote"] = o.data["proposal"].clone();
                    let total = amount(&o.data["quote"], "total_cents")?;
                    let mut finance = self.finance_values(total)?;
                    finance["payout"] = o.data["finance"]["payout"].clone();
                    o.data["finance"] = finance;
                    self.payment_intent(
                        plan,
                        &o,
                        amount(&o.data["proposal"], "increment_cents")?,
                        "charge",
                    )?;
                }
                o.data["status"] = json!("in_progress");
                changed(
                    &mut o,
                    &a.user.data,
                    "quote_decision",
                    "Decisión de cotización confirmada",
                );
                plan.result = o.data.clone();
            }
            "review" => {
                require_action(&o.data, &a.user.data, "order.review")?;
                let rating = p["rating"]
                    .as_u64()
                    .filter(|n| (1..=5).contains(n))
                    .ok_or_else(|| Fault::invalid("rating must be between one and five"))?;
                o.data["rating"] = json!(rating);
                o.data["review_text"] = json!(text(p, "text", 0, 5000)?);
                o.data["customer_review"] = json!("accepted");
                changed(
                    &mut o,
                    &a.user.data,
                    "review",
                    "Cliente aceptó el resultado",
                );
                plan.result = o.data.clone();
            }
            "qa" => {
                let decision = choice(p, "decision", &["accept", "reject"])?;
                require_action(
                    &o.data,
                    &a.user.data,
                    if decision == "accept" {
                        "qa.accept"
                    } else {
                        "qa.reject"
                    },
                )?;
                o.data["qa"] = json!(if decision == "accept" {
                    "accepted"
                } else {
                    "rejected"
                });
                o.data["status"] = json!(if decision == "accept" {
                    "validated"
                } else {
                    "disputed"
                });
                if decision == "accept" {
                    self.release_collaborator(plan, &o).await?;
                } else {
                    let reason = text(p, "reason", 5, 5000)?;
                    let id = new_id();
                    plan.put(Row::new("service_case",&id,json!({"id":id,"revision":1,"order_id":o.key(),"customer_id":o.data["customer_id"],"category":"qa","description":reason,"status":"open","timeline":[{"id":new_id(),"kind":"case","actor":a.user.data["name"],"at":now(),"text":reason}]}),Some(o.data["customer_id"].as_str().unwrap_or("")),Some(o.key()))?);
                }
                changed(&mut o, &a.user.data, "qa", "Dictamen QA registrado");
                plan.result = o.data.clone();
            }
            "cancelOrder" => {
                let reason = text(p, "reason", 1, 2000)?;
                require_action(
                    &o.data,
                    &a.user.data,
                    if reason == "no_show" {
                        "order.report_no_show"
                    } else {
                        "order.cancel"
                    },
                )?;
                o.data["cancellation"] =
                    json!({"reason":reason,"fee_cents":cancel_fee(&o.data),"at":now()});
                o.data["status"] = json!("cancelled");
                self.release_collaborator(plan, &o).await?;
                if let Some(k) = o.data["slot_key"].as_str()
                    && let Some(mut s) = self.store.get("service_slot", k).await?
                {
                    s.data["reserved"] =
                        json!(s.data["reserved"].as_u64().unwrap_or(1).saturating_sub(1));
                    plan.put(s);
                }
                let attempts=self.store.list("payment_attempt","order_id=type::record($order) AND data.action='charge' AND data.status='confirmed'",json!({"order":o.id})).await?;
                let paid = attempts
                    .iter()
                    .map(|r| r.data["amount_cents"].as_u64().unwrap_or(0))
                    .sum::<u64>();
                for r in &attempts {
                    plan.guard(r);
                }
                let refundable =
                    paid.saturating_sub(o.data["cancellation"]["fee_cents"].as_u64().unwrap_or(0));
                if refundable > 0 {
                    self.payment_intent(plan, &o, refundable, "refund")?;
                }
                for mut offer in self
                    .store
                    .list(
                        "dispatch_offer",
                        "order_id=type::record($order) AND data.status='pending'",
                        json!({"order":o.id}),
                    )
                    .await?
                {
                    offer.data["status"] = json!("expired");
                    bump(&mut offer);
                    plan.event(
                        offer.data["collaborator_id"].as_str().unwrap_or(""),
                        "offer",
                        offer.key(),
                    );
                    plan.put(offer);
                }
                changed(
                    &mut o,
                    &a.user.data,
                    "cancelled",
                    "Cancelación confirmada; reembolso sujeto a confirmación del proveedor",
                );
                plan.result = o.data.clone();
            }
            "reconcileFinance" => {
                require_action(&o.data, &a.user.data, "finance.reconcile")?;
                let attempts = self
                    .store
                    .list(
                        "payment_attempt",
                        "order_id=type::record($order) AND data.action='charge'",
                        json!({"order":o.id}),
                    )
                    .await?;
                let mut confirmed = 0u64;
                for r in attempts {
                    plan.guard(&r);
                    if r.data["status"] == "confirmed" {
                        confirmed = confirmed
                            .checked_add(amount(&r.data, "amount_cents")?)
                            .ok_or_else(|| Fault::invalid("payment overflow"))?;
                    }
                }
                if confirmed != amount(&o.data["finance"], "total_cents")? {
                    return Err(Fault::new(
                        "conflict",
                        "payment is awaiting verified provider confirmation",
                    ));
                }
                let unresolved = self
                    .store
                    .list(
                        "service_case",
                        "order_id=type::record($order) AND data.status!='resolved'",
                        json!({"order":o.id}),
                    )
                    .await?;
                if !unresolved.is_empty() {
                    return Err(Fault::new(
                        "conflict",
                        "resolve the open service case first",
                    ));
                }
                o.data["finance"]["payment"] = json!("confirmed");
                o.data["finance"]["payout"] = json!("pending");
                o.data["status"] = json!("completed");
                let payout_id = new_id();
                let payout = json!({"id":payout_id,"order_id":o.key(),"code":o.data["code"],"status":"pending","gross_cents":o.data["finance"]["total_cents"],"fee_cents":o.data["finance"]["fee_cents"],"withholding_cents":o.data["finance"]["withholding_cents"],"net_cents":o.data["finance"]["net_cents"],"at":now(),"receipt":format!("payout:{payout_id}")});
                let collaborator = o.data["collaborator_id"]
                    .as_str()
                    .ok_or_else(|| Fault::new("conflict", "assignment missing"))?;
                plan.put(Row::new(
                    "payout",
                    &payout_id,
                    payout,
                    Some(collaborator),
                    Some(o.key()),
                )?);
                plan.put(job(&format!("payout_{payout_id}"),"payout",json!({"payout_id":payout_id,"order_id":o.key(),"collaborator_id":collaborator,"amount_cents":o.data["finance"]["net_cents"]}),Some(collaborator),Some(o.key()))?);
                for (account, field) in [
                    ("collaborator_payable", "net_cents"),
                    ("platform_commission", "fee_cents"),
                    ("tax_payable", "withholding_cents"),
                ] {
                    let amount = amount(&o.data["finance"], field)?;
                    if amount > 0 {
                        self.post_entry(
                            plan,
                            &o,
                            "customer_funds_payable",
                            account,
                            amount,
                            &format!("allocation:{payout_id}:{account}"),
                        )?;
                    }
                }
                let warranty_id = new_id();
                let start = Utc::now();
                plan.put(Row::new("warranty_certificate",&warranty_id,json!({"id":warranty_id,"order_id":o.key(),"code":format!("YSF-WAR-{}",&warranty_id[..12]),"customer_id":o.data["customer_id"],"starts_at":start.to_rfc3339(),"ends_at":(start+Duration::days(self.config.application.warranty_days)).to_rfc3339(),"status":"active","terms":self.config.application.warranty_terms,"document_id":""}),Some(o.data["customer_id"].as_str().unwrap_or("")),Some(o.key()))?);
                let mut user = self.store.require("user", collaborator).await?;
                user.data["jobs_completed"] =
                    json!(user.data["jobs_completed"].as_u64().unwrap_or(0) + 1);
                user.data["rating_count"] =
                    json!(user.data["rating_count"].as_u64().unwrap_or(0) + 1);
                user.data["rating_sum"] = json!(
                    user.data["rating_sum"].as_u64().unwrap_or(0)
                        + o.data["rating"].as_u64().unwrap_or(0)
                );
                bump(&mut user);
                plan.put(user);
                changed(
                    &mut o,
                    &a.user.data,
                    "completed",
                    "Servicio completado; pago confirmado y liquidación solicitada",
                );
                plan.result = o.data.clone();
            }
            _ => return Err(Fault::new("not_found", "unknown workflow command")),
        }
        self.emit_order(plan, &o).await?;
        plan.put(o);
        Ok(())
    }
    pub async fn release_collaborator(&self, plan: &mut Plan, o: &Row) -> Result<(), Fault> {
        if let Some(id) = o.data["collaborator_id"].as_str() {
            let mut r = self.store.require("user", id).await?;
            if r.data["busy_order_id"] == o.data["id"] {
                r.data["busy_order_id"] = Value::Null;
                bump(&mut r);
                plan.put(r);
            }
        }
        Ok(())
    }
    pub fn post_entry(
        &self,
        plan: &mut Plan,
        o: &Row,
        debit: &str,
        credit: &str,
        cents: u64,
        key: &str,
    ) -> Result<(), Fault> {
        let id = super::crypto::hash(key.as_bytes());
        plan.put(Row::new("escrow_entry",&id,json!({"id":id,"order_id":o.key(),"transaction_id":key,"amount_cents":cents,"debit":debit,"credit":credit,"currency":"MXN","at":now()}),Some(o.data["customer_id"].as_str().unwrap_or("")),Some(o.key()))?);
        Ok(())
    }
}
