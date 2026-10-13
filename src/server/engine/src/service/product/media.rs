use super::{
    Principal, Product,
    crypto::hash,
    helpers::*,
    store::{Plan, Row},
};
use crate::shared::error::Fault;
use chrono::{Duration, Utc};
use serde_json::{Value, json};
impl Product {
    pub fn upload_ticket(&self, r: &Row) -> Result<Value, Fault> {
        let expires = r.data["expires_at"]
            .as_i64()
            .ok_or_else(|| Fault::internal("invalid upload expiry"))?;
        let generation = r.data["generation"].as_u64().unwrap_or(1);
        let id = r.key();
        let signature = self
            .secrets
            .sign(&format!("put:{id}:{expires}:{generation}"));
        Ok(
            json!({"id":id,"url":format!("{}/client/uploads/{id}?expires={expires}&generation={generation}&sig={signature}",self.config.application.public_origin.trim_end_matches('/')),"expires_at":chrono::DateTime::from_timestamp(expires,0).ok_or_else(||Fault::internal("invalid expiry"))?.to_rfc3339(),"method":"PUT","headers":{"Content-Type":r.data["type"]}}),
        )
    }
    pub fn read_url(&self, id: &str, a: &Principal) -> Result<String, Fault> {
        super::store::rid("media_asset", id)?;
        let expires = (Utc::now() + Duration::minutes(5)).timestamp();
        let session = a.session.key();
        let sig = self.secrets.sign(&format!("get:{id}:{expires}:{session}"));
        Ok(format!(
            "{}/client/assets/{id}?expires={expires}&session={session}&sig={sig}",
            self.config.application.public_origin.trim_end_matches('/')
        ))
    }
    pub fn document_url(&self, id: &str, a: &Principal) -> Result<String, Fault> {
        super::store::rid("document_request", id)?;
        let expires = (Utc::now() + Duration::minutes(5)).timestamp();
        let session = a.session.key();
        let sig = self
            .secrets
            .sign(&format!("document:{id}:{expires}:{session}"));
        Ok(format!(
            "{}/client/documents/{id}?expires={expires}&session={session}&sig={sig}",
            self.config.application.public_origin.trim_end_matches('/')
        ))
    }
    pub async fn authorize_asset(&self, r: &Row, a: &Principal) -> Result<(), Fault> {
        if r.data["purpose"] == "verification" {
            if r.owner.as_deref() != Some(a.user.id.as_str()) && !is_ops(&a.user.data) {
                return Err(Fault::new("forbidden", "private verification unavailable"));
            }
        } else {
            let o = self
                .store
                .require("job_order", r.data["order_id"].as_str().unwrap_or(""))
                .await?;
            authorize(&o.data, &a.user.data)?;
        }
        Ok(())
    }
    pub async fn signed_principal(
        &self,
        kind: &str,
        id: &str,
        expires: i64,
        session: &str,
        sig: &str,
    ) -> Result<Principal, Fault> {
        if expires <= Utc::now().timestamp() || expires > Utc::now().timestamp() + 301 {
            return Err(Fault::new("forbidden", "private access expired"));
        }
        self.secrets
            .verify(&format!("{kind}:{id}:{expires}:{session}"), sig)?;
        let session = self.store.require("session", session).await?;
        if session.data["revoked"] == true || expired(&session.data["expires_at"]) {
            return Err(Fault::new("unauthorized", "session revoked"));
        }
        let user = self
            .store
            .require("user", session.data["user_id"].as_str().unwrap_or(""))
            .await?;
        if user.data["status"] != "active" {
            return Err(Fault::new("unauthorized", "account unavailable"));
        }
        Ok(Principal { user, session })
    }
    pub async fn media_command(
        &self,
        op: &str,
        p: &Value,
        c: &Value,
        a: &Principal,
        plan: &mut Plan,
    ) -> Result<(), Fault> {
        match op {
            "beginUpload" => {
                let purpose = if p["purpose"] == "verification" {
                    "verification"
                } else {
                    "evidence"
                };
                let mut order_id = None;
                let document_kind;
                if purpose == "verification" {
                    if !roles(&a.user.data, "collaborator") {
                        return Err(Fault::new("forbidden", "collaborator required"));
                    }
                    document_kind = Some(choice(
                        p,
                        "document_kind",
                        &["identity", "address", "credential"],
                    )?);
                } else {
                    let o = self
                        .store
                        .require("job_order", &text(p, "order_id", 1, 100)?)
                        .await?;
                    authorize(&o.data, &a.user.data)?;
                    if o.data["collaborator_id"] != a.id() && !is_ops(&a.user.data) {
                        return Err(Fault::new("forbidden", "assigned collaborator required"));
                    }
                    if !matches!(
                        o.data["status"].as_str(),
                        Some("accepted" | "in_transit" | "in_progress" | "pending_quote_approval")
                    ) {
                        return Err(Fault::new("conflict", "order no longer accepts evidence"));
                    }
                    plan.guard(&o);
                    order_id = Some(o.key().to_owned());
                    document_kind = None;
                }
                let mime = choice(p, "type", &["image/png", "image/jpeg", "image/webp"])?;
                let size = p["size"]
                    .as_u64()
                    .filter(|n| *n > 0 && *n <= self.config.application.max_upload_bytes as u64)
                    .ok_or_else(|| Fault::invalid("invalid upload size"))?;
                let name = text(p, "name", 1, 250)?;
                let id = new_id();
                let row = Row::new(
                    "media_asset",
                    &id,
                    json!({"id":id,"order_id":order_id,"purpose":purpose,"document_kind":document_kind,"type":mime,"size":size,"name":name,"state":"ticket","session_id":a.session.key(),"expires_at":(Utc::now()+Duration::minutes(15)).timestamp(),"generation":1}),
                    Some(a.id()),
                    order_id.as_deref(),
                )?;
                plan.result = self.upload_ticket(&row)?;
                plan.put(row);
            }
            "renewUpload" => {
                let mut r = self
                    .store
                    .require("media_asset", &text(p, "upload_id", 1, 100)?)
                    .await?;
                if r.owner.as_deref() != Some(a.user.id.as_str()) {
                    return Err(Fault::new("forbidden", "upload ownership required"));
                }
                self.authorize_asset(&r, a).await?;
                r.data["expires_at"] = json!((Utc::now() + Duration::minutes(15)).timestamp());
                r.data["session_id"] = json!(a.session.key());
                r.data["generation"] = json!(r.data["generation"].as_u64().unwrap_or(1) + 1);
                plan.result = self.upload_ticket(&r)?;
                plan.put(r);
            }
            "completeUpload" => {
                let mut r = self
                    .store
                    .require("media_asset", &text(p, "upload_id", 1, 100)?)
                    .await?;
                if r.owner.as_deref() != Some(a.user.id.as_str()) {
                    return Err(Fault::new("forbidden", "upload ownership required"));
                }
                self.authorize_asset(&r, a).await?;
                if !matches!(
                    r.data["state"].as_str(),
                    Some("uploaded" | "completed" | "attached")
                ) {
                    return Err(Fault::new("conflict", "bytes have not been validated"));
                }
                let bytes = tokio::fs::read(self.root.join("assets").join(r.key()))
                    .await
                    .map_err(Fault::internal)?;
                if hash(&bytes) != r.data["sha256"].as_str().unwrap_or("")
                    || bytes.len() as u64 != r.data["size"].as_u64().unwrap_or(0)
                {
                    return Err(Fault::new("conflict", "stored bytes failed validation"));
                }
                if r.data["state"] == "uploaded" {
                    r.data["state"] = json!("completed");
                }
                plan.result = json!({"asset_id":r.key()});
                plan.put(r);
            }
            "attachVerification" => {
                let mut asset = self
                    .store
                    .require("media_asset", &text(p, "asset_id", 1, 100)?)
                    .await?;
                let kind = choice(p, "kind", &["identity", "address", "credential"])?;
                if asset.owner.as_deref() != Some(a.user.id.as_str())
                    || asset.data["purpose"] != "verification"
                    || asset.data["document_kind"] != kind
                    || !matches!(asset.data["state"].as_str(), Some("completed" | "attached"))
                {
                    return Err(Fault::new("forbidden", "invalid verification association"));
                }
                let mut u = a.user.clone();
                if u.data["eligibility"] == "verified" || u.data["eligibility"] == "submitted" {
                    return Err(Fault::new(
                        "conflict",
                        "verification review must be reopened before changing documents",
                    ));
                }
                let mut docs = u.data["verification_documents"]
                    .as_array()
                    .cloned()
                    .unwrap_or_default();
                docs.retain(|d| d["kind"] != kind);
                docs.push(
                    json!({"asset_id":asset.key(),"kind":kind,"name":asset.data["name"],"url":""}),
                );
                u.data["verification_documents"] = json!(docs);
                asset.data["state"] = json!("attached");
                plan.put(asset);
                bump(&mut u);
                plan.result = u.data.clone();
                plan.put(u);
            }
            "attachEvidence" => {
                let mut o = self
                    .store
                    .require("job_order", &text(p, "id", 1, 100)?)
                    .await?;
                authorize(&o.data, &a.user.data)?;
                revision(&o, c)?;
                if o.data["collaborator_id"] != a.id() && !is_ops(&a.user.data) {
                    return Err(Fault::new("forbidden", "assigned collaborator required"));
                }
                if !matches!(
                    o.data["status"].as_str(),
                    Some("in_progress" | "pending_quote_approval")
                ) {
                    return Err(Fault::new("conflict", "order no longer accepts evidence"));
                }
                let mut asset = self
                    .store
                    .require("media_asset", &text(p, "asset_id", 1, 100)?)
                    .await?;
                if asset.owner.as_deref() != Some(a.user.id.as_str())
                    || asset.data["purpose"] != "evidence"
                    || asset.data["order_id"] != o.data["id"]
                    || asset.data["state"] != "completed"
                {
                    return Err(Fault::new("forbidden", "invalid evidence association"));
                }
                let phase = choice(
                    p,
                    "phase",
                    &["diagnostic_before", "work_progress", "proof_finished"],
                )?;
                let source = choice(p, "source", &["camera", "file"])?;
                if let Some(at) = p.get("captured_at") {
                    chrono::DateTime::parse_from_rfc3339(at.as_str().unwrap_or(""))
                        .map_err(|_| Fault::invalid("invalid capture time"))?;
                }
                coordinates(&p["coordinates"])?;
                let mut evidence = json!({"id":asset.key(),"order_id":o.key(),"phase":phase,"url":"","sha256":asset.data["sha256"],"name":asset.data["name"],"size":asset.data["size"],"received_at":asset.data["received_at"],"source":source});
                for k in ["captured_at", "coordinates"] {
                    if let Some(v) = p.get(k) {
                        evidence[k] = v.clone();
                    }
                }
                o.data["evidence"]
                    .as_array_mut()
                    .ok_or_else(|| Fault::internal("invalid evidence collection"))?
                    .push(evidence);
                asset.data["state"] = json!("attached");
                plan.put(asset);
                changed(&mut o, &a.user.data, "evidence", "Evidencia adjunta");
                self.emit_order(plan, &o).await?;
                plan.result = o.data.clone();
                plan.put(o);
            }
            _ => return Err(Fault::new("not_found", "unknown media command")),
        }
        Ok(())
    }
    pub async fn upload(
        &self,
        id: &str,
        expires: i64,
        generation: u64,
        sig: &str,
        mime: &str,
        bytes: &[u8],
    ) -> Result<(), Fault> {
        if expires <= Utc::now().timestamp() {
            return Err(Fault::new("forbidden", "upload ticket expired"));
        }
        self.secrets
            .verify(&format!("put:{id}:{expires}:{generation}"), sig)?;
        let mut r = self.store.require("media_asset", id).await?;
        if r.data["generation"].as_u64() != Some(generation)
            || r.data["expires_at"].as_i64() != Some(expires)
        {
            return Err(Fault::new("forbidden", "upload ticket superseded"));
        }
        if r.data["size"].as_u64() != Some(bytes.len() as u64)
            || r.data["type"] != mime
            || bytes.is_empty()
            || bytes.len() > self.config.application.max_upload_bytes
        {
            return Err(Fault::invalid("upload size or type mismatch"));
        }
        let session = self
            .store
            .require("session", r.data["session_id"].as_str().unwrap_or(""))
            .await?;
        if session.data["revoked"] == true || expired(&session.data["expires_at"]) {
            return Err(Fault::new("forbidden", "upload session expired"));
        }
        let owner = self
            .store
            .require(
                "user",
                r.owner
                    .as_deref()
                    .unwrap_or("")
                    .strip_prefix("user:")
                    .unwrap_or(""),
            )
            .await?;
        if owner.data["status"] != "active" {
            return Err(Fault::new("forbidden", "upload owner unavailable"));
        }
        let format =
            image::guess_format(bytes).map_err(|_| Fault::invalid("invalid image bytes"))?;
        if format.to_mime_type() != mime {
            return Err(Fault::invalid("actual image type mismatch"));
        }
        let reader = image::ImageReader::with_format(std::io::Cursor::new(bytes), format);
        let (w, h) = reader
            .into_dimensions()
            .map_err(|_| Fault::invalid("invalid image"))?;
        if w == 0 || h == 0 || w > 12000 || h > 12000 || (w as u64 * h as u64) > 16_000_000 {
            return Err(Fault::invalid("image dimensions exceed limits"));
        }
        image::load_from_memory_with_format(bytes, format)
            .map_err(|_| Fault::invalid("image decoding failed"))?;
        let digest = hash(bytes);
        if let Some(old) = r.data["sha256"].as_str() {
            if old != digest {
                return Err(Fault::new("conflict", "upload bytes changed"));
            }
            return Ok(());
        }
        let dir = self.root.join("assets");
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(Fault::internal)?;
        let target = dir.join(id);
        let tmp = dir.join(format!("{}.part", new_id()));
        use tokio::io::AsyncWriteExt;
        let mut f = tokio::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&tmp)
            .await
            .map_err(Fault::internal)?;
        f.write_all(bytes).await.map_err(Fault::internal)?;
        f.sync_all().await.map_err(Fault::internal)?;
        drop(f);
        match tokio::fs::hard_link(&tmp, &target).await {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let old = tokio::fs::read(&target).await.map_err(Fault::internal)?;
                if hash(&old) != digest {
                    let _ = tokio::fs::remove_file(&tmp).await;
                    return Err(Fault::new("conflict", "existing upload bytes differ"));
                }
            }
            Err(e) => {
                let _ = tokio::fs::remove_file(&tmp).await;
                return Err(Fault::internal(e));
            }
        }
        tokio::fs::remove_file(&tmp)
            .await
            .map_err(Fault::internal)?;
        r.data["sha256"] = json!(digest);
        r.data["state"] = json!("uploaded");
        r.data["received_at"] = json!(now());
        let mut plan = Plan::default();
        plan.guard(&owner);
        plan.guard(&session);
        plan.put(r);
        self.store.commit(plan, None).await?;
        Ok(())
    }
}
