use super::{
    Product,
    crypto::hash,
    helpers::*,
    store::{Plan, Row},
};
use crate::shared::error::Fault;
use base64::{Engine, engine::general_purpose::STANDARD};
use chrono::{Duration, Utc};
use serde_json::{Value, json};
use std::sync::Arc;
impl Product {
    pub async fn run_jobs(self: Arc<Self>) -> Result<(), String> {
        loop {
            if self.stop.is_cancelled() {
                return Ok(());
            }
            let rows=self.store.list("business_job","(data.status='queued' AND data.next_at<=$now) OR (data.status='running' AND data.lease_until<=$now)",json!({"now":now()})).await;
            match rows {
                Ok(rows) => {
                    for mut r in rows.into_iter().take(16) {
                        if self.stop.is_cancelled() {
                            return Ok(());
                        }
                        if r.data["attempts"].as_u64().unwrap_or(0) >= 5 {
                            continue;
                        }
                        let lease = new_id();
                        r.data["status"] = json!("running");
                        r.data["attempts"] = json!(r.data["attempts"].as_u64().unwrap_or(0) + 1);
                        r.data["lease_token"] = json!(lease);
                        r.data["lease_until"] =
                            json!((Utc::now() + Duration::seconds(30)).to_rfc3339());
                        let mut p = Plan::default();
                        p.put(r.clone());
                        if self.store.commit(p, None).await.is_err() {
                            continue;
                        }
                        let outcome = self.perform_job(&r).await;
                        self.finish_job(r.key(), &lease, outcome)
                            .await
                            .unwrap_or_else(|e| {
                                tracing::error!(job = r.key(), code = e.code, "job finish failed")
                            });
                    }
                }
                Err(e) => tracing::warn!(code = e.code, "business worker waiting for database"),
            }
            tokio::select! {_=self.stop.cancelled()=>return Ok(()),_=tokio::time::sleep(std::time::Duration::from_millis(200))=>{}}
        }
    }
    async fn perform_job(&self, r: &Row) -> Result<Value, Fault> {
        let payload = &r.data["payload"];
        match r.data["kind"].as_str().unwrap_or("") {
            "otp" => {
                let challenge = self
                    .store
                    .require(
                        "otp_challenge",
                        payload["challenge_id"].as_str().unwrap_or(""),
                    )
                    .await?;
                if challenge.data["used"] == true || expired(&challenge.data["expires_at"]) {
                    return Ok(json!({"skipped":"challenge closed"}));
                }
                let code = self
                    .secrets
                    .open(payload["sealed"].as_str().unwrap_or(""))?;
                let body = json!({"challenge_id":payload["challenge_id"],"phone":payload["phone"],"code":code,"expires_at":challenge.data["expires_at"]});
                if self.config.application.otp_provider == "file" {
                    let dir = self.root.join("otp-spool");
                    tokio::fs::create_dir_all(&dir)
                        .await
                        .map_err(Fault::internal)?;
                    let path = dir.join(format!(
                        "{}.json",
                        payload["challenge_id"].as_str().unwrap_or("")
                    ));
                    tokio::fs::write(path, serde_json::to_vec(&body).map_err(Fault::internal)?)
                        .await
                        .map_err(Fault::internal)?;
                    return Ok(json!({"provider":"file","receipt":format!("spool:{}",r.key())}));
                }
                self.provider_request(&self.config.application.otp_webhook, r.key(), body)
                    .await
            }
            "payment" | "payout" => {
                if self.config.application.finance_provider != "webhook" {
                    return Err(Fault::new("busy", "finance provider is not configured"));
                }
                let mut body = payload.clone();
                body["kind"] = r.data["kind"].clone();
                body["currency"] = json!("MXN");
                self.provider_request(&self.config.application.finance_webhook, r.key(), body)
                    .await
            }
            "document" => {
                let doc = self
                    .store
                    .require(
                        "document_request",
                        payload["document_id"].as_str().unwrap_or(""),
                    )
                    .await?;
                if doc.data["status"] == "ready" {
                    return Ok(json!({"document_id":doc.key()}));
                }
                let user = self
                    .store
                    .require(
                        "user",
                        doc.owner
                            .as_deref()
                            .unwrap_or("")
                            .strip_prefix("user:")
                            .unwrap_or(""),
                    )
                    .await?;
                let o = self
                    .store
                    .require("job_order", doc.data["order_id"].as_str().unwrap_or(""))
                    .await?;
                if user.data["status"] != "active" {
                    return Err(Fault::new("forbidden", "requester unavailable"));
                }
                authorize(&o.data, &user.data)?;
                let (bytes, xml) = self.compile_document(&doc).await?;
                let dir = self.root.join("documents");
                tokio::fs::create_dir_all(&dir)
                    .await
                    .map_err(Fault::internal)?;
                self.persist_file(&dir.join(format!("{}.pdf", doc.key())), &bytes)
                    .await?;
                if let Some(xml) = xml {
                    self.persist_file(&dir.join(format!("{}.xml", doc.key())), &xml)
                        .await?;
                }
                let mut p = Plan::default();
                let mut live = self.store.require("document_request", doc.key()).await?;
                live.data["status"] = json!("ready");
                live.data["sha256"] = json!(hash(&bytes));
                live.data["size"] = json!(bytes.len());
                live.data["bundle_hash"] = json!(self.renderer.bundle_hash);
                live.data["error"] = Value::Null;
                p.put(live);
                self.emit_order(&mut p, &o).await?;
                self.store.commit(p, None).await?;
                Ok(json!({"document_id":doc.key(),"sha256":hash(&bytes),"size":bytes.len()}))
            }
            _ => Err(Fault::invalid("unknown durable job kind")),
        }
    }
    async fn finish_job(
        &self,
        id: &str,
        lease: &str,
        result: Result<Value, Fault>,
    ) -> Result<(), Fault> {
        let mut r = self.store.require("business_job", id).await?;
        if r.data["lease_token"] != lease {
            return Err(Fault::new("conflict", "job lease changed"));
        }
        let mut p = Plan::default();
        match result {
            Ok(v) => {
                r.data["status"] = json!("succeeded");
                r.data["result"] = v;
                r.data["error"] = Value::Null;
            }
            Err(e) => {
                let attempts = r.data["attempts"].as_u64().unwrap_or(5);
                r.data["error"] = json!({"kind":e.code,"message":e.message});
                r.data["status"] = json!(if attempts >= 5
                    || ["invalid", "forbidden", "not_found"].contains(&e.code)
                {
                    "failed"
                } else {
                    "queued"
                });
                r.data["next_at"] =
                    json!((Utc::now() + Duration::seconds(1_i64 << attempts.min(5))).to_rfc3339());
                if r.data["status"] == "failed" && r.data["kind"] == "document" {
                    let mut d = self
                        .store
                        .require(
                            "document_request",
                            r.data["payload"]["document_id"].as_str().unwrap_or(""),
                        )
                        .await?;
                    d.data["status"] = json!("failed");
                    d.data["error"] = json!(e.message);
                    if let Some(order) = d.data["order_id"].as_str() {
                        let o = self.store.require("job_order", order).await?;
                        self.emit_order(&mut p, &o).await?;
                    }
                    p.put(d);
                }
            }
        }
        r.data["lease_until"] = Value::Null;
        r.data["lease_token"] = Value::Null;
        p.put(r);
        self.store.commit(p, None).await?;
        Ok(())
    }
    async fn persist_file(&self, path: &std::path::Path, bytes: &[u8]) -> Result<(), Fault> {
        use tokio::io::AsyncWriteExt;
        let tmp = path.with_extension(format!("{}.part", new_id()));
        let mut f = tokio::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&tmp)
            .await
            .map_err(Fault::internal)?;
        f.write_all(bytes).await.map_err(Fault::internal)?;
        f.sync_all().await.map_err(Fault::internal)?;
        drop(f);
        match tokio::fs::hard_link(&tmp, path).await {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let old = tokio::fs::read(path).await.map_err(Fault::internal)?;
                if hash(&old) != hash(bytes) {
                    let _ = tokio::fs::remove_file(&tmp).await;
                    return Err(Fault::new("conflict", "artifact replay changed bytes"));
                }
            }
            Err(e) => return Err(Fault::internal(e)),
        }
        tokio::fs::remove_file(tmp).await.map_err(Fault::internal)?;
        Ok(())
    }
    async fn provider_request(&self, url: &str, key: &str, body: Value) -> Result<Value, Fault> {
        let bytes = serde_json::to_vec(&body).map_err(Fault::internal)?;
        let at = Utc::now().timestamp().to_string();
        let mut signed = format!("{at}.").into_bytes();
        signed.extend_from_slice(&bytes);
        let r = self
            .client
            .post(url)
            .header("content-type", "application/json")
            .header("x-yessyfy-idempotency-key", key)
            .header("x-yessyfy-timestamp", &at)
            .header("x-yessyfy-signature", self.secrets.sign_provider(&signed))
            .body(bytes)
            .send()
            .await
            .map_err(|_| Fault::new("busy", "provider unavailable"))?;
        if !r.status().is_success() {
            return Err(Fault::new("busy", "provider rejected request"));
        }
        let response: Value = r
            .json()
            .await
            .map_err(|_| Fault::new("busy", "invalid provider acknowledgement"))?;
        text(&response, "receipt", 1, 500)?;
        if response["status"] != "accepted" {
            return Err(Fault::new("busy", "provider did not accept request"));
        }
        Ok(response)
    }
    pub async fn provider_event(
        &self,
        bytes: &[u8],
        at: &str,
        signature: &str,
    ) -> Result<Value, Fault> {
        let time = at
            .parse::<i64>()
            .map_err(|_| Fault::new("forbidden", "invalid provider timestamp"))?;
        if (Utc::now().timestamp() - time).abs() > 300 {
            return Err(Fault::new("forbidden", "provider signature expired"));
        }
        let mut signed = format!("{at}.").into_bytes();
        signed.extend_from_slice(bytes);
        self.secrets.verify_provider(&signed, signature)?;
        let event: Value =
            serde_json::from_slice(bytes).map_err(|_| Fault::invalid("invalid provider event"))?;
        let id = text(&event, "event_id", 1, 200)?;
        let event_key = hash(id.as_bytes());
        let body_hash = hash(bytes);
        if let Some(r) = self.store.get("provider_event", &event_key).await? {
            if r.data["hash"] != body_hash {
                return Err(Fault::new("conflict", "provider event body changed"));
            }
            return Ok(json!({"confirmed":true}));
        }
        let kind = choice(&event, "kind", &["payment", "payout"])?;
        let resource = text(&event, "resource_id", 1, 100)?;
        let status = choice(&event, "status", &["confirmed", "failed"])?;
        let receipt = text(&event, "receipt", 1, 500)?;
        if event["currency"] != "MXN" {
            return Err(Fault::invalid("provider currency mismatch"));
        }
        let cents = amount(&event, "amount_cents")?;
        let mut r = self
            .store
            .require(
                if kind == "payment" {
                    "payment_attempt"
                } else {
                    "payout"
                },
                &resource,
            )
            .await?;
        if cents != amount_expected(&r, &kind) {
            return Err(Fault::invalid("provider amount mismatch"));
        }
        let mut o = self
            .store
            .require("job_order", r.data["order_id"].as_str().unwrap_or(""))
            .await?;
        let mut p = Plan::default();
        p.guard(&o);
        if r.data["status"] == "confirmed" {
            if status != "confirmed" || r.data["provider_receipt"] != receipt {
                return Err(Fault::new("conflict", "provider outcome already confirmed"));
            }
        } else {
            if r.data["status"] == "failed" && status == "failed" {
                p.guard(&r);
            } else {
                r.data["status"] = json!(status);
                r.data["provider_receipt"] = json!(receipt);
                if kind == "payout" {
                    r.data["receipt"] = json!(receipt);
                }
                p.put(r.clone());
                if kind == "payment" {
                    let action = r.data["action"].as_str().unwrap_or("");
                    if status == "confirmed" && cents > 0 {
                        self.post_entry(
                            &mut p,
                            &o,
                            if action == "refund" {
                                "customer_funds_payable"
                            } else {
                                "provider_clearing"
                            },
                            if action == "refund" {
                                "provider_clearing"
                            } else {
                                "customer_funds_payable"
                            },
                            cents,
                            &format!("provider:{event_key}"),
                        )?;
                    }
                    if action == "charge" {
                        let rows = self
                            .store
                            .list(
                                "payment_attempt",
                                "order_id=type::record($order) AND data.action='charge'",
                                json!({"order":o.id}),
                            )
                            .await?;
                        let confirmed = rows
                            .iter()
                            .map(|other| {
                                if other.key() == r.key() {
                                    if status == "confirmed" { cents } else { 0 }
                                } else if other.data["status"] == "confirmed" {
                                    other.data["amount_cents"].as_u64().unwrap_or(0)
                                } else {
                                    0
                                }
                            })
                            .sum::<u64>();
                        o.data["finance"]["payment"] =
                            json!(if confirmed == amount(&o.data["finance"], "total_cents")? {
                                "confirmed"
                            } else if status == "failed" {
                                "failed"
                            } else {
                                "pending"
                            });
                        if o.data["status"] == "cancelled" && status == "confirmed" {
                            let refunds = self
                                .store
                                .list(
                                    "payment_attempt",
                                    "order_id=type::record($order) AND data.action='refund'",
                                    json!({"order":o.id}),
                                )
                                .await?;
                            let requested = refunds
                                .iter()
                                .map(|r| r.data["amount_cents"].as_u64().unwrap_or(0))
                                .sum::<u64>();
                            let desired = confirmed.saturating_sub(
                                o.data["cancellation"]["fee_cents"].as_u64().unwrap_or(0),
                            );
                            if desired > requested {
                                self.payment_intent(&mut p, &o, desired - requested, "refund")?;
                            }
                        }
                    }
                } else {
                    o.data["finance"]["payout"] = json!(status);
                    if status == "confirmed" && cents > 0 {
                        self.post_entry(
                            &mut p,
                            &o,
                            "collaborator_payable",
                            "provider_clearing",
                            cents,
                            &format!("provider:{event_key}"),
                        )?;
                    }
                }
                changed(
                    &mut o,
                    &json!({"name":"Proveedor verificado"}),
                    "finance",
                    &format!("{kind}: {status}"),
                );
                self.emit_order(&mut p, &o).await?;
                p.put(o);
            }
        }
        p.put(Row::new("provider_event",&event_key,json!({"id":event_key,"provider_id":id,"hash":body_hash,"kind":kind,"resource_id":resource,"receipt":receipt,"at":now()}),None,None)?);
        p.result = json!({"confirmed":true});
        self.store.commit(p, None).await
    }
    pub async fn request_fiscal_stamp(
        &self,
        doc: &Row,
        data: &Value,
    ) -> Result<(Value, Vec<u8>), Fault> {
        if let Some(r) = self.store.get("tax_invoice", doc.key()).await? {
            let bytes = tokio::fs::read(
                self.root
                    .join("documents")
                    .join(format!("{}.xml", doc.key())),
            )
            .await
            .map_err(Fault::internal)?;
            if hash(&bytes) != r.data["sha256"].as_str().unwrap_or("") {
                return Err(Fault::new("conflict", "fiscal XML hash mismatch"));
            }
            return Ok((r.data, bytes));
        }
        if self.config.application.fiscal_provider != "webhook" {
            return Err(Fault::new("busy", "fiscal provider is not configured"));
        }
        let snapshot = &doc.data["snapshot"];
        let total = snapshot["total"]["amount"]
            .as_str()
            .ok_or_else(|| Fault::invalid("invoice amount missing"))?;
        let body = json!({"document_id":doc.key(),"order_id":doc.data["order_id"],"currency":"MXN","cfdi_type":data["cfdi_type"],"total":total,"recipient":data["fiscal"],"description":data["description"]});
        let bytes = serde_json::to_vec(&body).map_err(Fault::internal)?;
        let at = Utc::now().timestamp().to_string();
        let mut signed = format!("{at}.").into_bytes();
        signed.extend_from_slice(&bytes);
        let response = self
            .client
            .post(&self.config.application.fiscal_webhook)
            .header("content-type", "application/json")
            .header("x-yessyfy-idempotency-key", doc.key())
            .header("x-yessyfy-timestamp", &at)
            .header("x-yessyfy-signature", self.secrets.sign_provider(&signed))
            .body(bytes)
            .send()
            .await
            .map_err(|_| Fault::new("busy", "fiscal provider unavailable"))?;
        if !response.status().is_success() {
            return Err(Fault::new("busy", "fiscal provider rejected request"));
        }
        let signature = response
            .headers()
            .get("x-yessyfy-signature")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("")
            .to_owned();
        let at = response
            .headers()
            .get("x-yessyfy-timestamp")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("")
            .to_owned();
        if at
            .parse::<i64>()
            .ok()
            .is_none_or(|at| (Utc::now().timestamp() - at).abs() > 300)
        {
            return Err(Fault::new("forbidden", "fiscal response signature expired"));
        }
        let bytes = response.bytes().await.map_err(Fault::internal)?;
        if bytes.len() > 25_000_000 {
            return Err(Fault::invalid("fiscal response too large"));
        }
        let mut signed = format!("{at}.").into_bytes();
        signed.extend_from_slice(&bytes);
        self.secrets.verify_provider(&signed, &signature)?;
        let stamp: Value = serde_json::from_slice(&bytes).map_err(Fault::internal)?;
        if stamp["cfdi_type"] != data["cfdi_type"]
            || stamp["status"] != "stamped"
            || stamp["document_id"] != doc.key()
            || stamp["currency"] != "MXN"
            || stamp["total"] != total
            || stamp["recipient_rfc"] != data["fiscal"]["rfc"]
        {
            return Err(Fault::invalid(
                "fiscal confirmation does not match the request",
            ));
        }
        uuid::Uuid::parse_str(&text(&stamp, "uuid", 36, 36)?)
            .map_err(|_| Fault::invalid("invalid fiscal UUID"))?;
        text(&stamp, "issuer_rfc", 12, 13)?;
        chrono::DateTime::parse_from_rfc3339(&text(&stamp, "stamped_at", 20, 40)?)
            .map_err(|_| Fault::invalid("invalid fiscal stamp time"))?;
        let xml = STANDARD
            .decode(text(&stamp, "xml_base64", 1, 25_000_000)?)
            .map_err(|_| Fault::invalid("invalid fiscal XML"))?;
        if xml.is_empty()
            || xml.len() > 20_000_000
            || hash(&xml) != stamp["sha256"].as_str().unwrap_or("")
        {
            return Err(Fault::invalid("fiscal XML digest mismatch"));
        }
        let dir = self.root.join("documents");
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(Fault::internal)?;
        self.persist_file(&dir.join(format!("{}.xml", doc.key())), &xml)
            .await?;
        let mut value = stamp;
        value.as_object_mut().unwrap().remove("xml_base64");
        value["order_id"] = doc.data["order_id"].clone();
        let mut plan = Plan::default();
        plan.put(Row::new(
            "tax_invoice",
            doc.key(),
            value.clone(),
            doc.owner.as_deref().and_then(|s| s.strip_prefix("user:")),
            doc.data["order_id"].as_str(),
        )?);
        self.store.commit(plan, None).await?;
        Ok((value, xml))
    }
}
fn amount_expected(r: &Row, kind: &str) -> u64 {
    r.data[if kind == "payment" {
        "amount_cents"
    } else {
        "net_cents"
    }]
    .as_u64()
    .unwrap_or(0)
}
