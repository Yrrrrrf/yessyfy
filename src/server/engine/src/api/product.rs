use crate::{
    service::product::helpers_public,
    shared::{context::Context, error::Fault},
};
use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, Query, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
pub fn router(context: Arc<Context>) -> Router<Arc<Context>> {
    let uploads = Router::new()
        .route("/client/uploads/{id}", put(upload))
        .layer(DefaultBodyLimit::max(
            context.config.application.max_upload_bytes,
        ));
    Router::new()
        .route("/client/operations/{operation}", post(operation))
        .route("/client/assets/{id}", get(asset))
        .route("/client/documents/{id}", get(document))
        .route("/client/invoices/{id}/xml", get(invoice_xml))
        .route("/providers/events", post(provider))
        .layer(DefaultBodyLimit::max(context.config.server.max_body_bytes))
        .merge(uploads)
}
async fn operation(
    State(c): State<Arc<Context>>,
    Path(op): Path<String>,
    headers: HeaderMap,
    bytes: Bytes,
) -> Result<Json<Value>, Fault> {
    let input = serde_json::from_slice(&bytes).map_err(|_| Fault::invalid("invalid JSON input"))?;
    let (a, system) = if [
        "manifest",
        "requestOtp",
        "verifyOtp",
        "catalog",
        "slots",
        "collaborators",
    ]
    .contains(&op.as_str())
    {
        (None, false)
    } else {
        c.identity(
            headers
                .get(header::AUTHORIZATION)
                .and_then(|h| h.to_str().ok()),
        )
        .await?
    };
    Ok(Json(
        c.invoke_as(&format!("yessyfy.{op}"), input, a.as_ref(), system)
            .await?,
    ))
}
#[derive(Deserialize)]
pub struct UploadQuery {
    expires: i64,
    generation: u64,
    sig: String,
}
async fn upload(
    State(c): State<Arc<Context>>,
    Path(id): Path<String>,
    Query(q): Query<UploadQuery>,
    headers: HeaderMap,
    bytes: Bytes,
) -> Result<StatusCode, Fault> {
    let app = c
        .product
        .as_ref()
        .ok_or_else(|| Fault::new("busy", "product unavailable"))?;
    app.upload(
        &id,
        q.expires,
        q.generation,
        &q.sig,
        headers
            .get(header::CONTENT_TYPE)
            .and_then(|h| h.to_str().ok())
            .unwrap_or(""),
        &bytes,
    )
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
#[derive(Deserialize)]
pub struct ReadQuery {
    expires: i64,
    session: String,
    sig: String,
}
async fn asset(
    State(c): State<Arc<Context>>,
    Path(id): Path<String>,
    Query(q): Query<ReadQuery>,
) -> Result<Response, Fault> {
    let app = c
        .product
        .as_ref()
        .ok_or_else(|| Fault::new("busy", "product unavailable"))?;
    let a = app
        .signed_principal("get", &id, q.expires, &q.session, &q.sig)
        .await?;
    let r = app.store.require("media_asset", &id).await?;
    app.authorize_asset(&r, &a).await?;
    if r.data["state"] != "attached" {
        return Err(Fault::new("forbidden", "asset not attached"));
    }
    let bytes = tokio::fs::read(app.root.join("assets").join(r.key()))
        .await
        .map_err(Fault::internal)?;
    if crate::service::product::crypto::hash(&bytes) != r.data["sha256"].as_str().unwrap_or("") {
        return Err(Fault::new("conflict", "asset hash mismatch"));
    }
    Ok((
        [
            (
                header::CONTENT_TYPE,
                r.data["type"]
                    .as_str()
                    .unwrap_or("application/octet-stream"),
            ),
            (header::CACHE_CONTROL, "private, no-store"),
            (header::CONTENT_DISPOSITION, "inline"),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        ],
        bytes,
    )
        .into_response())
}
async fn document(
    State(c): State<Arc<Context>>,
    Path(id): Path<String>,
    Query(q): Query<ReadQuery>,
) -> Result<Response, Fault> {
    download_document(c, id, q, false).await
}
async fn invoice_xml(
    State(c): State<Arc<Context>>,
    Path(id): Path<String>,
    Query(q): Query<ReadQuery>,
) -> Result<Response, Fault> {
    download_document(c, id, q, true).await
}
async fn download_document(
    c: Arc<Context>,
    id: String,
    q: ReadQuery,
    xml: bool,
) -> Result<Response, Fault> {
    let app = c
        .product
        .as_ref()
        .ok_or_else(|| Fault::new("busy", "product unavailable"))?;
    let a = app
        .signed_principal("document", &id, q.expires, &q.session, &q.sig)
        .await?;
    let r = app.store.require("document_request", &id).await?;
    let o = app
        .store
        .require("job_order", r.data["order_id"].as_str().unwrap_or(""))
        .await?;
    helpers_public::authorize(&o.data, &a.user.data)?;
    app.authorize_document(&r.data, &a)?;
    if r.data["status"] != "ready" || (xml && r.data["kind"] != "invoice") {
        return Err(Fault::new("conflict", "document is not ready"));
    }
    let ext = if xml { "xml" } else { "pdf" };
    let bytes = tokio::fs::read(app.root.join("documents").join(format!("{id}.{ext}")))
        .await
        .map_err(Fault::internal)?;
    let digest = if xml {
        app.store.require("tax_invoice", &id).await?.data["sha256"].clone()
    } else {
        r.data["sha256"].clone()
    };
    if crate::service::product::crypto::hash(&bytes) != digest.as_str().unwrap_or("") {
        return Err(Fault::new("conflict", "document hash mismatch"));
    }
    Ok((
        [
            (
                header::CONTENT_TYPE,
                if xml {
                    "application/xml"
                } else {
                    "application/pdf"
                },
            ),
            (header::CACHE_CONTROL, "private, no-store"),
            (
                header::CONTENT_DISPOSITION,
                if xml {
                    "attachment; filename=\"yessyfy-invoice.xml\""
                } else {
                    "attachment; filename=\"yessyfy-service.pdf\""
                },
            ),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        ],
        bytes,
    )
        .into_response())
}
async fn provider(
    State(c): State<Arc<Context>>,
    headers: HeaderMap,
    bytes: Bytes,
) -> Result<Json<Value>, Fault> {
    let app = c
        .product
        .as_ref()
        .ok_or_else(|| Fault::new("busy", "product unavailable"))?;
    Ok(Json(
        app.provider_event(
            &bytes,
            headers
                .get("x-yessyfy-timestamp")
                .and_then(|h| h.to_str().ok())
                .unwrap_or(""),
            headers
                .get("x-yessyfy-signature")
                .and_then(|h| h.to_str().ok())
                .unwrap_or(""),
        )
        .await?,
    ))
}
