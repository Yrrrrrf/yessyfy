use super::{
    config::Config,
    contracts::system::{EnqueueRequest, EnqueueResult, JobRequest},
    error::Fault,
    readiness::Readiness,
};
use crate::{
    service::{
        operation::{decode, encode, required},
        registry::Registry,
    },
    worker::runner::Queue,
};
use serde_json::Value;
use std::{sync::Arc, time::Duration};
use subtle::ConstantTimeEq;
use tokio_util::sync::CancellationToken;
pub struct Context {
    pub config: Config,
    pub registry: Arc<Registry>,
    pub queue: Queue,
    pub ready: Readiness,
    pub cancellation: CancellationToken,
    pub sessions: tokio_util::task::TaskTracker,
    token: String,
    pub product: Option<Arc<crate::service::product::Product>>,
}
impl Context {
    pub fn new(
        config: Config,
        registry: Arc<Registry>,
        queue: Queue,
        cancellation: CancellationToken,
        token: String,
    ) -> Self {
        Self {
            config,
            registry,
            queue,
            ready: Readiness::default(),
            cancellation,
            token,
            product: None,
            sessions: tokio_util::task::TaskTracker::new(),
        }
    }
    pub fn with_product(mut self, product: Arc<crate::service::product::Product>) -> Self {
        self.product = Some(product);
        self
    }
    pub async fn identity(
        &self,
        header: Option<&str>,
    ) -> Result<(Option<crate::service::product::Principal>, bool), Fault> {
        let token = header.and_then(|h| h.strip_prefix("Bearer ")).unwrap_or("");
        if token.is_empty() {
            return Ok((None, false));
        }
        if self.authorize(token).is_ok() {
            return Ok((None, true));
        }
        let p = self
            .product
            .as_ref()
            .ok_or_else(|| Fault::new("unauthorized", "invalid identity"))?;
        Ok((Some(p.authenticate(token).await?), false))
    }
    pub async fn invoke_as(
        &self,
        name: &str,
        payload: serde_json::Value,
        actor: Option<&crate::service::product::Principal>,
        system: bool,
    ) -> Result<serde_json::Value, Fault> {
        if self.cancellation.is_cancelled() {
            return Err(Fault::new("busy", "host is stopping"));
        }
        if name.starts_with("yessyfy.") {
            return tokio::time::timeout(
                std::time::Duration::from_secs(self.config.server.operation_timeout_seconds),
                self.registry.invoke_as(name, payload, actor),
            )
            .await
            .unwrap_or_else(|_| Err(Fault::new("timeout", "operation deadline exceeded")));
        }
        if !system {
            return Err(Fault::new(
                if actor.is_none() {
                    "unauthorized"
                } else {
                    "forbidden"
                },
                "system identity required",
            ));
        }
        self.invoke(name, payload).await
    }
    pub fn authorize(&self, token: &str) -> Result<(), Fault> {
        if bool::from(token.as_bytes().ct_eq(self.token.as_bytes())) {
            Ok(())
        } else {
            Err(Fault::new("unauthorized", "invalid API token"))
        }
    }
    pub fn bearer(&self, header: Option<&str>) -> Result<(), Fault> {
        self.authorize(header.and_then(|h| h.strip_prefix("Bearer ")).unwrap_or(""))
    }
    pub fn names(&self) -> Vec<&'static str> {
        let mut names = self.registry.names();
        names.extend(["system.enqueue", "system.job"]);
        names.sort();
        names
    }
    pub async fn invoke(&self, name: &str, payload: Value) -> Result<Value, Fault> {
        if self.cancellation.is_cancelled() {
            return Err(Fault::new("busy", "host is stopping"));
        }
        let operation = async {
            match name {
                "system.enqueue" => {
                    let request: EnqueueRequest = decode(payload)?;
                    required(&[&request.operation, &request.payload_json])?;
                    if !self.registry.contains(&request.operation) {
                        return Err(Fault::new("not_found", "unknown operation"));
                    }
                    let value = serde_json::from_str(&request.payload_json)
                        .map_err(|e| Fault::invalid(e.to_string()))?;
                    encode(EnqueueResult {
                        job_id: self.queue.enqueue(request.operation, value).await?,
                    })
                }
                "system.job" => {
                    let request: JobRequest = decode(payload)?;
                    required(&[&request.job_id])?;
                    encode(self.queue.get(&request.job_id).await?)
                }
                _ => self.registry.invoke(name, payload).await,
            }
        };
        tokio::time::timeout(
            Duration::from_secs(self.config.server.operation_timeout_seconds),
            operation,
        )
        .await
        .unwrap_or_else(|_| Err(Fault::new("timeout", "operation timed out")))
    }
}
