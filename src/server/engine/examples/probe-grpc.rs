//! Native integration probe consuming the canonical generated client, not handwritten DTOs.
use gwa_server::shared::contracts::system::{
    InvokeRequest, capabilities_client::CapabilitiesClient,
};
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = std::env::var("YESSYFY_TEST_GRPC")?;
    let token = std::env::var("YESSYFY_TEST_SESSION")?;
    let mut client = CapabilitiesClient::connect(format!("http://{address}")).await?;
    let mut request = tonic::Request::new(InvokeRequest {
        operation: "yessyfy.profile".into(),
        payload_json: "{}".into(),
    });
    request
        .metadata_mut()
        .insert("authorization", format!("Bearer {token}").parse()?);
    let profile: serde_json::Value =
        serde_json::from_str(&client.invoke(request).await?.into_inner().result_json)?;
    let denied = client
        .invoke(InvokeRequest {
            operation: "notify.send".into(),
            payload_json: "{}".into(),
        })
        .await
        .unwrap_err();
    if denied.code() != tonic::Code::Unauthenticated {
        return Err("missing credentials were not rejected".into());
    }
    println!(
        "{}",
        serde_json::json!({"profile":profile,"missing_auth":"unauthenticated"})
    );
    Ok(())
}
