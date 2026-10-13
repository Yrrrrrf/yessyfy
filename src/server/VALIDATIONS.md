# Yessyfy v0.1.0 validation record

Linux x86_64 source handoff. Native checks ran against the delivered implementation with real Rust, SurrealDB and Typst processes. Browser checks ran against the isolated client contract fixture. No deployment, repository push, production data change or live provider transaction was performed.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| Rust locked build and generated bindings | Passed | Rust 1.98.1; engine and generated gRPC probe example |
| Rust unit tests | 12 passed | Registry, config/provider constraints, shutdown/admission, errors, escaping, exact money/location, QA separation, cryptography and literal-date CBOR regression |
| Rust format and lint | Passed | `cargo fmt --check`, Clippy all targets with `-D warnings` |
| Deno format, lint and types | Passed | Deno 2.9.7; all integration/contract sources, frozen lock |
| Client Main and Vision builds | Passed | Both static SvelteKit builds |
| Client Svelte/TypeScript | Passed | Both apps, zero errors and warnings |
| Client unit tests | 28 passed | Domain, transport, runtime/privacy/media and legacy payout guard |
| Client browser journeys | 8 passed | Chromium 153; Main, Vision field and operations; desktop/mobile recovery and checked accessibility surfaces |
| Real server integration | 4 tests, 27 steps passed | Contract registry, main workflow, failure paths and four transport adapters; no skipped steps |
| Final Brand recipe regression | Passed | Workflow and contract tests rerun after the final localized document-label edit: 2 tests, 15 steps |
| Client/server contract identity | Passed | Exact 51-operation `YESSYFY-CLIENT/1` registry and matching TypeScript contract files |
| Native database baseline | Passed | Real SurrealDB 3.3.3; all current definitions, migrations and test fixtures initialized by the native harness |
| Runtime database principal | Passed | Database-scoped EDITOR with separate maintenance credentials; engine operation uses native CBOR RPC |
| Brand source/bundle | Passed | Actual Brand 0.0.1 source; manifest SHA-256 checks over recipes, upstream source and licensed fonts |
| PDF bytes and layout | Passed | Real Typst 0.15.0; report, warranty, commission invoice and withholding PDF generated; rendered pages inspected, development watermark and expected MXN totals checked |
| Root/client command surface | Passed | Root/submodule Just parsing and build dry-run; `client::check`, `server::lint`, `server::types` and `server::contracts` executed through the new entry points |
| Environment projection | Passed | Native Nushell development projection; local origins match Main 5173 and Vision 5174; generated secret-bearing state excluded from source |

The native suite uses isolated persistent SurrealKV storage, the real Rust engine, actual image/file bytes and a local provider simulator. It starts/stops its own processes and retains diagnostic state outside the deliverable. Browser tests use synthetic service data and the actual client HTTP adapter; they are separate evidence and are not presented as a browser session connected to the real server.

## Workflow evidence

The main native journey checks OTP/session ownership, authoritative quotes and complete booking intent, date-only string preservation, immutable receipts, competing offer acceptance, qualification/duty/assignment restrictions, revision conflicts, before/after evidence, scoped renew/read capabilities, supplemental quote identity/revision, chat/inbox/cursor scope, independent customer acceptance/QA/money outcomes, signed provider callbacks, immutable/conserved ledger postings, private fiscal recipients, all document families, warranty claims/case resolution, engine restart and URL revocation on logout.

The edge suite checks persisted OTP attempts/single use, public authentication with an expired saved token, qualification invalidation, real private verification uploads/review, decline/expiry, cancellation/recovery, forged or mismatched callback rejection and a queued database job surviving engine interruption. A valid 3.1 MB image tests the private media path beyond the ordinary JSON body limit. Transport tests cover the HTTP alias/canonical adapter, JSON-RPC IDs/permissions, WebSocket first-frame and live-session authentication, and the canonical generated Rust gRPC client.

QA/customer acceptance does not itself confirm capture or payout. Provider transport acceptance remains pending until a matching signed outcome is recorded. Fiscal provider tests use synthetic signatures/XML/UUIDs; no SAT or live PAC acceptance is claimed.

## Remaining release acceptance

| Area | Required work |
| --- | --- |
| Container images/lifecycle | Build both images on a functional Podman host; validate health/signals, permissions, retention, reset ownership and restart. These were not executed here. |
| Complete CI and dependency review | Run the complete `just ci` and container build gate; fresh cargo/npm/Deno audits and OCI/source provenance review remain pending. Individual checks above do not imply full CI passed. |
| Deployed client/server | Open Main and Vision against the real configured server from the intended origins; validate CORS, OTP delivery, private downloads and end-to-end asset loading. |
| Live providers | Implement/accept the documented SMS, finance and fiscal webhook adapters; verify real delivery, timeout/retry, callbacks, settlement and stamping. |
| Approved business content | Approve production prices, commission/withholding policy, warranty terms and privacy/legal text; demo rates/content are not a production policy. |
| Existing data | Back up and explicitly map any legacy unversioned data into the new model; no automatic legacy importer is supplied. Fresh initialization refuses existing domain tables. |
| Operations | Accept TLS, secret rotation, backup/restore, disk failures, realistic load and stale-lock recovery; local artifacts currently assume one engine with a durable volume. |
| Devices/browsers | Physical iOS/Android capture/upload recovery and Safari/Firefox remain untested; Chromium viewport checks cover the documented surfaces. |

The browser run emitted non-fatal SvelteKit preload-asset warnings during work-area navigation. All eight journeys passed; observe asset behavior on the intended deployment.

## Reproduce

Use the commands and binary prerequisites in `README.md`, then `cargo test --locked --manifest-path engine/Cargo.toml` and `deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-net=127.0.0.1 --allow-run tests`. Build the engine and gRPC example first. From the repository root, `just test` delegates to client units and this real native suite; `just browser` runs the isolated browser acceptance suite.

The source archive excludes build output, dependency installations, generated state, credentials and browser/native result directories. It includes the current source, lockfiles, contracts, licensed Brand/font bundle, native tests and setup/provider documentation. Original uploaded snapshots remain unchanged and separate from this upgraded handoff.
