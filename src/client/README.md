# Yessyfy client: Main + Vision

The v0.1.0 client upgrade contains two Svelte applications and one shared service-order runtime. Main serves customers; Vision contains collaborator work and operations tools. The accompanying server in `../server` now implements the matching client contract.

## Start

Use Node 24 and npm. From this directory:

```bash
npm ci
cp .env.example .env
npm run dev:main
# In a second terminal:
npm run dev:vision
```

Main opens at `http://127.0.0.1:5173`; Vision opens at `http://127.0.0.1:5174`. Both read the public `.env` in this directory. Configure actual Main/Vision origins and `VITE_YESSYFY_API_ORIGIN` before connecting a real service.

The service must implement the typed `ClientPort` contract documented in `docs/CLIENT_SERVICE_CONTRACT.md`. The default HTTP adapter posts to `/client/operations/<operation>`. The upgraded server implements this boundary and verifies it in native integration tests. Set the local API origin to `http://127.0.0.1:8080`; accept the deployed browser-to-server connection before production release. A missing connection produces a visible configuration state; it never starts a sample workflow.

## Run the complete client demonstration

The isolated fixture runs outside both application bundles. It holds shared synthetic state for all three participant roles. Changes disappear when its process restarts or its test reset endpoint is called.

```bash
# Terminal 1
npm run fixture
# Terminal 2
VITE_YESSYFY_API_ORIGIN=http://127.0.0.1:7777 VITE_YESSYFY_MAIN_ORIGIN=http://127.0.0.1:5173 VITE_YESSYFY_VISION_ORIGIN=http://127.0.0.1:5174 VITE_YESSYFY_ENVIRONMENT=local-fixture npm run dev:main
# Terminal 3
VITE_YESSYFY_API_ORIGIN=http://127.0.0.1:7777 VITE_YESSYFY_MAIN_ORIGIN=http://127.0.0.1:5173 VITE_YESSYFY_VISION_ORIGIN=http://127.0.0.1:5174 VITE_YESSYFY_ENVIRONMENT=local-fixture npm run dev:vision
```

Use separate browser profiles/private windows for simultaneous roles. Synthetic fixture phones:

| Role | Phone | Test verification code |
| --- | --- | --- |
| Customer | 5511111111 | 111111 |
| Collaborator | 5522222222 | 111111 |
| Operator | 5533333333 | 111111 |
| Second collaborator | 5544444444 | 111111 |

Book in Main. Open that order in Vision operations, issue an offer, accept it in the collaborator session, start transit/arrival, attach before/after photos, request review, accept the outcome in Main, and perform QA/financial reconciliation in operations. Payout remains pending until the service reports its confirmation.

The fixture listens on loopback. It is a test harness, not a deployment service.

## Validation

```bash
npm run build
npm run check
npm run test
npx playwright install chromium
npm run test:browser
```

`check` first generates the SvelteKit type definitions. Browser tests launch the fixture and both applications with explicit test configuration and shut them down afterward. An optional `PW_EXECUTABLE_PATH` supports a locally installed Chromium binary. The package lock pins the tested dependencies. Deno task wrappers (`deno task build`, `deno task check`, `deno task test`) invoke these same client commands.

Build artifacts are written to `apps/main/build` and `apps/vision/build`. Serve each application from its own origin with SPA fallback to `index.html`; configure CORS and public origins on the service. Deployment/publishing was not performed. The root and client Just recipes now invoke these npm commands directly. Former CLI source is retained for reference and is not required.

## Features

- Main: service catalog/detail, public collaborator directory, complete booking draft and service-supplied time windows, expiring quotation review, order history/detail, explicit additional-work approvals, outcome reviews, account/fiscal/address forms, inbox, support and warranties.
- Vision field: verification-document uploads, eligibility and availability, expiring offers, assigned jobs, execution, supplemental proposals, real camera/file evidence and payout history.
- Vision operations: queues, status board, manual dispatch, coordinate-backed map, order/conversation/evidence investigation, QA, financial reconciliation, cases, collaborator verification and 14 editable message drafts.
- Shared: verified sessions, validated DTOs, authoritative action availability, exact centavo formatting, account/resource-scoped drafts, immutable command identities, receipt recovery, cursor-based event polling, reconnect snapshots and durable IndexedDB photo queues.
- Presentation: responsive navigation, Spanish/English product dictionary, persisted light/dark themes, native dialog focus handling, scalable service icons and a keyboard-controlled before/after comparison.

## Source layout

| Path | Responsibility |
| --- | --- |
| `apps/main`, `apps/vision` | Thin route wrappers and app shells; 40 pages in total. |
| `sdk/core/src/product` | Service-domain DTOs, validation and monetary boundaries. |
| `sdk/api/src/product` | HTTP port with classified errors and controlled mutations. |
| `sdk/state/src/product` | Runtime ownership, sessions, requests, drafts, feed and media persistence. |
| `sdk/ui/src/product` | Feature views, navigation, dictionaries and product styling. |
| `tests/product` | Contract/runtime regressions. |
| `tests/browser` | Coordinated browser journeys and accessibility checks. |
| `tests/fixtures` | Stateful synthetic service; never imported by an app. |
| `tests/legacy-ui` | Preserved former sample page components for reference. |

Existing SDK primitives are retained. The active applications use the new product runtime rather than the old singleton demo stores. The legacy UI barrel no longer registers a chat sanitizer at import time, and its state-machine payout fallback now requires evidence.

See `docs/VALIDATION.md` for executed evidence and the remaining acceptance boundary. The agreed roadmap remains in `docs/UPGRADE_PLAN.md`. The 85-point label requires real-service integration acceptance; this handoff does not declare an unconditional production score.
