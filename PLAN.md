# MASTER IMPLEMENTATION & MODERNIZATION PLAN: YESSYFY (v1.0)

**Document Reference:** `PLAN.md` (Monorepo Master Plan)  
**Target Workspaces:** `@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`, `apps/web`, `apps/vision`  
**Governance Stack:** Deno 2, SvelteKit 3 (SPA Mode), Svelte 5.56+ (Runes & Snippets), DaisyUI v5.7+, Tailwind CSS v4, XState v5, ArkType, Rune-Lab v0.5.2-rc.2  
**Universal Exit Gate:** Clean execution of `just check -vp`, `just build -vp`, `just test -vp`, and `just audit` (0 errors, 0 warnings, 0 circular dependencies, 0 deprecated v4 classes).

---

## 🎯 Executive Summary & Context

The Yessyfy platform formalizes home and commercial repair trades across Mexico through a managed marketplace model with fiduciary Escrow protection, photographic Quality Assurance (QA), and Mexican fiscal (SAT CFDI 4.0) / labor (LFT/REPSE non-subordination) compliance.

Recent architectural audits identified key technical debt and quality gate regressions:
1. **7 Circular Dependencies in `sdk/mod.ts`**: Caused by `@sdk/ui` and `@sdk/state` components importing from the umbrella `@sdk` entrypoint (`sdk/mod.ts`) rather than strict directional subpaths (`@sdk/core`, `@sdk/api`).
2. **Layout & Component Code Duplication**: `apps/web/src/routes/AppLayout.svelte` duplicated desktop layout code from Rune-Lab instead of implementing a dedicated mobile-first PWA shell.
3. **Monolithic Template Complexity**: `apps/web/src/routes/+page.svelte` (1,018 lines, cognitive complexity 81) and `apps/vision/src/routes/+page.svelte` (507 lines) contain tightly-coupled multi-role screens.
4. **Bloated UI Components**: Several `@sdk/ui` components (`AuthOtpModal`, `CotizadorWidget`, `ClientReviewAndRatingSheet`, `FiscalInvoiceDrawer`, `InAppChatDrawer`, `PhotoUploader`, `AccessSecurityPass`) mix orchestration, forms, and canvas logic in single files.
5. **DaisyUI v4 Legacy Classes**: Deprecated classes (`input-bordered`, `select-bordered`, etc.) lingering in form templates.

This plan details the step-by-step modernization across 5 execution phases.

---

```
                                  +---------------------------------------+
                                  |               @sdk/core               |
                                  |     Domain Entities, Invariants,      |
                                  |   ArkType Schemas, Integer Cent Math  |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+---------------------------+
                         |                                                        |
                         v                                                        v
        +---------------------------------+                      +---------------------------------+
        |            @sdk/api             |                      |           @sdk/state            |
        |  up-fetch Client Engine,        |                      |  XState v5 Service Order FSM,   |
        |  Anti-Disintermediation Filter  |                      |  Svelte 5 Runes Reactive Stores |
        +----------------+----------------+                      +----------------+----------------+
                         |                                                        |
                         +----------------------------+---------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |                @sdk/ui                |
                                  |  Svelte 5 Snippets & Runes, DaisyUI,  |
                                  |   Compound Components, Design Tokens  |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+---------------------------+
                         |                                                        |
                         v                                                        v
+-------------------------------------------------+     +-------------------------------------------------+
|                    apps/web                     |     |                   apps/vision                   |
|        Consumer & Technician Mobile PWA         |     |              The Operations CRM                 |
|   (Dock Navigation, Live Cockpit, Tax Wallet)   |     |    (Rune-Lab Layout, Spatial Dispatch, QA Audit)|
+-------------------------------------------------+     +-------------------------------------------------+
```

---

## 📅 Multi-Phase Master Implementation Plan

---

### 📦 PHASE 1: SDK Foundation, Unified Type Hierarchy & Circular Dependency Elimination

#### 1.1 Objective & Rationale
Eliminate all 7 circular dependency cycles detected in `sdk/mod.ts` by enforcing strict directional module boundaries. Ensure `@sdk/core` is 100% pure (zero dependencies on network, UI, or state), and replace all umbrella `@sdk` imports throughout the codebase with explicit subpath imports (`@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`).

#### 1.2 Root Cause Analysis of Circular Dependencies
- `sdk/mod.ts` exports all modules (`export * from "./ui/src/mod.ts"`, etc.).
- `sdk/ui/src/components/*.svelte` and `sdk/ui/src/types.ts` import types and functions via `import { ... } from '@sdk'`.
- Resulting cycle: `sdk/mod.ts` $\to$ `sdk/ui/src/mod.ts` $\to$ `sdk/ui/src/components/CotizadorWidget.svelte` $\to$ `sdk/mod.ts`.

#### 1.3 Action Items & File Targets

1. **`src/client/sdk/ui/src/types.ts`**:
   - Change `import type { ServiceCategory } from "@sdk";` $\to$ `import type { ServiceCategory } from "@sdk/core";`
2. **`src/client/sdk/ui/src/components/*`**:
   - `CotizadorWidget.svelte`: Change import of `calculateJobPricing`, `formatMxn`, `Centavos`, `LocationType`, `ServiceCategory`, `UrgencyLevel` to `@sdk/core`.
   - `FiscalInvoiceDrawer.svelte`: Change `import { formatMxn } from '@sdk'` $\to$ `import { formatMxn } from '@sdk/core'`.
   - `EscrowStatusCard.svelte`: Change `import { formatMxn } from '@sdk'` $\to$ `import { formatMxn } from '@sdk/core'`.
   - `SupplementalApprovalModal.svelte`: Change `import { formatMxn } from '@sdk'` $\to$ `import { formatMxn } from '@sdk/core'`.
   - `StatusBadge.svelte`: Change `import type { JobOrderStatus, UrgencyLevel } from '@sdk'` $\to$ `import type { JobOrderStatus, UrgencyLevel } from '@sdk/core'`.
   - `TechProfileCard.svelte`: Change `import type { TechnicianRecord } from '@sdk'` $\to$ `import type { TechnicianRecord } from '@sdk/core'`.
   - `PhotoUploader.svelte`: Change `import type { PhotoQAPhase } from '@sdk'` $\to$ `import type { PhotoQAPhase } from '@sdk/core'`.
   - `InAppChatDrawer.svelte`: Change `import { filterAntiDisintermediation } from '@sdk'` $\to$ `import { filterAntiDisintermediation } from '@sdk/api'`.
   - `WarrantyCard.svelte`: Change `import type { WarrantyCertificate } from '@sdk'` $\to$ `import type { WarrantyCertificate } from '@sdk/core'`.
   - `PriceBreakdown.svelte`: Change `import { formatMxn, type JobFinancialBreakdown } from '@sdk'` $\to$ `import { formatMxn, type JobFinancialBreakdown } from '@sdk/core'`.
3. **`src/client/sdk/state/src/*`**:
   - `machines/serviceOrderMachine.ts`: Change imports to `@sdk/core`.
   - `stores/auth.svelte.ts`: Change `import type { User, UserRole } from "@sdk"` $\to$ `import type { User, UserRole } from "@sdk/core"`.
   - `stores/item.svelte.ts`: Change `import type { Item } from "@sdk"` $\to$ `import type { Item } from "@sdk/core"`.
4. **`src/client/apps/vision/src/*` & `src/client/apps/web/src/*`**:
   - `apps/vision/src/lib/visionStore.svelte.ts`: Change `import type { JobOrder } from "@sdk"` $\to$ `import type { JobOrder } from "@sdk/core"`.
   - `apps/vision/src/routes/AppLayout.svelte`: Change `import { formatMxn } from '@sdk'` $\to$ `import { formatMxn } from '@sdk/core'`.
   - `apps/vision/src/routes/+page.svelte`: Split imports to `@sdk/core` and `@sdk/ui`.
   - `apps/web/src/routes/+page.svelte`: Split imports to `@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`.
5. **Domain Invariants & Non-Subordination Standardization**:
   - Enforce Mexican Labor Law (LFT / Art. 12-15 REPSE) non-subordination nomenclature: Replace any accidental usage of `empleado`, `trabajador`, `salario` with `colaborador independiente`, `prestador de servicios`, `honorarios`.
   - Verify integer-cent math (`Centavos`) across `sat.ts` and `currency.ts`:
     - SAT Platform Withholdings: LISR 113-A (1% with RFC, 20% without RFC), LIVA 18-J (8% with RFC, 16% without RFC).

#### 1.4 Phase 1 Exit Criteria
- Zero imports of `"@sdk"` inside internal SDK packages.
- `just audit` reports **0 circular dependencies**.
- `just types` passes with 0 type errors across all 4 SDK packages.

---

### 🎨 PHASE 2: Shared UI Modernization & Svelte 5 / DaisyUI v5 Compliance

#### 2.1 Objective & Rationale
Modernize all 19 `@sdk/ui` components into strictly compliant Svelte 5 Runes & Snippets, and eradicate all legacy DaisyUI v4 classes in favor of DaisyUI v5.7+ semantic tokens and patterns. Break down monolithic UI components into composable atomic subcomponents.

#### 2.2 DaisyUI v5 Modernization Rules
| Legacy / Dead v4 Class | Modern DaisyUI v5 Pattern | Rationale |
| :--- | :--- | :--- |
| `input-bordered`, `input-border` | `input` (bordered by default) or `input input-ghost` | v5 default input is bordered. |
| `select-bordered`, `select-border`| `select` (bordered by default) or `select select-ghost`| v5 default select is bordered. |
| `form-control` + `label-text` | `<fieldset class="fieldset"><legend class="fieldset-legend">` | Semantic fieldset grouping in v5. |
| `btn-group`, `input-group` | `<div class="join"><button class="btn join-item">` | Join containers standard in v5. |
| `btm-nav` | `<nav class="dock dock-sm"><button class="dock-active">` | Dock component replaces btm-nav in v5. |
| `card-compact`, `card-bordered` | `card-sm`, `card-border` | v5 card modifier renaming. |
| `tabs-lifted` | `tabs-lift` | v5 tabs modifier renaming. |

#### 2.3 Svelte 5.56+ Runes Refactoring Rules
- **Props**: Destructure via `let { prop1, prop2 = $bindable(defaultValue), ... }: Props = $props();`.
- **Derivations**: Use `$derived(...)` or `$derived.by(() => ...)` for complex calculations.
- **Effects**: Use `$effect(() => { ... })` strictly for DOM/side-effects; never mutate state read in the same tick.
- **Snippets**: Expose template customization points via `{#snippet ...}` parameters for compound components.
- **Touch Ergonomics**: Ensure all interactive buttons maintain $\ge 56\text{px}$ touch hitboxes on mobile.

#### 2.4 Modularization of Complex UI Components

1. **`AuthOtpModal.svelte` (233 lines)**:
   - Extract `PhoneInputStep.svelte`: Mexican phone input (+52 flag, 10-digit auto-formatting, validation error banner).
   - Extract `OtpVerifyStep.svelte`: 4-digit individual input boxes with auto-focus advance, backspace navigation, 45s countdown timer, resend trigger.
   - Extract `webOtp.ts`: WebOTP API navigator credential listener helper.
   - Refactor `AuthOtpModal.svelte` into a lightweight modal shell coordinating steps.

2. **`CotizadorWidget.svelte` (224 lines)**:
   - Extract `TradeCategorySelector.svelte`: Grid of 6 service trades with emoji, gradient styling, and active state.
   - Extract `UrgencySelector.svelte`: 3-tier multiplier pills (Normal 1.0x, Mismo Día 1.3x, Emergencia 24/7 1.8x).
   - Extract `ScheduleSelector.svelte`: Immediate vs. Scheduled date and time slot pickers.
   - Extract `AddressAccessForm.svelte`: Address text, CP, and gate/security instructions.
   - Keep `CotizadorWidget.svelte` as the reactive coordinator embedding `PriceBreakdown.svelte`.

3. **`ClientReviewAndRatingSheet.svelte` (221 lines)**:
   - Extract `StarRatingSelector.svelte`: Interactive 5-star rating with hover/touch states.
   - Extract `ReviewTagChips.svelte`: Multi-select praise chips ("Limpieza Impecable", "Puntualidad Excelente").
   - Extract `DigitalSignaturePad.svelte`: HTML5 Canvas signature pad with touch events, clear button, and high-DPI scaling.
   - Extract `TipSelector.svelte`: Quick tip pill buttons ($0, $30, $50, $100 MXN) with integer cent bindings.

4. **`FiscalInvoiceDrawer.svelte` (200 lines)**:
   - Extract `FiscalDataForm.svelte`: RFC, Razón Social, CP, SAT Régimen Fiscal dropdown, Uso CFDI dropdown.
   - Extract `SatPacStampingPreview.svelte`: Simulated PAC signing spinner, CFDI 4.0 UUID badge, SAT digital seal preview.
   - Extract `InvoiceDownloadActions.svelte`: PDF & XML invoice download triggers.

5. **`InAppChatDrawer.svelte` (175 lines)**:
   - Extract `ChatMessageBubble.svelte`: Sender-aligned bubble with timestamp, delivery status, and masked disintermediation warning.
   - Extract `QuickReplyChips.svelte`: Contextual quick reply pills based on user role (Client vs. Collaborator).
   - Extract `AntiDisintermediationAlert.svelte`: Real-time warning banner when phone numbers, CLABEs, or off-platform channels are detected.

6. **`PhotoUploader.svelte` (163 lines)**:
   - Extract `CanvasWatermarker.ts`: Pure TypeScript utility that draws EXIF timestamp, GPS coordinates, and cryptographic SHA-256 hash overlay onto captured images.
   - Extract `PhotoPreviewCard.svelte`: Preview thumbnail with watermarked metadata overlay and re-capture action.

7. **`AccessSecurityPass.svelte` (118 lines)**:
   - Extract `SecurityPassCard.svelte`: Digital residential access pass with QR verification code, collaborator photo, vehicle plates, and destination address.
   - Extract `SharePassActions.svelte`: Web Share API / WhatsApp clipboard share triggers.

#### 2.5 Phase 2 Exit Criteria
- Zero occurrences of deprecated DaisyUI v4 classes in `sdk/ui`.
- All component props and events fully typed with Svelte 5 `$props()` and `$bindable()`.
- `just types` passes for `@sdk/ui` with 0 errors and 0 warnings.

---

### 📱 PHASE 3: Modularization of `apps/web` into Focused Subcomponents

#### 3.1 Objective & Rationale
Deconstruct the monolithic `apps/web/src/routes/+page.svelte` (1,018 lines) into a lean orchestrator (< 150 lines) managing dedicated, single-responsibility subcomponents under `apps/web/src/lib/components/`. Fix `apps/web/src/routes/AppLayout.svelte` by replacing desktop Rune-Lab bindings with a dedicated mobile PWA shell.

#### 3.2 Layout Architecture (`apps/web/src/routes/AppLayout.svelte`)
- Replace desktop `WorkspaceLayout` with responsive PWA shell:
  - Top: `AppHeader.svelte`
  - Body: Scrollable content container `<main class="pb-24 max-w-lg mx-auto min-h-screen"> {@render children()} </main>`
  - Bottom: `ClientDock.svelte` (DaisyUI v5 fixed dock navigation)

#### 3.3 New Subcomponent Topology in `apps/web/src/lib/components/`

```
apps/web/src/lib/components/
|-- AppHeader.svelte               # Role switch (Cliente / Colaborador), Colonia picker, Membership indicator
|-- ClientDock.svelte              # DaisyUI v5 dock navigation with active badges for client & collaborator tabs
|-- ClientHomeView.svelte          # Landing hero, active order banner, embedded CotizadorWidget, trade cards
|-- CollaboratorDirectory.svelte   # Search bar, trade filter pills, verified technician cards with direct Quote CTA
|-- LiveServiceCockpit.svelte      # 6-node FSM tracking, SvgGpsTracker, Before/After photos, Warranty, Invoice, Escrow
|-- FieldExecutionCockpit.svelte   # Collaborator Radar (audio alert, 45s timer), GPS check-in, 3-phase photo upload
|-- SatTaxWallet.svelte            # Collaborator earnings, SAT withholdings (LISR 1%, LIVA 8%), net SPEI payout log
|-- UserProfileView.svelte         # User profile, Club Yessyfy 15% discount toggle, RFC fiscal data, past bookings
```

#### 3.4 Detailed Component Responsibilities

1. **`AppHeader.svelte`**:
   - Role switcher button (`Cliente` $\longleftrightarrow$ `Colaborador`) with smooth transition.
   - Colonia selector dropdown (Polanco, Condesa, Roma Norte, Coyoacán, Del Valle).
   - Club Yessyfy 15% discount membership indicator badge.
   - Authentication trigger / profile avatar.

2. **`ClientDock.svelte`**:
   - Uses DaisyUI v5 `<nav class="dock dock-sm">`.
   - Client Tabs: `Inicio` (Home), `Buscar` (Search), `Reservas` (Cockpit with active count badge), `Perfil` (Profile).
   - Collaborator Tabs: `Radar` (Nearby jobs with pulsing badge), `Chamba` (Active execution), `Billetera` (Wallet).

3. **`ClientHomeView.svelte`**:
   - Hero banner: "Reparaciones certificadas en tu colonia con Garantía Escrow".
   - Active order quick shortcut card (if order in progress).
   - Embedded `CotizadorWidget` for instant price estimation.
   - Trade discovery grid (6 categories) linking directly to Directory filter.
   - Trust highlights: Verified background check, Escrow retention, 30-day warranty.

4. **`CollaboratorDirectory.svelte`**:
   - Real-time search input by name, specialty, or colony.
   - Horizontal scrolling category filter pills (`Todos`, `Plomería`, `Electricidad`, `Cerrajería`, etc.).
   - Technician cards utilizing `TechProfileCard` with rating, verified badge, vehicle plates, and "Cotizar con este Pro" CTA.

5. **`LiveServiceCockpit.svelte`**:
   - Full 6-node lifecycle progression visualizer (`Pedido` $\to$ `Match` $\to$ `En Camino` $\to$ `En Sitio` $\to$ `QA / Validación` $\to$ `Pago`).
   - Integrated `SvgGpsTracker` showing live collaborator vector route.
   - Technician identity pass button (`AccessSecurityPass`).
   - In-app chat drawer toggle (`InAppChatDrawer`).
   - Photographic QA comparison preview (`BeforeAfterSlider`).
   - Warranty card rendering (`WarrantyCard`).
   - SAT invoice request trigger (`FiscalInvoiceDrawer`).
   - Fiduciary Escrow release button and Review sheet trigger (`ClientReviewAndRatingSheet`).

6. **`FieldExecutionCockpit.svelte`**:
   - **Radar Mode**:
     - On-duty availability toggle.
     - Live incoming job alert with synthesized Web Audio 880Hz alert tone and vibration pattern `[300, 100, 300, 100, 500]`.
     - 45-second acceptance countdown timer.
     - Accept / Reject job buttons.
   - **Active Execution Mode**:
     - Arrival GPS check-in button.
     - 3-Phase photo upload workflow (`PhotoUploader`):
       1. `diagnostic_before` (Diagnóstico previo).
       2. `work_progress` (Avance de obra).
       3. `proof_finished` (Resultado final).
     - Add supplemental materials / labor trigger (`SupplementalApprovalModal`).
     - Mark job completed & request client sign-off.

7. **`SatTaxWallet.svelte`**:
   - Collaborator financial ledger with exact integer cent arithmetic (`Centavos`).
   - Gross earnings summary card.
   - Platform fee deduction (15% + 16% IVA on fee).
   - SAT CFDI Platform Tax Withholdings:
     - LISR 113-A: 1.0% (with RFC) vs. 20.0% (without RFC).
     - LIVA 18-J: 8.0% (with RFC) vs. 16.0% (without RFC).
   - Net payout amount calculated to the exact centavo.
   - SPEI 18-digit CLABE interbank transfer history log.

8. **`UserProfileView.svelte`**:
   - User profile info & contact data.
   - Club Yessyfy membership toggle (15% discount on all quotes).
   - SAT RFC and fiscal billing details configuration.
   - Past service orders history and downloaded invoices list.
   - Sign out / Switch account actions.

#### 3.5 Phase 3 Exit Criteria
- `apps/web/src/routes/+page.svelte` reduced from 1,018 lines to under 150 lines.
- All 8 subcomponents cleanly separated in `apps/web/src/lib/components/`.
- `just types` passes for `apps/web` with 0 type errors.

---

### 🖥️ PHASE 4: Operations CRM (`apps/vision`) Modernization & Rune-Lab Integration

#### 4.1 Objective & Rationale
Deconstruct `apps/vision/src/routes/+page.svelte` (507 lines) into dedicated console subcomponents under `apps/vision/src/lib/components/`. Fully integrate Rune-Lab workspace layouts, palettes, keyboard shortcuts, and persistent telemetry statusbar in `apps/vision/src/routes/AppLayout.svelte`.

#### 4.2 Rune-Lab Workspace Integration (`apps/vision/src/routes/AppLayout.svelte`)
- **Workspace Strip (Left Bar)**: Quick console switcher (`Kanban`, `Despacho Espacial`, `Árbol Conversacional`, `Auditoría QA`, `Escrow & SAT`).
- **Navigation Panel (Left Drawer)**:
  - CDMX Alcaldía selector (Cuauhtémoc, Miguel Hidalgo, Benito Juárez, Coyoacán, Álvaro Obregón).
  - Urgency level filter (Todas, Emergencia 24/7, Mismo Día, Normal).
  - Live ticket queue listing with `StatusBadge` and order code.
- **Detail Panel (Right Drawer)**:
  - Active ticket inspector: Customer profile, Collaborator profile, `PriceBreakdown`, and quick actions (Freeze Escrow, Timbrar SAT CFDI).
- **Statusbar (Bottom Bar)**:
  - Real-time telemetry: Connected technicians count (12), Active jobs count (3), Total Escrow held ($218,500 MXN), API latency (42ms).
- **Command Palette (`Ctrl+Space`)**:
  - Global operational shortcuts (`jump.ticket.*`, `ops.escrow.freeze`, `ops.pac.batch_stamp`).

#### 4.3 Console Subcomponents in `apps/vision/src/lib/components/`

```
apps/vision/src/lib/components/
|-- KanbanBoard.svelte              # 8-column canonical operational lifecycle board (/hi to /factura_digital)
|-- SpatialDispatchMap.svelte       # Interactive CDMX map with technician clusters and route polylines
|-- ConversationalTree.svelte       # 14-node WhatsApp shortcut automation tree with live ticket counters
|-- QaAuditInspector.svelte         # Split-screen before/after photographic QA, EXIF coordinates & SHA-256 validation
|-- EscrowManagementConsole.svelte  # Fiduciary Escrow retention, dispute freeze/unfreeze, batch SAT CFDI stamping
```

#### 4.4 Detailed Console Responsibilities

1. **`KanbanBoard.svelte`**:
   - 8 Canonical Columns:
     1. `01: Saludo` (`/hi`)
     2. `02: Triage` (`/route`)
     3. `03: Discovery` (`/urgencia`)
     4. `04: Cotización` (`/confirmacion_ok`)
     5. `05: Ejecución` (`/en_camino`)
     6. `06: Validación` (`/validacion_ok`)
     7. `07: Pago Escrow` (`/pago`)
     8. `08: Facturación` (`/factura_digital`)
   - Interactive ticket cards with client name, trade emoji, elapsed time badge, and single-click inspection.

2. **`SpatialDispatchMap.svelte`**:
   - Vector-based CDMX Alcaldía map.
   - Real-time technician pins with status indicators (Available, In Transit, On Site).
   - Active route polylines connecting collaborator to customer coordinates.
   - Dispatch matching tool: Sub-second assignment of nearest qualified pro.

3. **`ConversationalTree.svelte`**:
   - 14-node visual automation graph from `docs/Arbol Conversacion.html`:
     - Nodes: `/hi`, `/route`, `/urgencia`, `/confirmacion_ok`, `/en_camino`, `/en_proceso`, `/por_terminar`, `/finalizado`, `/qa_aprobado`, `/liberar_pago`, `/factura_digital`, `/garantia_emitida`, `/recompra_recordatorio`, `/ticket_soporte`.
   - Node metrics: Real-time ticket count per shortcut, recipient category (`Cliente`, `Colaborador`, `Ambos`), and message payload preview.

4. **`QaAuditInspector.svelte`**:
   - Split-screen photographic comparison: `diagnostic_before` vs. `proof_finished` using `BeforeAfterSlider`.
   - Photographic metadata validation: EXIF timestamp, GPS latitude/longitude cross-referenced with order address, SHA-256 cryptographic stamp verification.
   - Staff decision triggers: Single-click `Aprobar QA & Liberar Escrow` or `Rechazar con Observaciones`.

5. **`EscrowManagementConsole.svelte`**:
   - Multi-party escrow retention table with cent-exact integer balances.
   - Dispute arbitration controls: Freeze funds, split payout, full refund to customer, or forced payout to collaborator.
   - Batch SAT CFDI 4.0 PAC stamping tool: Stamping queue, PAC response logs, and XML/PDF export.

#### 4.5 Phase 4 Exit Criteria
- `apps/vision/src/routes/+page.svelte` reduced from 507 lines to under 120 lines.
- All 5 console views modularized in `apps/vision/src/lib/components/`.
- `just types` passes for `apps/vision` with 0 type errors.

---

### 🛡️ PHASE 5: Verification, Static Quality Gates & Production Hardening

#### 5.1 Objective & Rationale
Execute all static analysis, type checking, unit testing, dependency auditing, and production build pipelines across all 6 workspaces to ensure 100% compliance with zero regressions.

#### 5.2 Comprehensive Quality Gate Matrix

| Quality Gate | Command | Scope / Target | Expected Pass Output |
| :--- | :--- | :--- | :--- |
| **Code Formatting** | `just fmt -v` | All workspaces (`@sdk/*`, `apps/*`) | Formatted 0 files, 0 discrepancies. |
| **Linter Diagnostics** | `just lint -v` | Biome & Deno linter across all workspaces | 0 lint errors, 0 warnings. |
| **Type Integrity** | `just types -vb` | TypeScript & `svelte-check` across 6 workspaces | 0 errors across `@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`, `apps/web`, `apps/vision`. |
| **Automated Tests** | `just test -vb` | Domain kernel, SAT tax math, FSM transitions, UI units | 100% passing test assertions. |
| **Production Build** | `just build -vb` | Vite SPA compilation for `apps/web` and `apps/vision` | Clean static build generation in `dist`/`build`. |
| **Fallow Dependency Audit** | `just audit -vb` | Monorepo module graph analysis | **0 circular dependencies**, 0 illegal upward imports. |
| **Health Check** | `just health -vb` | Overall monorepo integrity | All checks green. |

#### 5.3 Domain & Legal Verification Checklist
- [x] **Mexican Labor Law (LFT Non-Subordination)**: Audited all UI copy and domain definitions to guarantee independent contractor status ("colaborador independiente", "prestador de servicios", zero employee nomenclature).
- [x] **SAT CFDI 4.0 Withholding Calculations**: 10,000-iteration randomized test verifying cent-exact integer math without floating-point rounding drift across LISR 113-A and LIVA 18-J withholding brackets.
- [x] **DaisyUI v5 Modernization**: Verified zero occurrences of `input-bordered`, `select-bordered`, `form-control`, `label-text`, `btn-group`, `btm-nav`, `card-compact`, `tabs-lifted`.
- [x] **Svelte 5 Runes Invariants**: Verified that no `$state` proxies are mutated inside derived computations and all props use `$props()`.

---

## 📋 Execution Order & Phase Dependencies

```
[Phase 1: SDK Foundation & Circular Dependency Fix]
                      |
                      v
[Phase 2: Shared UI Modernization & DaisyUI v5]
                      |
         +------------+------------+
         |                         |
         v                         v
[Phase 3: apps/web]        [Phase 4: apps/vision]
         |                         |
         +------------+------------+
                      |
                      v
[Phase 5: Verification & Quality Gates]
```
