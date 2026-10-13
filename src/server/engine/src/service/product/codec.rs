//! Preserve literal DTO strings; explicitly tag native timestamps at the database boundary.
use crate::shared::error::Fault;
use ciborium::value::Value as Cbor;
use serde_json::Value;
pub fn encode(value: &Value) -> Result<Vec<u8>, Fault> {
    let v = into_cbor(value, None)?;
    let mut bytes = vec![];
    ciborium::ser::into_writer(&v, &mut bytes).map_err(Fault::internal)?;
    Ok(bytes)
}
fn into_cbor(v: &Value, key: Option<&str>) -> Result<Cbor, Fault> {
    Ok(match v {
        Value::Null => Cbor::Null,
        Value::Bool(b) => Cbor::Bool(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Cbor::Integer(i.into())
            } else if let Some(i) = n.as_u64() {
                Cbor::Integer(i.into())
            } else {
                Cbor::Float(n.as_f64().ok_or_else(|| Fault::invalid("invalid number"))?)
            }
        }
        Value::String(s) => {
            let temporal = key.is_some_and(|k| {
                [
                    "now",
                    "created_at",
                    "updated_at",
                    "next_at",
                    "lease_until",
                    "at",
                    "received_at",
                    "expires_at",
                    "observed_at",
                    "captured_at",
                    "stamped_at",
                    "starts_at",
                    "ends_at",
                ]
                .contains(&k)
            });
            if temporal && chrono::DateTime::parse_from_rfc3339(s).is_ok() {
                Cbor::Tag(0, Box::new(Cbor::Text(s.clone())))
            } else {
                Cbor::Text(s.clone())
            }
        }
        Value::Array(v) => Cbor::Array(
            v.iter()
                .map(|v| into_cbor(v, None))
                .collect::<Result<_, _>>()?,
        ),
        Value::Object(m) => Cbor::Map(
            m.iter()
                .map(|(k, v)| Ok((Cbor::Text(k.clone()), into_cbor(v, Some(k))?)))
                .collect::<Result<_, Fault>>()?,
        ),
    })
}
pub fn decode(bytes: &[u8]) -> Result<Value, Fault> {
    let v: Cbor = ciborium::de::from_reader(bytes).map_err(Fault::internal)?;
    from_cbor(v)
}
fn from_cbor(v: Cbor) -> Result<Value, Fault> {
    Ok(match v {
        Cbor::Null => Value::Null,
        Cbor::Bool(v) => Value::Bool(v),
        Cbor::Text(v) => Value::String(v),
        Cbor::Integer(v) => {
            let n: i128 = v.into();
            if n >= 0 {
                serde_json::json!(u64::try_from(n).map_err(Fault::internal)?)
            } else {
                serde_json::json!(i64::try_from(n).map_err(Fault::internal)?)
            }
        }
        Cbor::Float(v) => Value::Number(
            serde_json::Number::from_f64(v)
                .ok_or_else(|| Fault::internal("nonfinite DB number"))?,
        ),
        Cbor::Array(v) => Value::Array(v.into_iter().map(from_cbor).collect::<Result<_, _>>()?),
        Cbor::Map(v) => {
            let mut m = serde_json::Map::new();
            for (k, v) in v {
                let Cbor::Text(k) = k else {
                    return Err(Fault::internal("non-text DB object key"));
                };
                m.insert(k, from_cbor(v)?);
            }
            Value::Object(m)
        }
        Cbor::Tag(6, _) => Value::Null,
        Cbor::Tag(8, v) => {
            let Cbor::Array(v) = *v else {
                return Err(Fault::internal("invalid native record ID"));
            };
            if v.len() != 2 {
                return Err(Fault::internal("invalid native record ID"));
            }
            let a = from_cbor(v[0].clone())?;
            let b = from_cbor(v[1].clone())?;
            Value::String(format!(
                "{}:{}",
                a.as_str().ok_or_else(|| Fault::internal("invalid table"))?,
                b.as_str()
                    .map(str::to_owned)
                    .unwrap_or_else(|| b.to_string())
            ))
        }
        Cbor::Tag(12, v) => {
            let Cbor::Array(v) = *v else {
                return Err(Fault::internal("invalid native datetime"));
            };
            let seconds = from_cbor(
                v.first()
                    .cloned()
                    .ok_or_else(|| Fault::internal("invalid datetime"))?,
            )?
            .as_i64()
            .ok_or_else(|| Fault::internal("invalid datetime seconds"))?;
            let nanos = v
                .get(1)
                .cloned()
                .map(from_cbor)
                .transpose()?
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let d = chrono::DateTime::from_timestamp(
                seconds,
                u32::try_from(nanos).map_err(Fault::internal)?,
            )
            .ok_or_else(|| Fault::internal("datetime out of range"))?;
            Value::String(d.to_rfc3339())
        }
        Cbor::Tag(37, v) => {
            let Cbor::Bytes(v) = *v else {
                return Err(Fault::internal("invalid UUID"));
            };
            Value::String(
                uuid::Uuid::from_slice(&v)
                    .map_err(Fault::internal)?
                    .to_string(),
            )
        }
        Cbor::Tag(0, v) | Cbor::Tag(9, v) | Cbor::Tag(10, v) => from_cbor(*v)?,
        _ => return Err(Fault::internal("unsupported native database value")),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dates_and_code_like_names_remain_literal() {
        let v = serde_json::json!({"date":"2026-10-13","name":"2026-10-13","next_at":"2026-10-13T00:00:00Z","amount_cents":100000000001_u64});
        let b = encode(&v).unwrap();
        let c: Cbor = ciborium::de::from_reader(b.as_slice()).unwrap();
        let Cbor::Map(m) = c else { panic!() };
        assert!(
            m.iter()
                .any(|(k, v)| k == &Cbor::Text("date".into())
                    && v == &Cbor::Text("2026-10-13".into()))
        );
        assert!(
            m.iter()
                .any(|(k, v)| k == &Cbor::Text("next_at".into()) && matches!(v, Cbor::Tag(0, _)))
        );
    }
}
