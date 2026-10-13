use crate::shared::error::Fault;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce, aead::Aead};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
#[derive(Clone)]
pub struct Secrets {
    signing: Vec<u8>,
    jobs: [u8; 32],
    provider: Vec<u8>,
}
impl Secrets {
    pub fn new(sign: &str, jobs: &str, provider: &str) -> Result<Self, Fault> {
        for s in [sign, jobs, provider] {
            if s.len() < 32 {
                return Err(Fault::invalid("product secrets require at least 32 bytes"));
            }
        }
        if sign == jobs || sign == provider || jobs == provider {
            return Err(Fault::invalid("product keys must be distinct"));
        }
        Ok(Self {
            signing: sign.as_bytes().to_vec(),
            jobs: Sha256::digest(jobs.as_bytes()).into(),
            provider: provider.as_bytes().to_vec(),
        })
    }
    fn mac(key: &[u8], bytes: &[u8]) -> Hmac<Sha256> {
        let mut m = <Hmac<Sha256> as Mac>::new_from_slice(key).expect("HMAC accepts any key");
        m.update(bytes);
        m
    }
    pub fn sign(&self, text: &str) -> String {
        URL_SAFE_NO_PAD.encode(
            Self::mac(&self.signing, text.as_bytes())
                .finalize()
                .into_bytes(),
        )
    }
    pub fn verify(&self, text: &str, signature: &str) -> Result<(), Fault> {
        Self::mac(&self.signing, text.as_bytes())
            .verify_slice(
                &URL_SAFE_NO_PAD
                    .decode(signature)
                    .map_err(|_| Fault::new("forbidden", "invalid capability"))?,
            )
            .map_err(|_| Fault::new("forbidden", "invalid capability"))
    }
    pub fn sign_provider(&self, bytes: &[u8]) -> String {
        URL_SAFE_NO_PAD.encode(Self::mac(&self.provider, bytes).finalize().into_bytes())
    }
    pub fn verify_provider(&self, bytes: &[u8], signature: &str) -> Result<(), Fault> {
        Self::mac(&self.provider, bytes)
            .verify_slice(
                &URL_SAFE_NO_PAD
                    .decode(signature)
                    .map_err(|_| Fault::new("forbidden", "invalid provider signature"))?,
            )
            .map_err(|_| Fault::new("forbidden", "invalid provider signature"))
    }
    pub fn seal(&self, value: &str) -> Result<String, Fault> {
        let nonce: [u8; 12] = rand::random();
        let c = Aes256Gcm::new_from_slice(&self.jobs).map_err(Fault::internal)?;
        let bytes = c
            .encrypt(Nonce::from_slice(&nonce), value.as_bytes())
            .map_err(Fault::internal)?;
        Ok(format!(
            "{}.{}",
            URL_SAFE_NO_PAD.encode(nonce),
            URL_SAFE_NO_PAD.encode(bytes)
        ))
    }
    pub fn open(&self, value: &str) -> Result<String, Fault> {
        let (n, b) = value
            .split_once('.')
            .ok_or_else(|| Fault::internal("invalid encrypted job"))?;
        let n = URL_SAFE_NO_PAD.decode(n).map_err(Fault::internal)?;
        if n.len() != 12 {
            return Err(Fault::internal("invalid job nonce"));
        }
        let bytes = Aes256Gcm::new_from_slice(&self.jobs)
            .map_err(Fault::internal)?
            .decrypt(
                Nonce::from_slice(&n),
                URL_SAFE_NO_PAD
                    .decode(b)
                    .map_err(Fault::internal)?
                    .as_slice(),
            )
            .map_err(Fault::internal)?;
        String::from_utf8(bytes).map_err(Fault::internal)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sealed_jobs_and_scoped_signatures() {
        let s = Secrets::new(&"a".repeat(32), &"b".repeat(32), &"c".repeat(32)).unwrap();
        let b = s.seal("private-code").unwrap();
        assert!(!b.contains("private-code"));
        assert_eq!(s.open(&b).unwrap(), "private-code");
        let sig = s.sign("order:a");
        assert!(s.verify("order:a", &sig).is_ok());
        assert!(s.verify("order:b", &sig).is_err());
    }
}
