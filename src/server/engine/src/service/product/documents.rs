use super::{Product, crypto::hash, helpers::*, store::Row};
use crate::shared::{config::Config, error::Fault};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};
#[derive(Clone)]
pub struct Renderer {
    compiler: PathBuf,
    files: Arc<BTreeMap<String, Vec<u8>>>,
    root: PathBuf,
    pub bundle_hash: String,
}
impl Renderer {
    pub fn new(c: &Config, root: &Path) -> Result<Self, Fault> {
        let bundle = &c.application.document_bundle;
        let bytes = std::fs::read(bundle.join("bundle-manifest.json")).map_err(Fault::internal)?;
        let manifest: Value = serde_json::from_slice(&bytes).map_err(Fault::internal)?;
        if manifest["schema"] != "brand.render/1" || manifest["brand_version"] != "0.0.1" {
            return Err(Fault::invalid("unsupported Brand bundle"));
        }
        let mut files = BTreeMap::new();
        let mut total = 0usize;
        for (name, digest) in manifest["files"]
            .as_object()
            .ok_or_else(|| Fault::invalid("bundle file map required"))?
        {
            if !safe_path(name) {
                return Err(Fault::invalid("unsafe bundle path"));
            }
            let mut path = bundle.clone();
            for part in Path::new(name).components() {
                path.push(part);
                if std::fs::symlink_metadata(&path)
                    .map_err(Fault::internal)?
                    .file_type()
                    .is_symlink()
                {
                    return Err(Fault::invalid("bundle symlinks forbidden"));
                }
            }
            let bytes = std::fs::read(&path).map_err(Fault::internal)?;
            total = total
                .checked_add(bytes.len())
                .ok_or_else(|| Fault::invalid("bundle overflow"))?;
            if total > 100_000_000 || hash(&bytes) != digest.as_str().unwrap_or("") {
                return Err(Fault::invalid("bundle digest or size mismatch"));
            }
            files.insert(name.clone(), bytes);
        }
        for name in [
            "brand/src/lib.typ",
            "brands.json",
            "templates/report.typ",
            "templates/warranty.typ",
            "templates/invoice.typ",
        ] {
            if !files.contains_key(name) {
                return Err(Fault::invalid("required document runtime file missing"));
            }
        }
        let result = std::process::Command::new(&c.application.compiler)
            .arg("--version")
            .output()
            .map_err(Fault::internal)?;
        if !result.status.success()
            || !String::from_utf8_lossy(&result.stdout)
                .starts_with(&format!("typst {}", c.application.compiler_version))
        {
            return Err(Fault::invalid("Typst compiler version mismatch"));
        }
        Ok(Self {
            compiler: c.application.compiler.clone(),
            files: Arc::new(files),
            root: root.join("render-staging"),
            bundle_hash: hash(&bytes),
        })
    }
    pub async fn render(
        &self,
        id: &str,
        kind: &str,
        job: &Value,
        assets: &[(String, Vec<u8>)],
    ) -> Result<Vec<u8>, Fault> {
        if !["report", "warranty", "invoice"].contains(&kind) {
            return Err(Fault::invalid("unknown document recipe"));
        }
        tokio::fs::create_dir_all(&self.root)
            .await
            .map_err(Fault::internal)?;
        let stage = tempfile::Builder::new()
            .prefix("yessyfy-")
            .tempdir_in(&self.root)
            .map_err(Fault::internal)?;
        for (name, bytes) in self.files.iter() {
            let path = stage.path().join(name);
            if let Some(parent) = path.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(Fault::internal)?;
            }
            tokio::fs::write(path, bytes)
                .await
                .map_err(Fault::internal)?;
        }
        for (name, bytes) in assets {
            if !safe_path(name) || !name.starts_with("assets/") {
                return Err(Fault::invalid("unsafe staged asset"));
            }
            let path = stage.path().join(name);
            tokio::fs::create_dir_all(path.parent().unwrap())
                .await
                .map_err(Fault::internal)?;
            tokio::fs::write(path, bytes)
                .await
                .map_err(Fault::internal)?;
        }
        tokio::fs::write(
            stage.path().join("render.json"),
            serde_json::to_vec(job).map_err(Fault::internal)?,
        )
        .await
        .map_err(Fault::internal)?;
        // Only source-owned imports; data is JSON and cannot choose a path or execute Typst.
        let entry = format!(
            "#import \"brand/src/lib.typ\": load-render, render-job\n#import \"templates/{kind}.typ\": template\n#show: render-job.with(load-render(), template: template)\n"
        );
        tokio::fs::write(stage.path().join("entry.typ"), entry)
            .await
            .map_err(Fault::internal)?;
        let mut child = tokio::process::Command::new(&self.compiler)
            .arg("compile")
            .arg("--root")
            .arg(stage.path())
            .arg("--font-path")
            .arg(stage.path().join("fonts"))
            .arg("--ignore-system-fonts")
            .arg(stage.path().join("entry.typ"))
            .arg(stage.path().join("result.pdf"))
            .env_clear()
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .kill_on_drop(true)
            .spawn()
            .map_err(Fault::internal)?;
        let status = match tokio::time::timeout(Duration::from_secs(7), child.wait()).await {
            Ok(r) => r.map_err(Fault::internal)?,
            Err(_) => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                return Err(Fault::new("timeout", "document compiler deadline exceeded"));
            }
        };
        if !status.success() {
            return Err(Fault::invalid("document recipe or data failed validation"));
        }
        let result = tokio::fs::read(stage.path().join("result.pdf"))
            .await
            .map_err(Fault::internal)?;
        if result.len() > 20_000_000 || !result.starts_with(b"%PDF-") {
            return Err(Fault::invalid("invalid rendered PDF"));
        }
        tracing::info!(document_id=id,bundle=%self.bundle_hash,"Brand document rendered");
        Ok(result)
    }
}
pub fn safe_path(s: &str) -> bool {
    !s.is_empty()
        && !s.contains(['\\', ':', '\0'])
        && Path::new(s)
            .components()
            .all(|c| matches!(c, std::path::Component::Normal(_)))
}
pub fn exact_money(cents: u64) -> Value {
    json!({"amount":format!("{}.{:02}",cents/100,cents%100),"currency":"MXN"})
}
impl Product {
    pub async fn document_data(
        &self,
        o: &Row,
        kind: &str,
        warranty: Option<&Row>,
        cfdi_type: &str,
        recipient: &str,
    ) -> Result<Value, Fault> {
        let mut data = json!({"code":o.data["code"],"date":chrono::Utc::now().with_timezone(&chrono_tz::America::Mexico_City).date_naive().to_string(),"customer":o.data["customer_name"],"collaborator":o.data["collaborator_name"].as_str().unwrap_or("Sin asignación"),"service":o.data["booking"]["category"],"address":format!("{}, {}, {}",o.data["booking"]["address"]["street"].as_str().unwrap_or(""),o.data["booking"]["address"]["city"].as_str().unwrap_or(""),o.data["booking"]["address"]["postal_code"].as_str().unwrap_or("")),"description":o.data["booking"]["description"],"status":o.data["status"],"total":exact_money(amount(&o.data["finance"],"total_cents")?),"evidence":[],"order_revision":o.version,"qa":o.data["qa"],"customer_review":o.data["customer_review"]});
        let mut evidence = vec![];
        for e in o.data["evidence"].as_array().into_iter().flatten().take(6) {
            evidence.push(json!({"asset_id":e["id"],"phase":e["phase"],"sha256":e["sha256"],"received_at":e["received_at"]}));
        }
        data["evidence"] = json!(evidence);
        if kind == "warranty" {
            let w = warranty.ok_or_else(|| Fault::new("conflict", "warranty missing"))?;
            data["certificate"] = w.data["code"].clone();
            data["starts_at"] = json!(
                w.data["starts_at"]
                    .as_str()
                    .unwrap_or("")
                    .get(..10)
                    .unwrap_or("")
            );
            data["ends_at"] = json!(
                w.data["ends_at"]
                    .as_str()
                    .unwrap_or("")
                    .get(..10)
                    .unwrap_or("")
            );
            data["terms"] = w.data["terms"].clone();
        }
        if kind == "invoice" {
            let party = self.store.require("user", recipient).await?;
            let fiscal = &party.data["fiscal"];
            data["cfdi_type"] = json!(cfdi_type);
            data["total"] = exact_money(amount(
                &o.data["finance"],
                if cfdi_type == "retencion_plataforma" {
                    "withholding_cents"
                } else {
                    "fee_cents"
                },
            )?);
            for key in ["rfc", "name", "postal_code", "regime", "use"] {
                text(fiscal, key, 1, 200)?;
            }
            data["fiscal"] = fiscal.clone();
            data["uuid"] = Value::Null;
            data["stamped_at"] = Value::Null;
        }
        Ok(data)
    }
    pub async fn compile_document(
        &self,
        document: &Row,
    ) -> Result<(Vec<u8>, Option<Vec<u8>>), Fault> {
        let kind = document.data["kind"].as_str().unwrap_or("");
        let mut data = document.data["snapshot"].clone();
        let locale = data["locale"].as_str().unwrap_or("es").to_owned();
        data.as_object_mut()
            .ok_or_else(|| Fault::internal("invalid document snapshot"))?
            .remove("locale");
        let mut xml = None;
        if kind == "invoice" {
            let stamp = self.request_fiscal_stamp(document, &data).await?;
            data["uuid"] = stamp.0["uuid"].clone();
            data["stamped_at"] = stamp.0["stamped_at"].clone();
            data["issuer_rfc"] = stamp.0["issuer_rfc"].clone();
            data["recipient_rfc"] = stamp.0["recipient_rfc"].clone();
            data.as_object_mut().unwrap().remove("fiscal");
            xml = Some(stamp.1);
        }
        let mut assets = json!({});
        let mut bytes = vec![];
        if let Some(es) = data["evidence"].as_array_mut() {
            for (index, e) in es.iter_mut().enumerate() {
                let row = self
                    .store
                    .require("media_asset", e["asset_id"].as_str().unwrap_or(""))
                    .await?;
                if row.data["order_id"] != document.data["order_id"]
                    || row.data["state"] != "attached"
                {
                    return Err(Fault::new(
                        "forbidden",
                        "document evidence ownership changed",
                    ));
                }
                let image = tokio::fs::read(self.root.join("assets").join(row.key()))
                    .await
                    .map_err(Fault::internal)?;
                if hash(&image) != e["sha256"].as_str().unwrap_or("") {
                    return Err(Fault::new("conflict", "document evidence hash changed"));
                }
                let key = format!("evidence{index}");
                let name = format!("assets/{key}");
                assets[&key] = json!({"path":format!("/{name}"),"mime_type":row.data["type"]});
                e["asset_id"] = json!(key);
                bytes.push((name, image));
            }
        }
        let brand: Value = serde_json::from_slice(
            self.renderer
                .files
                .get("brands.json")
                .ok_or_else(|| Fault::internal("brand missing"))?,
        )
        .map_err(Fault::internal)?;
        let job = json!({"schema":"brand.render/1","brand":brand,"document":{"id":document.key(),"template_id":format!("yessyfy/{kind}"),"template_version":"0.0.1","title":match kind{"warranty"=>"Garantía de servicio","invoice"=>"Comprobante fiscal",_=>"Reporte de servicio"},"locale":locale,"created_at":chrono::DateTime::parse_from_rfc3339(document.data["at"].as_str().unwrap_or("")).map_err(Fault::internal)?.with_timezone(&chrono::Utc).format("%Y-%m-%dT%H:%M:%SZ").to_string(),"generated_by":{"kind":"system","id":"yessyfy-server"},"page_numbers":true,"watermark":if self.config.profile.name=="dev"{json!(if locale=="es"{"DESARROLLO · SIN VALIDEZ FISCAL"}else{"DEVELOPMENT · NO FISCAL VALIDITY"})}else{Value::Null}},"data":data,"assets":assets});
        Ok((
            self.renderer
                .render(document.key(), kind, &job, &bytes)
                .await?,
            xml,
        ))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn money_is_exact_and_paths_are_contained() {
        assert_eq!(exact_money(100000000001)["amount"], "1000000000.01");
        assert!(!safe_path("../private"));
        assert!(!safe_path("/etc/passwd"));
        assert!(safe_path("brand/src/lib.typ"));
    }
}
