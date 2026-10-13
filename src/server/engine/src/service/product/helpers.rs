use super::store::{Plan, Row};
use crate::shared::error::Fault;
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};
pub fn new_id() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}
pub fn now() -> String {
    Utc::now().to_rfc3339()
}
pub fn text(v: &Value, k: &str, min: usize, max: usize) -> Result<String, Fault> {
    let s = v[k]
        .as_str()
        .ok_or_else(|| Fault::invalid(format!("{k} must be text")))?
        .trim();
    if s.chars().count() < min || s.len() > max || s.contains('\0') {
        return Err(Fault::invalid(format!("invalid {k}")));
    }
    Ok(s.to_owned())
}
pub fn choice(v: &Value, k: &str, values: &[&str]) -> Result<String, Fault> {
    let s = text(v, k, 1, 100)?;
    if !values.contains(&s.as_str()) {
        return Err(Fault::invalid(format!("invalid {k}")));
    }
    Ok(s)
}
pub fn amount(v: &Value, k: &str) -> Result<u64, Fault> {
    v[k].as_u64()
        .filter(|n| *n <= 1_000_000_000_000)
        .ok_or_else(|| Fault::invalid(format!("{k} must be nonnegative bounded centavos")))
}
pub fn canonical(v: &Value) -> String {
    serde_json::to_string(v).expect("JSON value serializes")
}
pub fn expired(v: &Value) -> bool {
    v.as_str()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .is_none_or(|d| d <= Utc::now())
}
pub fn roles(v: &Value, role: &str) -> bool {
    v["roles"]
        .as_array()
        .is_some_and(|r| r.iter().any(|r| r == role))
}
pub fn is_ops(v: &Value) -> bool {
    roles(v, "operator") || roles(v, "admin")
}
pub fn require_ops(v: &Value) -> Result<(), Fault> {
    if !is_ops(v) {
        return Err(Fault::new("forbidden", "operations permission required"));
    }
    Ok(())
}
pub fn require_field(v: &Value) -> Result<(), Fault> {
    if !roles(v, "collaborator") || v["eligibility"] != "verified" {
        return Err(Fault::new("forbidden", "verified collaborator required"));
    }
    Ok(())
}
pub fn authorize(order: &Value, user: &Value) -> Result<(), Fault> {
    if order["customer_id"] != user["id"] && order["collaborator_id"] != user["id"] && !is_ops(user)
    {
        return Err(Fault::new("forbidden", "order access unavailable"));
    }
    Ok(())
}
pub fn revision(row: &Row, input: &Value) -> Result<(), Fault> {
    if input["expected_revision"].as_u64() != Some(row.version) {
        return Err(Fault::new("conflict", "reload the current revision"));
    }
    Ok(())
}
pub fn bump(row: &mut Row) {
    if row.data.get("revision").is_some() {
        row.data["revision"] = json!(row.version + 1);
    }
    row.data["updated_at"] = json!(now());
}
pub fn changed(row: &mut Row, user: &Value, kind: &str, message: &str) {
    bump(row);
    let e = json!({"id":new_id(),"kind":kind,"actor":user["name"],"at":now(),"text":message});
    if let Some(t) = row.data["timeline"].as_array_mut() {
        t.push(e);
    }
}
pub fn job(
    id: &str,
    kind: &str,
    payload: Value,
    owner: Option<&str>,
    order: Option<&str>,
) -> Result<Row, Fault> {
    Row::new(
        "business_job",
        id,
        json!({"id":id,"kind":kind,"payload":payload,"status":"queued","attempts":0,"next_at":now(),"lease_until":null,"lease_token":null,"error":null}),
        owner,
        order,
    )
}
pub fn date(v: &Value, k: &str) -> Result<String, Fault> {
    let s = text(v, k, 10, 10)?;
    let d =
        NaiveDate::parse_from_str(&s, "%Y-%m-%d").map_err(|_| Fault::invalid("invalid date"))?;
    let today = Utc::now()
        .with_timezone(&chrono_tz::America::Mexico_City)
        .date_naive();
    if d < today || d > today + chrono::Duration::days(365) {
        return Err(Fault::invalid("date outside scheduling window"));
    }
    Ok(s)
}
pub fn coordinates(v: &Value) -> Result<(), Fault> {
    if v.is_null() {
        return Ok(());
    }
    for (k, min, max) in [("lat", -90.0, 90.0), ("lng", -180.0, 180.0)] {
        let n = v[k]
            .as_f64()
            .ok_or_else(|| Fault::invalid("invalid coordinates"))?;
        if !n.is_finite() || n < min || n > max {
            return Err(Fault::invalid("coordinates outside bounds"));
        }
    }
    if let Some(a) = v.get("accuracy")
        && a.as_f64().is_none_or(|a| a < 0.0 || !a.is_finite())
    {
        return Err(Fault::invalid("invalid location accuracy"));
    }
    if let Some(at) = v.get("observed_at") {
        DateTime::parse_from_rfc3339(at.as_str().unwrap_or(""))
            .map_err(|_| Fault::invalid("invalid location time"))?;
    }
    Ok(())
}
pub fn validate_booking(b: &Value) -> Result<(), Fault> {
    text(b, "service_id", 1, 100)?;
    choice(b, "mode", &["fixed", "diagnostic"])?;
    choice(
        b,
        "category",
        &[
            "plomeria",
            "electricidad",
            "cerrajeria",
            "jardineria",
            "mantenimiento_hogar",
            "albanileria",
        ],
    )?;
    choice(b, "location_type", &["residencial", "comercial", "premium"])?;
    choice(b, "urgency", &["normal", "mismo_dia", "emergencia_24_7"])?;
    text(b, "description", 10, 5000)?;
    date(b, "date")?;
    choice(b, "slot", &["09-11", "11-13", "15-17"])?;
    if b["timezone"] != "America/Mexico_City" {
        return Err(Fault::invalid("unsupported timezone"));
    }
    text(&b["address"], "label", 0, 200)?;
    text(&b["address"], "street", 1, 500)?;
    text(&b["address"], "city", 1, 100)?;
    text(&b["address"], "access", 0, 1000)?;
    let p = text(&b["address"], "postal_code", 5, 5)?;
    if !p.bytes().all(|b| b.is_ascii_digit()) {
        return Err(Fault::invalid("invalid postal code"));
    }
    coordinates(&b["address"]["coordinates"])?;
    Ok(())
}
pub fn actions(o: &Value, u: &Value) -> Vec<&'static str> {
    let mut a = vec![];
    let status = o["status"].as_str().unwrap_or("");
    let customer = o["customer_id"] == u["id"];
    let field = o["collaborator_id"] == u["id"]
        && roles(u, "collaborator")
        && u["eligibility"] == "verified";
    if customer && !matches!(status, "completed" | "cancelled" | "disputed") {
        a.push("order.cancel");
    }
    if is_ops(u) && matches!(status, "pending_triage" | "dispatched") {
        a.push("dispatch.offer");
    }
    if field && status == "accepted" {
        a.push("order.start_transit");
    }
    if field && status == "in_transit" {
        a.extend(["order.arrive", "order.report_no_show"]);
    }
    if field && status == "in_progress" {
        a.push("order.propose");
        let e = o["evidence"].as_array();
        if e.is_some_and(|es| {
            es.iter().any(|e| e["phase"] == "diagnostic_before")
                && es.iter().any(|e| e["phase"] == "proof_finished")
        }) {
            a.push("order.request_review");
        }
    }
    if customer && status == "pending_quote_approval" {
        if !expired(&o["proposal"]["expires_at"]) {
            a.push("quote.approve");
        }
        a.push("quote.reject");
    }
    if customer && status == "pending_validation" && o["customer_review"] == "pending" {
        a.push("order.review");
    }
    if is_ops(u)
        && status == "pending_validation"
        && o["customer_review"] == "accepted"
        && o["qa"] == "pending"
    {
        a.extend(["qa.accept", "qa.reject"]);
    }
    if is_ops(u) && status == "validated" && o["qa"] == "accepted" {
        a.push("finance.reconcile");
    }
    a
}
pub fn require_action(o: &Value, u: &Value, a: &str) -> Result<(), Fault> {
    if !actions(o, u).contains(&a) {
        return Err(Fault::new(
            "forbidden",
            "action is unavailable for this role and state",
        ));
    }
    Ok(())
}
pub fn notify(
    plan: &mut Plan,
    user: &str,
    title: &str,
    body: &str,
    surface: &str,
    href: &str,
) -> Result<(), Fault> {
    let id = new_id();
    plan.put(Row::new("notice",&id,json!({"id":id,"revision":1,"title":title,"body":body,"at":now(),"read":false,"surface":surface,"href":href}),Some(user),None)?);
    plan.event(user, "inbox", &id);
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn qa_is_separate_from_customer_and_money() {
        let u = json!({"id":"ops","roles":["operator"]});
        let mut o = json!({"status":"pending_validation","customer_id":"customer","customer_review":"pending","qa":"pending"});
        assert!(!actions(&o, &u).contains(&"qa.accept"));
        o["customer_review"] = json!("accepted");
        assert!(actions(&o, &u).contains(&"qa.accept"));
        assert!(!actions(&o, &u).contains(&"finance.reconcile"));
    }
    #[test]
    fn safe_money_and_location() {
        assert!(amount(&json!({"n":-1}), "n").is_err());
        assert!(amount(&json!({"n":1.2}), "n").is_err());
        assert!(amount(&json!({"n":1_000_000_000_000_u64}), "n").is_ok());
        assert!(coordinates(&json!({"lat":200,"lng":0})).is_err());
    }
}
