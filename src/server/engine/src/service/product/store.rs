use crate::shared::{config::Config, error::Fault};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub const TABLES: &[&str] = &[
    "user",
    "tax_invoice",
    "escrow_account",
    "session",
    "otp_challenge",
    "otp_rate",
    "service_catalog",
    "service_slot",
    "quote",
    "job_order",
    "dispatch_offer",
    "media_asset",
    "conversation_message",
    "notice",
    "service_case",
    "warranty_certificate",
    "document_request",
    "payment_attempt",
    "payout",
    "provider_event",
    "escrow_entry",
    "business_job",
    "operation_receipt",
    "feed_event",
    "feed_head",
];
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Row {
    pub id: String,
    pub version: u64,
    pub data: Value,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default)]
    pub order_id: Option<String>,
}
impl Row {
    pub fn new(
        table: &str,
        key: &str,
        data: Value,
        owner: Option<&str>,
        order: Option<&str>,
    ) -> Result<Self, Fault> {
        Ok(Self {
            id: rid(table, key)?,
            version: 0,
            data,
            owner: owner.map(|s| format!("user:{s}")),
            order_id: order.map(|s| format!("job_order:{s}")),
        })
    }
    pub fn key(&self) -> &str {
        self.id.split_once(':').map(|(_, s)| s).unwrap_or(&self.id)
    }
}
pub fn rid(table: &str, key: &str) -> Result<String, Fault> {
    if !TABLES.contains(&table)
        || key.is_empty()
        || key.len() > 100
        || !key
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err(Fault::invalid("invalid record identity"));
    }
    Ok(format!("{table}:{key}"))
}
#[derive(Clone)]
pub struct Store {
    client: reqwest::Client,
    url: String,
    ns: String,
    db: String,
    user: String,
    password: String,
}
impl Store {
    pub fn new(c: &Config) -> Result<Self, Fault> {
        let a = &c.application;
        let get =
            |name: &str| std::env::var(name).map_err(|_| Fault::invalid(format!("missing {name}")));
        Ok(Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(8))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .map_err(Fault::internal)?,
            url: a.database_url.clone(),
            ns: a.namespace.clone(),
            db: a.database.clone(),
            user: get(&a.database_user_env)?,
            password: get(&a.database_password_env)?,
        })
    }
    pub async fn query(&self, sql: &str, vars: Value) -> Result<Value, Fault> {
        let response = self
            .client
            .post(format!("{}/rpc", self.url.trim_end_matches('/')))
            .header("surreal-ns", &self.ns)
            .header("surreal-db", &self.db)
            .header("surreal-auth-ns", &self.ns)
            .header("surreal-auth-db", &self.db)
            .basic_auth(&self.user, Some(&self.password))
            .header("content-type", "application/cbor")
            .header("accept", "application/cbor")
            .body(super::codec::encode(
                &json!({"id":1,"method":"query","params":[sql,vars]}),
            )?)
            .send()
            .await
            .map_err(|_| Fault::new("busy", "database unavailable"))?;
        if !response.status().is_success() {
            return Err(Fault::new("busy", "database request rejected"));
        }
        let body: Value = super::codec::decode(&response.bytes().await.map_err(Fault::internal)?)?;
        if let Some(e) = body.get("error") {
            return Err(db_fault(&e.to_string()));
        }
        let rows = body["result"]
            .as_array()
            .ok_or_else(|| Fault::new("busy", "invalid database response"))?;
        // Check every statement, including transaction failure; never acknowledge a failed commit.
        if let Some(r) = rows.iter().find(|r| {
            r["status"] != "OK"
                && !r["result"].as_str().unwrap_or("").contains("not executed")
                && !r["result"]
                    .as_str()
                    .unwrap_or("")
                    .contains("not successful")
        }) {
            return Err(db_fault(
                r["result"].as_str().unwrap_or("database statement failed"),
            ));
        }
        let mut value = Value::Null;
        for r in rows {
            if r["status"] != "OK" {
                return Err(db_fault(
                    r["result"].as_str().unwrap_or("transaction failed"),
                ));
            }
            if !r["result"].is_null() {
                value = r["result"].clone();
            }
        }
        Ok(value)
    }
    pub async fn get(&self, table: &str, key: &str) -> Result<Option<Row>, Fault> {
        let value = self
            .query(
                "RETURN SELECT * FROM ONLY type::record($id);",
                json!({"id":rid(table,key)?}),
            )
            .await?;
        if value.is_null() {
            Ok(None)
        } else {
            serde_json::from_value(value)
                .map(Some)
                .map_err(Fault::internal)
        }
    }
    pub async fn require(&self, table: &str, key: &str) -> Result<Row, Fault> {
        self.get(table, key)
            .await?
            .ok_or_else(|| Fault::new("not_found", "resource unavailable"))
    }
    pub async fn list(&self, table: &str, filter: &str, vars: Value) -> Result<Vec<Row>, Fault> {
        if !TABLES.contains(&table) {
            return Err(Fault::invalid("invalid table"));
        }
        // filter is exclusively a source-owned expression; user values are bound separately.
        let value = self
            .query(
                &format!(
                    "SELECT * FROM {table} WHERE {filter} ORDER BY created_at DESC LIMIT 1000;"
                ),
                vars,
            )
            .await?;
        serde_json::from_value(value).map_err(Fault::internal)
    }
    pub async fn commit(&self, plan: Plan, receipt: Option<ReceiptWrite>) -> Result<Value, Fault> {
        let mut sql = String::from("BEGIN TRANSACTION;\n");
        if receipt.is_some() {
            sql.push_str("LET $existing=(SELECT * FROM ONLY type::record($receipt.id) FOR UPDATE); IF $existing != NONE { IF $existing.data.hash != $receipt.hash OR $existing.data.operation != $receipt.operation { THROW 'CONFLICT: request key reused'; }; RETURN $existing.data.result; };\n");
        }
        sql.push_str("FOR $g IN $guards { LET $record=(SELECT * FROM ONLY type::record($g.id) FOR UPDATE); IF ($g.version=0 AND $record!=NONE) OR ($g.version>0 AND ($record=NONE OR $record.version!=$g.version)) { THROW 'CONFLICT: resource changed'; }; };\n");
        sql.push_str("FOR $w IN $writes { UPSERT type::record($w.id) SET version=$w.version+1, data=$w.data, owner=IF $w.owner=NULL { NONE } ELSE { type::record($w.owner) }, order_id=IF $w.order_id=NULL { NONE } ELSE { type::record($w.order_id) }; };\n");
        // Feed heads are named-record conflict guards; unique actor/cursor indexes backstop ordering.
        sql.push_str("FOR $e IN $events { LET $head_id=type::record('feed_head',$e.actor); LET $head=(SELECT * FROM ONLY $head_id FOR UPDATE); LET $cursor=IF $head=NONE { 1 } ELSE { $head.data.cursor+1 }; UPSERT $head_id SET version=$cursor,data={cursor:$cursor},owner=type::record('user',$e.actor); CREATE type::record('feed_event',$e.id) SET version=1,owner=type::record('user',$e.actor),data={cursor:$cursor,kind:$e.kind,resource_id:$e.resource_id}; };\n");
        if receipt.is_some() {
            sql.push_str("CREATE type::record($receipt.id) SET version=1,owner=type::record('user',$receipt.actor),data={hash:$receipt.hash,operation:$receipt.operation,result:$result,resource_id:$receipt.resource_id};\n");
        }
        sql.push_str("RETURN $result; COMMIT TRANSACTION;");
        self.query(&sql,json!({"guards":plan.guards.into_iter().map(|(id,version)|json!({"id":id,"version":version})).collect::<Vec<_>>(),"writes":plan.writes.into_values().collect::<Vec<_>>(),"events":plan.events,"result":plan.result,"receipt":receipt})).await
    }

    pub async fn order_page(&self, filter: &str, vars: Value) -> Result<(Vec<Row>, u64), Fault> {
        let sql = format!(
            "BEGIN TRANSACTION; LET $total=((SELECT count() AS total FROM job_order WHERE {filter} GROUP ALL)[0].total ?? 0); LET $items=(SELECT * FROM job_order WHERE {filter} ORDER BY created_at DESC LIMIT $page_limit START $page_offset); RETURN {{items:$items,total:$total}}; COMMIT TRANSACTION;"
        );
        let value = self.query(&sql, vars).await?;
        let rows = serde_json::from_value(value["items"].clone()).map_err(Fault::internal)?;
        let total = value["total"]
            .as_u64()
            .ok_or_else(|| Fault::internal("invalid count"))?;
        Ok((rows, total))
    }
}
#[derive(Default)]
pub struct Plan {
    pub guards: BTreeMap<String, u64>,
    pub writes: BTreeMap<String, Row>,
    pub events: Vec<Value>,
    pub result: Value,
}
impl Plan {
    pub fn guard(&mut self, row: &Row) {
        self.guards.entry(row.id.clone()).or_insert(row.version);
    }
    pub fn put(&mut self, mut row: Row) {
        self.guard(&row);
        if row.data.get("revision").is_some() {
            row.data["revision"] = json!(row.version + 1);
        }
        self.writes.insert(row.id.clone(), row);
    }
    pub fn event(&mut self, actor: &str, kind: &str, resource: &str) {
        if !actor.is_empty() {
            self.events.push(json!({"id":uuid::Uuid::new_v4().to_string(),"actor":actor,"kind":kind,"resource_id":resource}));
        }
    }
}
#[derive(Serialize)]
pub struct ReceiptWrite {
    pub id: String,
    pub actor: String,
    pub operation: String,
    pub hash: String,
    pub resource_id: String,
}
pub fn db_fault(s: &str) -> Fault {
    if s.contains("CONFLICT")
        || s.contains("Transaction conflict")
        || s.contains("already contains")
        || s.contains("already exists")
    {
        Fault::new("conflict", "resource changed or request already applied")
    } else if s.contains("FORBIDDEN") {
        Fault::new("forbidden", "action is not permitted")
    } else if s.contains("VALIDATION") {
        Fault::invalid("database rejected the input")
    } else {
        tracing::error!(error = s, "database statement rejected");
        Fault::new("busy", "database operation failed")
    }
}
