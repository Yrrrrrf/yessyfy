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
    pub async fn request_otp(&self, input: Value) -> Result<Value, Fault> {
        let phone = text(&input, "phone", 10, 10)?;
        if !phone.bytes().all(|b| b.is_ascii_digit()) {
            return Err(Fault::invalid("enter a ten-digit phone number"));
        }
        let now = Utc::now();
        let mut plan = Plan::default();
        for (key, limit) in [(hash(phone.as_bytes()), 3), ("global".into(), 100)] {
            let mut r = self.store.get("otp_rate", &key).await?.unwrap_or(Row::new(
                "otp_rate",
                &key,
                json!({"count":0,"window":now.timestamp()}),
                None,
                None,
            )?);
            if now.timestamp() - r.data["window"].as_i64().unwrap_or(0) >= 60 {
                r.data["window"] = json!(now.timestamp());
                r.data["count"] = json!(0);
            }
            let count = r.data["count"].as_u64().unwrap_or(0);
            if count >= limit {
                return Err(Fault::new("busy", "verification requests are rate limited"));
            }
            r.data["count"] = json!(count + 1);
            plan.put(r);
        }
        let id = new_id();
        let code = format!("{:06}", rand::random_range(0..1_000_000));
        let expiry = (now + Duration::minutes(5)).to_rfc3339();
        let challenge = Row::new(
            "otp_challenge",
            &id,
            json!({"id":id,"phone":phone,"hash":self.secrets.sign(&format!("otp:{id}:{code}")),"expires_at":expiry,"used":false,"attempts":0}),
            None,
            None,
        )?;
        plan.put(challenge);
        let job_id = format!("otp_{id}");
        plan.put(job(
            &job_id,
            "otp",
            json!({"challenge_id":id,"phone":phone,"sealed":self.secrets.seal(&code)?}),
            None,
            None,
        )?);
        plan.result = json!({"challenge_id":id,"expires_at":expiry});
        self.store.commit(plan, None).await
    }
    pub async fn verify_otp(&self, input: Value) -> Result<Value, Fault> {
        let id = text(&input, "challenge_id", 1, 100)?;
        let code = text(&input, "code", 6, 6)?;
        let mut challenge = self.store.require("otp_challenge", &id).await?;
        if challenge.data["used"] == true
            || expired(&challenge.data["expires_at"])
            || challenge.data["attempts"].as_u64().unwrap_or(5) >= 5
        {
            return Err(Fault::invalid("incorrect or expired verification"));
        }
        if self
            .secrets
            .verify(
                &format!("otp:{id}:{code}"),
                challenge.data["hash"].as_str().unwrap_or(""),
            )
            .is_err()
        {
            let mut plan = Plan::default();
            challenge.data["attempts"] =
                json!(challenge.data["attempts"].as_u64().unwrap_or(0) + 1);
            plan.put(challenge);
            self.store.commit(plan, None).await?;
            return Err(Fault::invalid("incorrect or expired verification"));
        }
        let phone = challenge.data["phone"].as_str().unwrap_or("").to_owned();
        let rows = self
            .store
            .list("user", "data.phone=$phone", json!({"phone":phone}))
            .await?;
        let mut plan = Plan::default();
        let user = if let Some(u) = rows.into_iter().next() {
            if u.data["status"] != "active" {
                return Err(Fault::new("forbidden", "account unavailable"));
            }
            u
        } else {
            let key = new_id();
            let u = Row::new(
                "user",
                &key,
                json!({"id":key,"name":"Nuevo cliente","phone":phone,"roles":["customer"],"locale":"es","currency":"MXN","eligibility":"unsubmitted","trades":[],"area":"","vehicle":"","fiscal":{"rfc":"","name":"","postal_code":"","regime":"","use":""},"addresses":[],"membership":{"active":false},"duty":false,"status":"active","busy_order_id":null}),
                None,
                None,
            )?;
            plan.put(u.clone());
            u
        };
        plan.guard(&user);
        challenge.data["used"] = json!(true);
        challenge.data["attempts"] = json!(challenge.data["attempts"].as_u64().unwrap_or(0) + 1);
        plan.put(challenge);
        let token = format!("{}{}", new_id().replace('-', ""), new_id().replace('-', ""));
        let token_hash = hash(token.as_bytes());
        let expires = (Utc::now() + Duration::hours(24)).to_rfc3339();
        plan.put(Row::new(
            "session",
            &token_hash,
            json!({"expires_at":expires,"revoked":false,"user_id":user.key()}),
            Some(user.key()),
            None,
        )?);
        plan.result =
            json!({"token":token,"profile":self.profile_projection(&user.data,None).await?});
        self.store.commit(plan, None).await
    }
    pub async fn authenticate(&self, token: &str) -> Result<Principal, Fault> {
        if token.len() < 40 || token.len() > 200 {
            return Err(Fault::new("unauthorized", "session required"));
        }
        let key = hash(token.as_bytes());
        let session = self
            .store
            .get("session", &key)
            .await?
            .ok_or_else(|| Fault::new("unauthorized", "session expired"))?;
        if session.data["revoked"] == true || expired(&session.data["expires_at"]) {
            return Err(Fault::new("unauthorized", "session expired"));
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
    pub async fn logout(&self, actor: &Principal) -> Result<Value, Fault> {
        let mut plan = actor.plan();
        let mut session = actor.session.clone();
        session.data["revoked"] = json!(true);
        plan.put(session);
        plan.result = json!({"confirmed":true});
        self.store.commit(plan, None).await
    }
}
