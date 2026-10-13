mod codec;
pub mod crypto;
mod helpers;
pub mod store;
pub mod helpers_public {
    pub use super::helpers::authorize;
}
mod auth;
mod commands;
mod discovery;
mod documents;
pub mod jobs;
mod media;
mod outcomes;
mod workflow;
use crate::shared::{config::Config, error::Fault};
use crypto::{Secrets, hash};
use helpers::*;
use serde_json::{Value, json};
use std::{path::PathBuf, sync::Arc};
use store::{Plan, ReceiptWrite, Row, Store};
use tokio_util::sync::CancellationToken;
pub const OPERATIONS: &[&str] = &[
    "manifest",
    "requestOtp",
    "verifyOtp",
    "session",
    "logout",
    "catalog",
    "slots",
    "collaborators",
    "profile",
    "profiles",
    "updateProfile",
    "submitVerification",
    "previewQuote",
    "createOrder",
    "orders",
    "order",
    "offers",
    "candidates",
    "offer",
    "acceptOffer",
    "declineOffer",
    "duty",
    "progress",
    "propose",
    "decideQuote",
    "review",
    "qa",
    "cancelPreview",
    "cancelOrder",
    "reconcileFinance",
    "beginUpload",
    "renewUpload",
    "completeUpload",
    "attachEvidence",
    "attachVerification",
    "conversation",
    "sendMessage",
    "inbox",
    "markRead",
    "events",
    "cases",
    "case",
    "createCase",
    "resolveCase",
    "warranties",
    "warranty",
    "documents",
    "requestDocument",
    "document",
    "payouts",
    "receipt",
];

#[derive(Clone)]
pub struct Principal {
    pub user: Row,
    pub session: Row,
}
impl Principal {
    pub fn id(&self) -> &str {
        self.user.key()
    }
    pub fn plan(&self) -> Plan {
        let mut p = Plan::default();
        p.guard(&self.user);
        p.guard(&self.session);
        p
    }
}
pub struct Product {
    pub store: Store,
    pub config: Config,
    pub secrets: Secrets,
    pub client: reqwest::Client,
    pub root: PathBuf,
    pub stop: CancellationToken,
    pub renderer: documents::Renderer,
}
impl Product {
    pub fn new(config: &Config, stop: CancellationToken) -> Result<Self, Fault> {
        let env = |n: &str| std::env::var(n).map_err(|_| Fault::invalid(format!("missing {n}")));
        let a = &config.application;
        let secrets = Secrets::new(
            &env(&a.signing_key_env)?,
            &env(&a.job_key_env)?,
            &env(&a.provider_key_env)?,
        )?;
        if a.max_upload_bytes == 0
            || a.max_upload_bytes > 25_000_000
            || a.fee_basis_points
                .checked_add(a.withholding_basis_points)
                .is_none_or(|sum| sum > 10000)
            || a.warranty_days < 1
            || a.warranty_days > 365
            || a.warranty_terms.trim().is_empty()
        {
            return Err(Fault::invalid("invalid product policy"));
        }
        if !["file", "webhook"].contains(&a.otp_provider.as_str())
            || !["disabled", "webhook"].contains(&a.finance_provider.as_str())
        {
            return Err(Fault::invalid("unknown product provider"));
        }
        if config.profile.name == "prod"
            && (a.otp_provider != "webhook"
                || a.finance_provider != "webhook"
                || a.fiscal_provider != "webhook")
        {
            return Err(Fault::invalid(
                "production requires configured OTP and finance providers",
            ));
        }
        for (provider, url) in [
            (&a.otp_provider, &a.otp_webhook),
            (&a.finance_provider, &a.finance_webhook),
            (&a.fiscal_provider, &a.fiscal_webhook),
        ] {
            if provider == "webhook" {
                let u = reqwest::Url::parse(url).map_err(Fault::internal)?;
                if !["http", "https"].contains(&u.scheme())
                    || (config.profile.name == "prod" && u.scheme() != "https")
                {
                    return Err(Fault::invalid("invalid provider URL"));
                }
            }
        }
        for url in [&a.public_origin, &a.main_origin, &a.vision_origin] {
            let u = reqwest::Url::parse(url).map_err(Fault::internal)?;
            if !["http", "https"].contains(&u.scheme())
                || (config.profile.name == "prod" && u.scheme() != "https")
                || u.username() != ""
                || u.password().is_some()
            {
                return Err(Fault::invalid("invalid product origin"));
            }
        }
        let root = config.server.artifacts_dir.join("product");
        std::fs::create_dir_all(&root).map_err(Fault::internal)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o700))
                .map_err(Fault::internal)?;
        }
        if std::fs::symlink_metadata(&root)
            .map_err(Fault::internal)?
            .file_type()
            .is_symlink()
        {
            return Err(Fault::invalid("artifact symlink forbidden"));
        }
        let renderer = documents::Renderer::new(config, &root)?;
        Ok(Self {
            store: Store::new(config)?,
            config: config.clone(),
            secrets,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(8))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .map_err(Fault::internal)?,
            root,
            stop,
            renderer,
        })
    }
    pub async fn check(&self) -> Result<(), Fault> {
        let response = self
            .client
            .get(format!(
                "{}/version",
                self.config.application.database_url.trim_end_matches('/')
            ))
            .send()
            .await
            .map_err(|_| Fault::new("busy", "database unavailable"))?;
        let version = response.text().await.map_err(Fault::internal)?;
        if !version
            .trim()
            .trim_start_matches("surrealdb-")
            .starts_with("3.3.")
        {
            return Err(Fault::invalid("SurrealDB 3.3.x required"));
        }
        let contract = self
            .store
            .query("RETURN $yessyfy_contract;", json!({}))
            .await?;
        if contract != "YESSYFY-CLIENT/1" {
            return Err(Fault::invalid(
                "database contract baseline is missing or incompatible",
            ));
        }
        Ok(())
    }
    pub async fn execute(
        &self,
        op: &str,
        input: Value,
        actor: Option<&Principal>,
    ) -> Result<Value, Fault> {
        if !OPERATIONS.contains(&op) {
            return Err(Fault::new("not_found", "unknown operation"));
        }
        match op {
            "manifest" => {
                return Ok(
                    json!({"version":"YESSYFY-CLIENT/1","operations":OPERATIONS,"max_upload_bytes":self.config.application.max_upload_bytes,"mime_types":["image/jpeg","image/png","image/webp"],"timezone":"America/Mexico_City","areas":["CDMX"]}),
                );
            }
            "requestOtp" => return self.request_otp(input).await,
            "verifyOtp" => return self.verify_otp(input).await,
            "catalog" | "slots" | "collaborators" => return self.discover(op, input).await,
            _ => {}
        }
        let a = actor.ok_or_else(|| Fault::new("unauthorized", "verified session required"))?;
        if op == "logout" {
            return self.logout(a).await;
        }
        if let Some(value) = self.read(op, &input, a).await? {
            return Ok(value);
        }
        let key = text(&input, "request_key", 1, 100)?;
        let body_hash = hash(canonical(&json!({"operation":op,"input":input})).as_bytes());
        let receipt_key = hash(format!("{}:{key}", a.id()).as_bytes());
        if let Some(r) = self.store.get("operation_receipt", &receipt_key).await? {
            if r.data["hash"] != body_hash || r.data["operation"] != op {
                return Err(Fault::new(
                    "conflict",
                    "request key belongs to another action",
                ));
            }
            return self.replay(op, r.data["result"].clone(), a).await;
        }
        let mut plan = a.plan();
        let p = input
            .get("payload")
            .filter(|p| p.is_object())
            .ok_or_else(|| Fault::invalid("command payload required"))?;
        self.command(op, p, &input, a, &mut plan).await?;
        let resource = plan.result["id"]
            .as_str()
            .or_else(|| plan.result["asset_id"].as_str())
            .unwrap_or("")
            .to_owned();
        let receipt = ReceiptWrite {
            id: format!("operation_receipt:{receipt_key}"),
            actor: a.id().into(),
            operation: op.into(),
            hash: body_hash,
            resource_id: resource,
        };
        let result = self.store.commit(plan, Some(receipt)).await?;
        self.replay(op, result, a).await
    }
    pub async fn emit_order(&self, plan: &mut Plan, row: &Row) -> Result<(), Fault> {
        let key = row.key();
        plan.event(row.data["customer_id"].as_str().unwrap_or(""), "order", key);
        if let Some(id) = row.data["collaborator_id"].as_str() {
            plan.event(id, "order", key);
        }
        for op in self
            .store
            .list(
                "user",
                "data.status='active' AND ('operator' IN data.roles OR 'admin' IN data.roles)",
                json!({}),
            )
            .await?
        {
            plan.event(op.key(), "order", key);
        }
        Ok(())
    }
}
pub struct Capability {
    pub name: &'static str,
    pub operation: &'static str,
    pub product: Arc<Product>,
}
#[async_trait::async_trait]
impl super::operation::Operation for Capability {
    fn name(&self) -> &'static str {
        self.name
    }
    async fn execute(&self, v: Value) -> Result<Value, Fault> {
        self.product.execute(self.operation, v, None).await
    }
    async fn execute_as(&self, v: Value, a: Option<&Principal>) -> Result<Value, Fault> {
        self.product.execute(self.operation, v, a).await
    }
}
pub fn register(
    registry: &mut super::registry::Registry,
    product: Arc<Product>,
) -> Result<(), Fault> {
    for &op in OPERATIONS {
        let name = Box::leak(format!("yessyfy.{op}").into_boxed_str());
        registry.register(Capability {
            name,
            operation: op,
            product: product.clone(),
        })?;
    }
    Ok(())
}
