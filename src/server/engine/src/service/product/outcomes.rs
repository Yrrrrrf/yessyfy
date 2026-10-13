use super::{
    Principal, Product,
    helpers::*,
    store::{Plan, Row},
};
use crate::shared::error::Fault;
use serde_json::{Value, json};
impl Product {
    pub async fn outcome_command(
        &self,
        op: &str,
        p: &Value,
        c: &Value,
        a: &Principal,
        plan: &mut Plan,
    ) -> Result<(), Fault> {
        match op {
            "sendMessage" => {
                let o = self
                    .store
                    .require("job_order", &text(p, "order_id", 1, 100)?)
                    .await?;
                authorize(&o.data, &a.user.data)?;
                plan.guard(&o);
                let text = text(p, "text", 1, 5000)?;
                let id = new_id();
                let m = Row::new(
                    "conversation_message",
                    &id,
                    json!({"id":id,"order_id":o.key(),"sender_id":a.id(),"sender_name":a.user.data["name"],"text":text,"at":now()}),
                    Some(a.id()),
                    Some(o.key()),
                )?;
                plan.result = m.data.clone();
                plan.put(m);
                let mut ids = vec![o.data["customer_id"].as_str().unwrap_or("").to_owned()];
                if let Some(id) = o.data["collaborator_id"].as_str() {
                    ids.push(id.into());
                }
                for u in self.store.list("user","data.status='active' AND ('operator' IN data.roles OR 'admin' IN data.roles)",json!({})).await?{ids.push(u.key().into());}
                ids.sort();
                ids.dedup();
                for id in ids {
                    plan.event(&id, "conversation", o.key());
                    if id != a.id() {
                        let surface = if id == o.data["customer_id"].as_str().unwrap_or("") {
                            "main"
                        } else {
                            "vision"
                        };
                        let href = if surface == "main" {
                            format!("/orders/{}?tab=chat", o.key())
                        } else {
                            format!("/jobs/{}?tab=chat", o.key())
                        };
                        notify(
                            plan,
                            &id,
                            "Nuevo mensaje",
                            o.data["code"].as_str().unwrap_or(""),
                            surface,
                            &href,
                        )?;
                    }
                }
            }
            "markRead" => {
                let ids = p["ids"]
                    .as_array()
                    .filter(|ids| ids.len() <= 100)
                    .ok_or_else(|| Fault::invalid("notice identities required"))?;
                let mut out = vec![];
                for id in ids {
                    let mut r = self
                        .store
                        .require(
                            "notice",
                            id.as_str()
                                .ok_or_else(|| Fault::invalid("invalid notice identity"))?,
                        )
                        .await?;
                    if r.owner.as_deref() != Some(a.user.id.as_str()) {
                        return Err(Fault::new("forbidden", "notice ownership required"));
                    }
                    r.data["read"] = json!(true);
                    bump(&mut r);
                    out.push(r.data.clone());
                    plan.event(a.id(), "inbox", r.key());
                    plan.put(r);
                }
                plan.result = json!(out);
            }
            "createCase" => {
                let mut o = self
                    .store
                    .require("job_order", &text(p, "order_id", 1, 100)?)
                    .await?;
                authorize(&o.data, &a.user.data)?;
                if o.data["customer_id"] != a.id() && !is_ops(&a.user.data) {
                    return Err(Fault::new("forbidden", "customer or operations required"));
                }
                if let Some(r) = c.get("expected_revision")
                    && r.as_u64() != Some(o.version)
                {
                    return Err(Fault::new("conflict", "order changed"));
                }
                let category = if p["claim"] == true {
                    "warranty".to_owned()
                } else {
                    choice(
                        p,
                        "category",
                        &[
                            "quality", "payment", "delay", "billing", "safety", "no_show", "other",
                        ],
                    )?
                };
                let description = text(p, "description", 10, 5000)?;
                let existing = self
                    .store
                    .list(
                        "service_case",
                        "order_id=type::record($order) AND data.status!='resolved'",
                        json!({"order":o.id}),
                    )
                    .await?;
                if !existing.is_empty() {
                    return Err(Fault::new("conflict", "an active case already exists"));
                }
                if category == "warranty" {
                    let mut w = self
                        .store
                        .list(
                            "warranty_certificate",
                            "order_id=type::record($order)",
                            json!({"order":o.id}),
                        )
                        .await?
                        .into_iter()
                        .next()
                        .ok_or_else(|| Fault::new("conflict", "warranty unavailable"))?;
                    if w.data["status"] != "active" || expired(&w.data["ends_at"]) {
                        return Err(Fault::new("conflict", "warranty is not active"));
                    }
                    w.data["status"] = json!("claimed");
                    plan.put(w);
                    plan.guard(&o);
                } else {
                    if o.data["status"] == "cancelled" {
                        return Err(Fault::new(
                            "conflict",
                            "cancelled order cannot open a work case",
                        ));
                    }
                    o.data["case_previous_status"] = o.data["status"].clone();
                    o.data["status"] = json!("disputed");
                    changed(&mut o, &a.user.data, "case", "Incidencia registrada");
                    self.emit_order(plan, &o).await?;
                    plan.put(o.clone());
                }
                let id = new_id();
                let row = Row::new(
                    "service_case",
                    &id,
                    json!({"id":id,"revision":1,"order_id":o.key(),"customer_id":o.data["customer_id"],"category":category,"description":description,"status":"open","timeline":[{"id":new_id(),"kind":"case","actor":a.user.data["name"],"at":now(),"text":"Caso registrado"}]}),
                    Some(o.data["customer_id"].as_str().unwrap_or("")),
                    Some(o.key()),
                )?;
                for operator in self.store.list("user","data.status='active' AND ('operator' IN data.roles OR 'admin' IN data.roles)",json!({})).await?{notify(plan,operator.key(),"Caso requiere atención",o.data["code"].as_str().unwrap_or(""),"vision",&format!("/ops/cases/{id}"))?;}
                plan.result = row.data.clone();
                plan.put(row);
            }
            "resolveCase" => {
                require_ops(&a.user.data)?;
                let mut r = self
                    .store
                    .require("service_case", &text(p, "id", 1, 100)?)
                    .await?;
                revision(&r, c)?;
                if r.data["status"] == "resolved" {
                    return Err(Fault::new("conflict", "case already resolved"));
                }
                let resolved = p["resolved"]
                    .as_bool()
                    .ok_or_else(|| Fault::invalid("resolution flag required"))?;
                let resolution = text(p, "resolution", if resolved { 10 } else { 0 }, 5000)?;
                r.data["status"] = json!(if resolved { "resolved" } else { "reviewing" });
                r.data["resolution"] = json!(resolution);
                changed(&mut r, &a.user.data, "resolution", &resolution);
                let mut o = self
                    .store
                    .require("job_order", r.data["order_id"].as_str().unwrap_or(""))
                    .await?;
                plan.guard(&o);
                if resolved && o.data["status"] == "disputed" && r.data["category"] != "warranty" {
                    let previous = o.data["case_previous_status"].as_str().unwrap_or("");
                    if previous == "completed" {
                        o.data["status"] = json!("completed");
                    } else if o.data["collaborator_id"].is_string() {
                        let mut user = self
                            .store
                            .require("user", o.data["collaborator_id"].as_str().unwrap_or(""))
                            .await?;
                        if !user.data["busy_order_id"].is_null()
                            && user.data["busy_order_id"] != o.data["id"]
                        {
                            return Err(Fault::new(
                                "conflict",
                                "collaborator already has another active job",
                            ));
                        }
                        user.data["busy_order_id"] = o.data["id"].clone();
                        bump(&mut user);
                        plan.put(user);
                        o.data["status"] = json!("in_progress");
                        o.data["qa"] = json!("not_ready");
                        o.data["customer_review"] = json!("pending");
                    } else {
                        o.data["status"] = json!("pending_triage");
                    }
                    changed(
                        &mut o,
                        &a.user.data,
                        "case_resolution",
                        "Resolución registrada; trabajo reabierto cuando corresponde",
                    );
                    plan.put(o.clone());
                }
                if resolved
                    && r.data["category"] == "warranty"
                    && let Some(mut w) = self
                        .store
                        .list(
                            "warranty_certificate",
                            "order_id=type::record($order)",
                            json!({"order":o.id}),
                        )
                        .await?
                        .into_iter()
                        .next()
                {
                    w.data["status"] = json!(if expired(&w.data["ends_at"]) {
                        "expired"
                    } else {
                        "active"
                    });
                    plan.put(w);
                }
                self.emit_order(plan, &o).await?;
                notify(
                    plan,
                    r.data["customer_id"].as_str().unwrap_or(""),
                    "Caso actualizado",
                    &resolution,
                    "main",
                    "/help",
                )?;
                plan.result = r.data.clone();
                plan.put(r);
            }
            "requestDocument" => {
                let o = self
                    .store
                    .require("job_order", &text(p, "order_id", 1, 100)?)
                    .await?;
                authorize(&o.data, &a.user.data)?;
                plan.guard(&o);
                let kind = choice(p, "kind", &["report", "warranty", "invoice"])?;
                let warranty = if kind == "warranty" {
                    Some(
                        self.store
                            .list(
                                "warranty_certificate",
                                "order_id=type::record($order)",
                                json!({"order":o.id}),
                            )
                            .await?
                            .into_iter()
                            .next()
                            .ok_or_else(|| {
                                Fault::new("conflict", "warranty has not been issued")
                            })?,
                    )
                } else {
                    None
                };
                if kind == "invoice" && o.data["finance"]["payment"] != "confirmed" {
                    return Err(Fault::new(
                        "conflict",
                        "confirmed payment required for invoice",
                    ));
                }
                let cfdi_type = if o.data["collaborator_id"] == a.id() {
                    "retencion_plataforma"
                } else {
                    "ingreso_comision"
                };
                let recipient = if cfdi_type == "retencion_plataforma" {
                    o.data["collaborator_id"].as_str().unwrap_or("")
                } else {
                    o.data["customer_id"].as_str().unwrap_or("")
                };
                let id = if kind == "invoice" {
                    super::crypto::hash(format!("invoice:{}:{cfdi_type}", o.key()).as_bytes())
                } else {
                    new_id()
                };
                if kind == "invoice"
                    && let Some(existing) = self.store.get("document_request", &id).await?
                {
                    self.authorize_document(&existing.data, a)?;
                    let mut existing = existing;
                    if existing.data["status"] == "failed" {
                        let mut task = self
                            .store
                            .require("business_job", &format!("document_{}", existing.key()))
                            .await?;
                        if task.data["status"] == "failed" {
                            task.data["status"] = json!("queued");
                            task.data["attempts"] = json!(0);
                            task.data["next_at"] = json!(now());
                            task.data["lease_token"] = Value::Null;
                            task.data["lease_until"] = Value::Null;
                            existing.data["status"] = json!("processing");
                            existing.data.as_object_mut().unwrap().remove("error");
                            plan.put(task);
                            plan.put(existing.clone());
                        }
                    }
                    plan.guard(&existing);
                    plan.result = existing.data.clone();
                    return Ok(());
                }
                let mut data = self
                    .document_data(&o, kind.as_str(), warranty.as_ref(), cfdi_type, recipient)
                    .await?;
                data["locale"] = a.user.data["locale"].clone();
                let r = Row::new(
                    "document_request",
                    &id,
                    json!({"id":id,"order_id":o.key(),"kind":kind,"recipient_id":if kind=="invoice"{json!(recipient)}else{Value::Null},"cfdi_type":if kind=="invoice"{json!(cfdi_type)}else{Value::Null},"status":"processing","filename":format!("yessyfy-{kind}-{}.pdf",o.data["code"].as_str().unwrap_or("service")),"mime":"application/pdf","receipt":format!("document:{id}"),"source_revision":o.version,"at":now(),"snapshot":data}),
                    Some(a.id()),
                    Some(o.key()),
                )?;
                plan.put(job(
                    &format!("document_{id}"),
                    "document",
                    json!({"document_id":id}),
                    Some(a.id()),
                    Some(o.key()),
                )?);
                if let Some(mut w) = warranty {
                    w.data["document_id"] = json!(id);
                    plan.put(w);
                }
                plan.result = r.data.clone();
                plan.put(r);
                plan.event(
                    o.data["customer_id"].as_str().unwrap_or(""),
                    "order",
                    o.key(),
                );
            }
            _ => return Err(Fault::new("not_found", "unknown outcome command")),
        }
        Ok(())
    }
    pub fn authorize_document(&self, v: &Value, a: &Principal) -> Result<(), Fault> {
        if v["kind"] == "invoice" && v["recipient_id"] != a.id() && !is_ops(&a.user.data) {
            return Err(Fault::new(
                "forbidden",
                "fiscal document is private to its recipient",
            ));
        }
        Ok(())
    }
    pub fn document_projection(&self, v: &mut Value, a: &Principal) -> Result<(), Fault> {
        self.authorize_document(v, a)?;
        if let Some(o) = v.as_object_mut() {
            o.remove("snapshot");
            o.remove("recipient_id");
            o.remove("cfdi_type");
            o.remove("source_revision");
            o.remove("sha256");
            o.remove("size");
            o.remove("at");
            o.remove("bundle_hash");
            if o.get("error").is_some_and(|v| v.is_null()) {
                o.remove("error");
            }
        }
        if v["status"] == "ready" {
            v["url"] = json!(self.document_url(v["id"].as_str().unwrap_or(""), a)?);
        }
        Ok(())
    }
}
