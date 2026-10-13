# Yessyfy server v0.1.0

GWA host structure, Yessyfy service capabilities and Brand 0.0.1 documents. The runtime consists of SurrealDB and one Rust engine. Main and Vision share the same server; Vision permissions distinguish collaborators from operations staff.

This replaces the supplied legacy GraphQL/item Rust workspace and Go RPC sidecar. It implements the upgraded client contract, rather than retaining the old item endpoints. The original client release identity remains 0.1.0; 0.0.1 identifies the vendored Brand package.

## Ownership

| Directory | Responsibility |
| --- | --- |
| config | Shared declarations, development/production profiles and canonical contracts |
| db/definitions | New immutable baseline: tables, typed controls, indexes, functions, events and boundaries |
| db/operations | Bootstrap, application migration ledger/lock and runtime-user provisioning |
| db/migrations | Append-only upgrades after this baseline |
| db/seeds | Explicit development/test fixtures; production does not install them |
| engine/src/api | HTTP, JSON-RPC, gRPC and authenticated WebSocket boundaries |
| engine/src/service/product | Actor/session checks, business commands, projections, database boundary, files and durable jobs |
| engine/src/shared | Configuration, errors, context, readiness, telemetry and shutdown |
| engine/src/worker | Bounded generic utility execution; business jobs are separately persisted in the database |
| engine/documents | Real Brand 0.0.1 source, pinned fonts, three Yessyfy recipes and a verified immutable manifest |
| tests/product | Real process integration: workflow, failure paths and transport parity |

There are 25 product/support SCHEMAFULL tables, plus migration metadata. Native owner/order references and versions are typed. Server-controlled DTO projections live inside flexible objects with additional typed business constraints. Clients cannot access SurrealDB directly. The engine authenticates as a database-scoped EDITOR; maintenance owns schema changes and user provisioning. Application authorization is enforced on each operation.

The database boundary uses CBOR with native SurrealDB tags, not a database SDK or duplicated ORM entities. Literal booking dates remain strings, timestamps are explicitly tagged, native record IDs are converted deliberately and every statement/commit result is checked.

## Native prerequisites and tests

Linux x86_64 was tested with Rust 1.98.1, SurrealDB 3.3.3, Typst 0.15.0 and Deno 2.9.7. `engine/rust-toolchain.toml` pins Rust and the formatter/linter. The Docker engine definition also pins the Typst archive hash. Install the corresponding binaries before running native integration tests.

From this directory:

```sh
cargo build --locked --manifest-path engine/Cargo.toml
cargo build --locked --manifest-path engine/Cargo.toml --examples
cargo test --locked --manifest-path engine/Cargo.toml
deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-net=127.0.0.1 --allow-run tests
```

The integration harness starts and stops its own real database and engine in isolated `.state/native-test-*` storage, invokes the real compiler and saves diagnostics/PDFs there. It uses a local test-only provider simulator. It never falls back to sample success in the production engine.

Optional environment variables select absolute binaries: `YESSYFY_SURREAL_BINARY`, `YESSYFY_TYPST_BINARY`, `YESSYFY_ENGINE_BINARY` and `YESSYFY_GRPC_PROBE`. `just test`, `just test product` and `just test-native` wrap the native checks when Just 1.57+ and Nushell 0.116.0 are installed. The source export does not include a Nix development environment.

## Development containers

Install functional Podman and podman-compose, Just, Nushell and Deno. Recipes invoke the native tools directly; no separate shared CLI/DV package is required. `config/server.toml` owns the toolchain versions.

```sh
just run
```

`run` rebuilds both images and resets only the explicitly named development database/artifact volumes. It initializes the baseline, installs development fixtures, provisions the separate engine user and starts the engine. `just stop` retains storage; `just start` rebuilds, verifies/migrates an initialized workspace and resumes it without resetting orders or files.

Yessyfy uses its own `yessyfy-dev`/`yessyfy-prod` project, images and volume names, so it does not reuse Openhaus's GWA image tags or volumes. Ports are published on loopback. Native tests and source checks passed; container image/lifecycle execution is still a release acceptance check in this environment.

Development fixture phones:

| Phone | Principal |
| --- | --- |
| 5511111111 | Customer |
| 5522222222 | Collaborator |
| 5544444444 | Second collaborator |
| 5533333333 | Operations |

Every login still requests and verifies a fresh random OTP. In development, delivery writes an actual private file under the artifact volume at `product/otp-spool/<challenge_id>.json`. This is a development spool, not an SMS delivery claim; the API never returns the code. Production requires the configured OTP webhook and forbids the file provider.

The default development finance/fiscal providers are disabled. Orders therefore retain pending financial outcomes, and invoice jobs report configuration failure until a provider is supplied. For a sandbox integration, set those provider modes to `webhook` in the development profile and configure their URLs. The test simulator is isolated inside the integration suite.

## Connect Main and Vision

Set the client's public `VITE_YESSYFY_API_ORIGIN` to `http://127.0.0.1:8080` locally. Both frontend origins must match the server's configured CORS origins. The client sends verified Bearer sessions to:

`POST /client/operations/<operation>`

Success is the raw contract DTO. Errors contain `kind` and `message` with meaningful 400/401/403/404/409/413/503/504 statuses. Timeouts or lost acknowledgements can be uncertain; use the immutable request key and `receipt` before deciding again. Public discovery/authentication operations remain usable with an expired stored token.

The 51-operation list and exact TypeScript contract are in `config/contracts/yessyfy/`. The delivered client/server copies are checked for drift. Other adapters invoke the same registered `yessyfy.<operation>` capabilities: canonical HTTP `/api/yessyfy/<operation>`, JSON-RPC `/rpc`, WebSocket `/ws` and the generated gRPC envelope. WebSocket authentication is the first JSON frame; live session checks run again for requests. Utility capabilities require the separate system API token, which is never a client credential.

## Workflow guarantees

- Booking preserves the complete address/access, service, category, mode, urgency, date/window/timezone and preferred professional. Quotes are server-priced and expire; creation consumes the exact quoted booking and reserves slot capacity transactionally.
- Principal-scoped immutable request receipts bind the operation and canonical input. Domain changes, receipts, feed/inbox writes and job intents commit together. Stale versions and reused keys with a different body are rejected.
- Offers expire, require matching verified/duty/trade/area/availability and assign one collaborator atomically. The MVP permits one active job per collaborator. Competing acceptance is tested.
- Work requires authorized progress and real before/finished evidence. Supplemental approval binds the displayed quote identity/revision; customer acceptance, QA, payment and payout remain independent.
- Uploads transfer actual bytes through scoped expiring PUT capabilities, preserve identity on renewal, validate MIME/content/dimensions/size/hash and attach separately. Private reads are scoped to a live session and current resource authorization. URLs are temporary bearer capabilities; keep them private. Logging records paths without query capabilities.
- Conversations, notices and principal cursor events are durable. Inbox data/cursor share a database snapshot. The current client polls the feed; WebSocket push is not required for that contract.
- Verified provider callbacks deduplicate by event/body, check currency/amount and append immutable double-entry postings. Account totals conserve value. A transport acknowledgement does not confirm money transfer.
- Cases, warranty issuance/claims and resolution are persisted. Financial completion issues the configured warranty; resolution records the actual decision rather than silently inventing a repair or transfer.
- Business jobs persist intents, leases, retry limits and outcomes across engine interruption. Generic `system.enqueue` jobs remain deliberately volatile; they are not the finance/document outbox.

## Brand and fiscal documents

`requestDocument` returns processing/ready/failed. The real Typst compiler validates a trusted Brand recipe and stages authorized evidence bytes in an isolated root. A ready document has stored PDF bytes, hashes and scoped access; no `stub-job-id` exists. Reports and warranties use supplied snapshots and exact monetary strings.

Invoices preserve Yessyfy's fiscal families: `ingreso_comision` uses the platform fee/customer fiscal identity; `retencion_plataforma` uses the withholding amount/collaborator identity. Fiscal documents are private to their recipient and operations. Requesting an existing family reuses its identity and does not issue a second fiscal record. A failed invoice job can be explicitly requested again with a new command key while retaining its original snapshot/provider identity.

The fiscal provider owns actual stamping and fiscal rules. The server validates its signed response against the requested family/recipient/currency/amount and stores the returned XML and UUID. It does not claim to validate SAT certificate chains or implement tax law. The configured demo fee/withholding basis points are examples, not an approved production tax policy. Brand performs display formatting, not tax calculations. Development PDFs carry a clear development watermark.

Edit server-owned Brand identity/tokens or recipes deliberately, then rebuild `bundle-manifest.json` with the corresponding SHA-256 hashes. Startup rejects drift, unsafe paths, symlinks or a compiler mismatch. See `engine/documents/README.md` and `PROVIDERS.md`.

## Production and data retention

Provide distinct secrets and HTTPS public/frontend/provider URLs using `config/env.example`. Product/runtime keys require at least 32 bytes, and system/maintenance credentials at least 24 characters. Production rejects development secrets and missing provider modes. The engine user is separate from maintenance and is provisioned by the canonical runtime-user operation.

Fresh accounts are customers. Collaborators/operators/admins are deliberately provisioned by maintenance; profile edits and verification do not self-grant roles or membership. Production installs no sample users or demo pricing. Load the approved service catalog and provision invited staff through maintenance before opening the apps.

`just deploy` defaults to retained-data `upgrade`. `deploy initialize` initializes an empty new namespace; `deploy reset` is a separately confirmed destructive action. Initialization refuses existing domain tables, migrations validate checksums/prefixes and upgrades do not run seeds. Do not edit an applied baseline.

This is a new baseline for the upgraded model, not an automatic import of an unversioned legacy namespace. Back up and map old user/order/financial data explicitly before migration. Legacy names, incomplete addresses and historical external outcomes cannot be invented. No deployed database or original upload was modified in this task.

Live provider acceptance, approved fiscal/pricing/warranty policy, TLS/secret rotation, OCI/container acceptance, backup/restore, realistic load and multi-instance storage are remaining deployment gates. Local artifacts assume a shared durable volume for one engine; distributed object storage is an intentional later adapter.

See `VALIDATIONS.md` for executed evidence and precise limits.
