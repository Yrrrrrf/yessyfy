# Yessyfy provider boundary

All provider calls refuse redirects and have bounded timeouts. Production endpoints require HTTPS. Callback/stamp signatures are base64url-without-padding HMAC-SHA256 using the configured provider key over `timestamp + "." + rawBodyBytes`. Transport timestamp/signature live in `x-yessyfy-timestamp` / `x-yessyfy-signature`; the timestamp must be within five minutes. Preserve raw response/request bytes when verifying.

## OTP

The webhook receives `{challenge_id, phone, code, expires_at}` and an `x-yessyfy-idempotency-key` derived from the durable job. Return a 2xx JSON `{status:"accepted", receipt:"provider-reference"}` only after acceptance. Acceptance does not mean handset delivery. Repeat the same key safely. Codes expire after five minutes; five incorrect verification attempts consume the challenge, and successful verification is single use.

## Payment and payout

The finance webhook receives kind, request/attempt ID, order ID, principal/destination reference, integer amount, action and `currency:"MXN"`. Payment actions are charge/refund; payout requests identify the collaborator. Resolve actual payment/bank instruments through the provider's authorized principal mapping. They are not supplied by browser fields.

A 2xx `{status:"accepted",receipt}` acknowledges admission only. Confirm the economic outcome by signed POST to `/providers/events`:

```json
{"event_id":"stable-provider-event","kind":"payment","resource_id":"attempt-id","status":"confirmed","receipt":"external-receipt","currency":"MXN","amount_cents":45000}
```

For payouts use kind `payout` and the payout ID. `failed` is also an explicit outcome. The server checks the stored request amount/currency and immutable event hash before changing states or appending ledger entries. Duplicate identical events return acknowledgement; changed bodies with the same event ID are rejected. Retrying a provider request must preserve its key and resend/replay the authoritative outcome. Do not translate network acknowledgement into settled money.

## Fiscal stamping

The fiscal webhook receives document/order identity, `cfdi_type` (`ingreso_comision` or `retencion_plataforma`), exact two-decimal total string, MXN, the recipient fiscal fields and supplied description. The producer selects the appropriate fee/withholding amount and fiscal recipient from authorized records. The document ID is the idempotency key; repeated calls must return the same issued record.

Return signed 2xx JSON with `status:"stamped"`, matching document_id/cfdi_type/currency/total/recipient_rfc, issuer_rfc, UUID, stamped_at, XML as base64 and its SHA-256. The server preserves XML and source snapshot, then renders the PDF using Brand. The provider is responsible for correct fiscal classification, issuer credentials, tax breakdown, XML conformance and actual PAC/SAT stamping. A generic successful HTTP response is insufficient.

`tests/helpers/runtime.ts` contains an explicitly synthetic local simulator. Its XML and receipts are test data and must not be connected as production providers. The engine has no simulator fallback.
