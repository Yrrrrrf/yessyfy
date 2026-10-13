use super::{Principal, Product, helpers::*};
use crate::shared::error::Fault;
use serde_json::{Value, json};
impl Product {
    pub async fn discover(&self, op: &str, d: Value) -> Result<Value, Fault> {
        match op {
            "catalog" => Ok(json!(
                self.store
                    .list("service_catalog", "true", json!({}))
                    .await?
                    .into_iter()
                    .map(|r| r.data)
                    .collect::<Vec<_>>()
            )),
            "slots" => {
                let service = text(&d, "service_id", 1, 100)?;
                let service = self.store.require("service_catalog", &service).await?;
                let day = date(&d, "date")?;
                let city = text(&d, "city", 1, 100)?;
                if !coverage(&city, service.data["area"].as_str().unwrap_or("")) {
                    return Ok(json!([]));
                }
                let mut slots = vec![];
                for (id, label) in [
                    ("09-11", "09:00–11:00"),
                    ("11-13", "11:00–13:00"),
                    ("15-17", "15:00–17:00"),
                ] {
                    let key = slot_key(service.key(), &day, id, &city);
                    let r = self.store.get("service_slot", &key).await?;
                    let used = r
                        .map(|r| r.data["reserved"].as_u64().unwrap_or(8))
                        .unwrap_or(0);
                    slots.push(json!({"id":id,"label":label,"date":day,"timezone":"America/Mexico_City","available":used<8}));
                }
                Ok(json!(slots))
            }
            "collaborators" => {
                let mut values = vec![];
                for r in self
                    .store
                    .list(
                        "user",
                        "data.status='active' AND 'collaborator' IN data.roles",
                        json!({}),
                    )
                    .await?
                {
                    let u = r.data;
                    let v = public_collaborator(&u);
                    if d["category"].as_str().is_some_and(|c| {
                        !u["trades"]
                            .as_array()
                            .is_some_and(|t| t.iter().any(|t| t == c))
                    }) {
                        continue;
                    }
                    if d["area"].as_str().is_some_and(|area| {
                        !area.is_empty() && area != u["area"].as_str().unwrap_or("")
                    }) {
                        continue;
                    }
                    if d["available"] == true && v["available"] != true {
                        continue;
                    }
                    if let Some(s) = d["text"].as_str()
                        && !v["name"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&s.to_lowercase())
                    {
                        continue;
                    }
                    values.push(v);
                }
                Ok(json!(values))
            }
            _ => Err(Fault::new("not_found", "unknown discovery operation")),
        }
    }
    pub async fn profile_projection(
        &self,
        data: &Value,
        a: Option<&Principal>,
    ) -> Result<Value, Fault> {
        let mut p = json!({});
        for k in [
            "id",
            "name",
            "phone",
            "roles",
            "locale",
            "currency",
            "eligibility",
            "review_reason",
            "trades",
            "area",
            "vehicle",
            "fiscal",
            "addresses",
            "membership",
            "duty",
            "verification_documents",
        ] {
            if let Some(v) = data.get(k) {
                p[k] = v.clone();
            }
        }
        if let Some(a) = a {
            if p["id"] != a.id() && !is_ops(&a.user.data) {
                return Err(Fault::new("forbidden", "profile unavailable"));
            }
            if let Some(ds) = p["verification_documents"].as_array_mut() {
                for d in ds {
                    let key = d["asset_id"].as_str().unwrap_or("");
                    d["url"] = json!(self.read_url(key, a)?);
                }
            }
        } else if let Some(o) = p.as_object_mut() {
            o.remove("verification_documents");
        }
        Ok(p)
    }
    pub async fn order_projection(&self, data: &Value, a: &Principal) -> Result<Value, Fault> {
        authorize(data, &a.user.data)?;
        let mut v = data.clone();
        v["allowed_actions"] = json!(actions(&v, &a.user.data));
        if let Some(p) = v.get_mut("proposal") {
            p["allowed_actions"] = json!(if p["status"] == "pending"
                && data["customer_id"] == a.id()
                && !expired(&p["expires_at"])
            {
                vec!["quote.approve", "quote.reject"]
            } else {
                vec![]
            });
        }
        if let Some(es) = v["evidence"].as_array_mut() {
            for e in es {
                e["url"] = json!(self.read_url(e["id"].as_str().unwrap_or(""), a)?);
            }
        }
        if v.get("pass").is_some_and(|p| expired(&p["expires_at"])) {
            v.as_object_mut().unwrap().remove("pass");
        }
        if let Some(o) = v.as_object_mut() {
            o.remove("slot_key");
            o.remove("case_previous_status");
        }
        Ok(v)
    }
    pub async fn replay(&self, op: &str, result: Value, a: &Principal) -> Result<Value, Fault> {
        if [
            "createOrder",
            "acceptOffer",
            "progress",
            "propose",
            "decideQuote",
            "review",
            "qa",
            "cancelOrder",
            "reconcileFinance",
            "attachEvidence",
        ]
        .contains(&op)
        {
            let live = self
                .store
                .require("job_order", result["id"].as_str().unwrap_or(""))
                .await?;
            authorize(&live.data, &a.user.data)?;
            let mut v = self.order_projection(&result, a).await?;
            if live.data["revision"] != result["revision"] {
                v["allowed_actions"] = json!([]);
            }
            return Ok(v);
        }
        if [
            "updateProfile",
            "submitVerification",
            "duty",
            "attachVerification",
        ]
        .contains(&op)
        {
            let live = self
                .store
                .require("user", result["id"].as_str().unwrap_or(""))
                .await?;
            if live.key() != a.id() {
                require_ops(&a.user.data)?;
            }
            return self.profile_projection(&result, Some(a)).await;
        }
        if ["beginUpload", "renewUpload"].contains(&op) {
            let asset = self
                .store
                .require("media_asset", result["id"].as_str().unwrap_or(""))
                .await?;
            self.authorize_asset(&asset, a).await?;
            return self.upload_ticket(&asset);
        }
        if op == "completeUpload" {
            let asset = self
                .store
                .require("media_asset", result["asset_id"].as_str().unwrap_or(""))
                .await?;
            self.authorize_asset(&asset, a).await?;
        }
        if ["offer", "declineOffer"].contains(&op) {
            let r = self
                .store
                .require("dispatch_offer", result["id"].as_str().unwrap_or(""))
                .await?;
            if r.data["collaborator_id"] != a.id() {
                require_ops(&a.user.data)?;
            }
        }
        if [
            "createCase",
            "resolveCase",
            "requestDocument",
            "sendMessage",
        ]
        .contains(&op)
        {
            let order = self
                .store
                .require("job_order", result["order_id"].as_str().unwrap_or(""))
                .await?;
            authorize(&order.data, &a.user.data)?;
        }
        if op == "requestDocument" {
            let mut v = result;
            self.document_projection(&mut v, a)?;
            return Ok(v);
        }
        Ok(result)
    }
    pub async fn read(&self, op: &str, d: &Value, a: &Principal) -> Result<Option<Value>, Fault> {
        let u = &a.user.data;
        let actor = format!("user:{}", a.id());
        let result=match op{
  "previewQuote"=>self.preview_quote(d,a).await?,
  "session"|"profile"=>self.profile_projection(u,Some(a)).await?,
  "profiles"=>{require_ops(u)?;
let mut out=vec![];
for r in self.store.list("user","'collaborator' IN data.roles",json!({})).await?{out.push(self.profile_projection(&r.data,Some(a)).await?);
}json!(out)},
  "orders" => {
    let view=choice(d,"view",&["customer","field","ops"])?;

    if view=="ops" {require_ops(u)?;
} else if view=="field" {require_field(u)?;
}
    let page=d["page"].as_u64().unwrap_or(1).clamp(1,10000);

    let scope=if view=="ops" {"true"} else if view=="field" {"data.collaborator_id=$actor_id"} else {"data.customer_id=$actor_id"};

    let filter=format!("{scope} AND ($status='' OR data.status=$status) AND ($category='' OR data.booking.category=$category) AND ($urgency='' OR data.booking.urgency=$urgency) AND ($text='' OR string::contains(string::lowercase(data.code+' '+data.booking.description+' '+data.customer_name),$text))");

    let (rows,total)=self.store.order_page(&filter,json!({"actor_id":a.id(),"status":d["status"].as_str().unwrap_or(""),"category":d["category"].as_str().unwrap_or(""),"urgency":d["urgency"].as_str().unwrap_or(""),"text":d["text"].as_str().unwrap_or("").to_lowercase(),"page_limit":20,"page_offset":(page-1)*20})).await?;

    let mut out=vec![];

    for row in rows {out.push(self.order_projection(&row.data,a).await?);
}
    json!({"items":out,"page":page,"limit":20,"total":total,"has_more":page*20<total})
  },
  "order"=>{let r=self.store.require("job_order",&text(d,"id",1,100)?).await?;
self.order_projection(&r.data,a).await?},
  "offers"=>{require_field(u)?;
let rows=self.store.list("dispatch_offer","owner=type::record($actor)",json!({"actor":actor})).await?;
json!(rows.into_iter().map(|r|offer_projection(r.data)).collect::<Vec<_>>())},
  "candidates"=>{require_ops(u)?;
let r=self.store.require("job_order",&text(d,"order_id",1,100)?).await?;
let rows=self.store.list("user","'collaborator' IN data.roles AND data.status='active'",json!({})).await?;
json!(rows.into_iter().filter(|candidate|eligible(&candidate.data,&r.data)).map(|candidate|public_collaborator(&candidate.data)).collect::<Vec<_>>())},
  "cancelPreview"=>{let r=self.store.require("job_order",&text(d,"id",1,100)?).await?;
authorize(&r.data,u)?;
json!({"fee_cents":cancel_fee(&r.data),"reason":text(d,"reason",1,1000)?,"revision":r.version})},
  "conversation"|"documents"=>{let id=text(d,"order_id",1,100)?;
let order=self.store.require("job_order",&id).await?;
authorize(&order.data,u)?;
let table=if op=="conversation"{"conversation_message"}else{"document_request"};
let rows=self.store.list(table,"order_id=type::record($id)",json!({"id":format!("job_order:{id}")})).await?;
let mut out=vec![];
for r in rows{let mut v=r.data;
if op=="documents"{if self.authorize_document(&v,a).is_err(){continue;} self.document_projection(&mut v,a)?;
}out.push(v);
}out.reverse();
json!(out)},
  "inbox"=>{self.store.query("RETURN {items:(SELECT VALUE data FROM notice WHERE owner=type::record($actor) ORDER BY created_at DESC LIMIT 1000),cursor:((SELECT VALUE data.cursor FROM ONLY type::record('feed_head',$id)) ?? 0)};",json!({"actor":actor,"id":a.id()})).await?},
  "events"=>{let cursor=d["cursor"].as_u64().ok_or_else(||Fault::invalid("cursor required"))?;
let rows=self.store.list("feed_event","owner=type::record($actor) AND data.cursor>$cursor",json!({"actor":actor,"cursor":cursor})).await?;
let mut out=rows.into_iter().map(|r|r.data).collect::<Vec<_>>();
out.sort_by_key(|r|r["cursor"].as_u64().unwrap_or(0));
if out.first().is_some_and(|r|r["cursor"].as_u64().unwrap_or(0)>cursor+1){json!([{"cursor":out.last().unwrap()["cursor"],"kind":"gap"}])}else{json!(out)}},
  "cases"|"warranties"|"payouts"=>{if op=="payouts"&&!is_ops(u){require_field(u)?;
}let table=match op{"cases"=>"service_case","warranties"=>"warranty_certificate",_=>"payout"};
let rows=self.store.list(table,if is_ops(u){"true"}else{"owner=type::record($actor)"},json!({"actor":actor})).await?;
json!(rows.into_iter().map(|r|r.data).collect::<Vec<_>>())},
  "case"|"warranty"|"document"=>{let table=match op{"case"=>"service_case","warranty"=>"warranty_certificate",_=>"document_request"};
let r=self.store.require(table,&text(d,"id",1,100)?).await?;
let o=self.store.require("job_order",r.data["order_id"].as_str().unwrap_or("")).await?;
authorize(&o.data,u)?;
let mut v=r.data;
if op=="document"{self.document_projection(&mut v,a)?;
}v},
  "receipt"=>{let key=text(d,"request_key",1,100)?;
let key=super::crypto::hash(format!("{}:{key}",a.id()).as_bytes());
if let Some(r)=self.store.get("operation_receipt",&key).await?{let op=r.data["operation"].as_str().unwrap_or("");
json!({"operation":op,"result":self.replay(op,r.data["result"].clone(),a).await?})}else{Value::Null}},
  _=>return Ok(None)
 };

        Ok(Some(result))
    }
}
pub fn public_collaborator(u: &Value) -> Value {
    let count = u["rating_count"].as_u64().unwrap_or(0);
    json!({"id":u["id"],"name":u["name"],"trades":u["trades"],"area":u["area"],"rating":if count==0{0.0}else{u["rating_sum"].as_f64().unwrap_or(0.0)/count as f64},"completed":u["jobs_completed"].as_u64().unwrap_or(0),"verified":u["eligibility"]=="verified","available":u["duty"]==true&&u["eligibility"]=="verified"&&u["busy_order_id"].is_null(),"updated_at":u["updated_at"].as_str().unwrap_or("1970-01-01T00:00:00Z"),"bio":u["bio"].as_str().unwrap_or("")})
}
pub fn eligible(u: &Value, o: &Value) -> bool {
    u["status"] == "active"
        && roles(u, "collaborator")
        && u["eligibility"] == "verified"
        && u["duty"] == true
        && u["busy_order_id"].is_null()
        && u["trades"]
            .as_array()
            .is_some_and(|t| t.contains(&o["booking"]["category"]))
        && coverage(
            o["booking"]["address"]["city"].as_str().unwrap_or(""),
            u["area"].as_str().unwrap_or(""),
        )
}
pub fn coverage(city: &str, area: &str) -> bool {
    city.eq_ignore_ascii_case(area)
        || (area == "CDMX" && city.eq_ignore_ascii_case("Ciudad de México"))
}
pub fn slot_key(service: &str, date: &str, slot: &str, city: &str) -> String {
    super::crypto::hash(format!("{service}:{date}:{slot}:{}", city.to_lowercase()).as_bytes())
}
pub fn cancel_fee(o: &Value) -> u64 {
    if o["status"] == "in_transit" {
        15000
    } else {
        0
    }
}
pub fn offer_projection(mut o: Value) -> Value {
    if o["status"] == "pending" && expired(&o["expires_at"]) {
        o["status"] = json!("expired");
    }
    o["allowed_actions"] = json!(if o["status"] == "pending" {
        vec!["offer.accept", "offer.decline"]
    } else {
        vec![]
    });
    o
}
