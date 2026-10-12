# MASTER IMPLEMENTATION & MODERNIZATION PLAN: YESSYFY (v2.0 - POST-AUDIT)

**Document Reference:** `PLAN.md` (Monorepo Master Plan)\
**Target Workspaces:** `@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`,
`apps/web`, `apps/colab`, `apps/vision`\
**Governance Stack:** Deno 2, SvelteKit 3 (SPA Mode), Svelte 5.56+ (Runes &
Snippets), DaisyUI v5.7+, Tailwind CSS v4, XState v5, ArkType, Rune-Lab
v0.5.2-rc.2\
**Universal Exit Gate:** Clean execution of `just check -vp`, `just build -vp`,
`just test -vp`, and `just audit` (0 errors, 0 warnings, 0 circular
dependencies, 0 deprecated v4 classes).

---

## 🎯 Executive Summary & Architectural Overview

The Yessyfy platform formalizes home and commercial repair trades across Mexico
through a managed marketplace model with fiduciary Escrow protection,
photographic Quality Assurance (QA), and Mexican fiscal (SAT CFDI 4.0) / labor
(LFT/REPSE non-subordination) compliance.

Following the forensic audit conducted on September 2, 2026, the core
modernization (Phases 1–5) successfully eliminated all circular dependencies and
decomposed monolithic views into modular components. This updated plan
introduces **Phase 6: Forensic Remediation & Final Release Polish**, detailing
the exact line-by-line fixes for all **5 P0 Blockers**, **7 P1 Critical
Defects**, and **3 P2 Polish Items**.

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
                         |                            |                           |
                         v                            v                           v
+---------------------------------+ +---------------------------------+ +---------------------------------+
|            apps/web             | |           apps/colab            | |           apps/vision           |
|      Consumer PWA (Client)      | |      Field Cockpit (Pro)        | |     Operations Mission Control  |
| (Home, Cotizador, Live Tracker) | | (Radar Alert, GPS QA, Tax Wallet| | (Kanban, Dispatch Map, Escrow) |
+---------------------------------+ +---------------------------------+ +---------------------------------+
```

---

## 📅 Multi-Phase Master Implementation & Remediation Roadmap

---

### 📦 PHASE 1: SDK Foundation, Unified Type Hierarchy & Circular Dependency Elimination (COMPLETED)

- **Zero Circular Dependencies**: All 7 import cycles eliminated via explicit
  directional paths (`@sdk/core`, `@sdk/api`, `@sdk/ui`, `@sdk/state`).
- **Pure Entities**: `@sdk/core` acts as Single Source of Truth for all domain
  entities, types, and kernel math.

---

### 🎨 PHASE 2: Shared UI Modernization & DaisyUI v5 Compliance (COMPLETED)

- **DaisyUI v5 Standard**: Removed all deprecated v4 classes (`input-bordered`,
  `form-control`, `label-text`, `btn-group`, `btm-nav`, `card-compact`,
  `tabs-lifted`).
- **Atomic Subcomponents**: Decomposed complex components in
  `@sdk/ui/src/components/` into focused subdirectories (`auth/`, `cotizador/`,
  `chat/`, `fiscal/`, `pass/`, `photo/`, `review/`).

---

### 📱 PHASE 3: Modularization of `apps/web` into Focused Subcomponents (COMPLETED)

- **Monolithic Template Reductions**: `apps/web/src/routes/+page.svelte` reduced
  from 1,018 lines to 244 lines.
- **Client Views Created**: `AppHeader.svelte`, `ClientDock.svelte`,
  `ClientHomeView.svelte`, `CollaboratorDirectory.svelte`,
  `LiveServiceCockpit.svelte`, `UserProfileView.svelte`.

---

### 🔧 PHASE 4: Dedicated Field Collaborator Experience `apps/colab` (COMPLETED)

- **Dedicated Field App**: Created `apps/colab` with `ColabDock.svelte`,
  `RadarJobView.svelte`, `ActiveJobExecutionView.svelte`,
  `SatWalletView.svelte`, `ColabProfileView.svelte`.

---

### 🖥️ PHASE 5: Operations CRM `apps/vision` Modernization (COMPLETED)

- **Tactical Consoles**: `apps/vision/src/routes/+page.svelte` reduced from 507
  lines to 23 lines with `KanbanBoard.svelte`, `SpatialDispatchMap.svelte`,
  `ConversationalTree.svelte`, `QaAuditInspector.svelte`,
  `EscrowManagementConsole.svelte`.

---

## 🚨 PHASE 6: FORENSIC AUDIT REMEDIATION & PRODUCTION RELEASE HARDENING

This phase resolves all defects identified in the system audit to achieve 100%
production release readiness.

---

### 6.1 P0 Blockers Remediation Matrix

#### 🔴 BLK-01: PROFECO Pricing Multiplier Copy Discrepancy

- **Target File:**
  [`src/client/sdk/ui/src/components/cotizador/UrgencySelector.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/cotizador/UrgencySelector.svelte)
- **Root Cause:** UI options display `Comercial (1.15x)` and
  `Premium / Plus (1.35x)`, whereas
  [`sat.ts`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/core/src/kernel/sat.ts)
  applies `comercial: 1.2` and `premium: 1.5`. Violates Article 7 Bis of the
  Mexican _Ley Federal de Protección al Consumidor_ (LFPC).
- **Specific Fix:**
  ```svelte
  <!-- In UrgencySelector.svelte -->
  <option value="residencial">Residencial (1.0x - Tarifa Base)</option>
  <option value="comercial">Comercial (1.2x)</option>
  <option value="premium">Premium / Plus (1.5x)</option>
  ```
- **Acceptance Criteria:** Displayed multiplier numbers match the exact numbers
  in `LOCATION_MULTIPLIERS` in `sat.ts`.

---

#### 🔴 BLK-02: Anti-Disintermediation Stateful RegExp `lastIndex` Bug

- **Target File:**
  [`src/client/sdk/api/src/filters/antiDisintermediation.ts`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/api/src/filters/antiDisintermediation.ts)
- **Root Cause:** Declaring global `/g` regexes at module scope causes
  `RegExp.prototype.test()` to advance `lastIndex`, causing intermittent failure
  to catch phone numbers, CLABEs, and circumvention attempts on consecutive chat
  messages.
- **Specific Fix:**
  ```typescript
  // Remove /g flag from test regexes or create clean instances:
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const CLABE_REGEX = /\b\d{18}\b/;
  const PHONE_PATTERNS = [
    /(?:\+?52\s?)?(?:\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{4})/,
    /\b\d{10}\b/,
    /\b\d{2}\s\d{4}\s\d{4}\b/,
  ];
  const CIRCUMVENTION_PATTERNS = [
    /pago\s+por\s+fuera/i,
    /por\s+fuera/i,
    /transferencia\s+directa/i,
    /efectivo\s+directo/i,
    /te\s+deposito/i,
    /sin\s+app/i,
    /mi\s+cel/i,
    /mi\s+whats/i,
    /mi\s+numero/i,
  ];
  ```
- **Acceptance Criteria:** Unit tests with 10 consecutive executions of
  identical and alternating circumvention messages must reliably detect and
  redact 100% of attempts.

---

#### 🔴 BLK-03: Missing Waze & Google Maps Navigation Deep-Links in Field Cockpit

- **Target File:**
  [`src/client/apps/colab/src/lib/components/ActiveJobExecutionView.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/apps/colab/src/lib/components/ActiveJobExecutionView.svelte)
- **Root Cause:** When in transit, the technician has no navigation trigger to
  launch Waze or Google Maps with destination coordinates.
- **Specific Fix:** Add dual 56px action buttons with responsive deep links:
  ```svelte
  {#if fsmSnapshot.value === 'in_transit' || fsmSnapshot.value === 'accepted'}
    <div class="grid grid-cols-2 gap-3">
      <a
        href="https://waze.com/ul?ll={destinationLat},{destinationLng}&navigate=yes"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline btn-primary rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2"
      >
        <span class="text-xl">🚗</span>
        <span>Abrir en Waze</span>
      </a>
      <a
        href="https://maps.google.com/?q={destinationLat},{destinationLng}"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline btn-neutral rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2"
      >
        <span class="text-xl">🗺️</span>
        <span>Google Maps</span>
      </a>
    </div>
  {/if}
  ```
- **Acceptance Criteria:** Both buttons render with $\ge 56\text{px}$ touch
  targets and valid coordinate strings.

---

#### 🔴 BLK-04: Web Audio 880Hz Autoplay Suppression on Mobile Browsers

- **Target File:**
  [`src/client/apps/colab/src/routes/+page.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/apps/colab/src/routes/+page.svelte)
- **Root Cause:** Instantiating `new AudioContext()` during an automated
  incoming radar event without an initial user gesture causes iOS Safari and
  Android Chrome to suppress audio output.
- **Specific Fix:** Pre-initialize and resume `AudioContext` on the technician's
  manual "Conectarse / En Servicio" toggle:
  ```typescript
  let sharedAudioCtx: AudioContext | null = null;

  function handleToggleDuty() {
    isOnline = !isOnline;
    if (isOnline && typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext ||
          (window as any).webkitAudioContext;
        if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
        if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
      } catch (_) {}
    }
  }
  ```
- **Acceptance Criteria:** 880Hz alert chime plays reliably when radar alerts
  trigger after duty toggle.

---

#### 🔴 BLK-05: `BeforeAfterSlider` Image Aspect-Ratio Distortion

- **Target File:**
  [`src/client/sdk/ui/src/components/BeforeAfterSlider.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/BeforeAfterSlider.svelte)
- **Root Cause:** Applying `style="width: 100vw; max-width: 1000px;"` to the
  clipped before-image forces it to decouple from the parent container's actual
  pixel width, distorting images during slider drag.
- **Specific Fix:** Bind container width with Svelte `bind:clientWidth` and
  apply exact width to the clipped before-image:
  ```svelte
  <script lang="ts">
    let containerWidth = $state(0);
    let sliderPosition = $state(50);
  </script>

  <div class="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden select-none border border-base-300 shadow-md" bind:clientWidth={containerWidth}>
    <img src={afterUrl} alt={afterLabel} class="absolute inset-0 w-full h-full object-cover" />
    <div class="absolute inset-0 overflow-hidden" style="width: {sliderPosition}%">
      <img
        src={beforeUrl}
        alt={beforeLabel}
        class="absolute inset-0 h-full object-cover max-w-none"
        style="width: {containerWidth}px;"
      />
      <span class="badge badge-neutral absolute top-3 left-3 text-[10px] font-bold">{beforeLabel}</span>
    </div>
    <!-- Handle -->
  </div>
  ```
- **Acceptance Criteria:** Dragging slider from 0% to 100% shows pixel-perfect
  alignment between before and after images without stretching.

---

### 6.2 P1 Critical Defects Remediation Matrix

#### 🟠 CRIT-01: SAT CFDI 4.0 Withholding Calculation Alignment (LISR 113-A)

- **Target Files:**
  - [`src/client/sdk/core/src/kernel/sat.ts`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/core/src/kernel/sat.ts)
  - [`src/client/sdk/ui/src/components/PriceBreakdown.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/PriceBreakdown.svelte)
  - [`src/client/apps/colab/src/lib/components/SatWalletView.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/apps/colab/src/lib/components/SatWalletView.svelte)
- **Root Cause:** Mexican LISR Art. 113-A Fracc. III stipulates **1.0% ISR** for
  trade crafts and general technical services (2.1% is strictly for passenger
  transport / delivery). `sat.ts` applied 2.1%, conflicting with
  `SatWalletView.svelte` (which displayed 1.0%).
- **Specific Fix:** Standardize `isrPercent` in `sat.ts` to `1.0%` for RFC
  holders (and `20.0%` for non-RFC holders). Update `PriceBreakdown.svelte`
  label to `Retención SAT ISR (1.0%)`.
- **Acceptance Criteria:** `calculateJobPricing` outputs exact 1.0% ISR,
  matching the breakdown in the wallet and quote sheet.

---

#### 🟠 CRIT-02: ArkType Schema Mismatch

- **Target File:**
  [`src/client/sdk/core/src/schemas/yessyfy.ts`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/core/src/schemas/yessyfy.ts)
- **Root Cause:** `jobOrderStatusSchema` omitted `'in_transit'` and
  `'pending_quote_approval'`, causing runtime ArkType validation errors on
  active orders.
- **Specific Fix:**
  ```typescript
  export const jobOrderStatusSchema = type(
    "'draft' | 'pending_triage' | 'dispatched' | 'accepted' | 'in_transit' | 'en_camino' | 'in_progress' | 'pending_quote_approval' | 'winding_down' | 'pending_validation' | 'validated' | 'completed' | 'disputed' | 'cancelled'",
  );
  ```
- **Acceptance Criteria:** `jobOrderStatusSchema({ status: 'in_transit', ... })`
  validates with zero errors.

---

#### 🟠 CRIT-03: XState Machine Transition Hardening

- **Target File:**
  [`src/client/sdk/state/src/machines/serviceOrderMachine.ts`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/state/src/machines/serviceOrderMachine.ts)
- **Specific Fixes:**
  1. Add `CANCEL` transitions to `in_progress`, `winding_down`, and
     `pending_quote_approval`.
  2. Add fallback branch to `SETTLE_PAYOUT` in `validated` to prevent silent
     event drop.
  3. Recalculate full financial context in `approveSupplemental` and
     `assignRequest`.
- **Acceptance Criteria:** Machine never drops events silently; all cancel and
  dispute paths transition predictably.

---

#### 🟠 CRIT-04: Kanban Board Duplicate Completed Order Cards

- **Target File:**
  [`src/client/apps/vision/src/lib/components/KanbanBoard.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/apps/vision/src/lib/components/KanbanBoard.svelte)
- **Root Cause:** Column 07 (`Pago Escrow`) and Column 08 (`Facturación`) both
  had `statusMatch: ['completed']`, duplicating cards across both columns.
- **Specific Fix:**
  ```typescript
  { id: 'pago', title: '07: Pago Escrow', shortcut: '/pago', statusMatch: ['validated', 'settling'] },
  { id: 'factura', title: '08: Facturación', shortcut: '/factura_digital', statusMatch: ['completed'] },
  ```
- **Acceptance Criteria:** Completed orders appear solely in Column 08; orders
  awaiting payout appear in Column 07.

---

#### 🟠 CRIT-05: Supplemental Quote Sum Discrepancy

- **Target File:**
  [`src/client/sdk/ui/src/components/SupplementalApprovalModal.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/SupplementalApprovalModal.svelte)
- **Root Cause:** Default props `partsCostCents = 12000`
  ($120) and `laborCostCents = 8000` ($80) sum to $200 MXN, but the modal
  displayed total $350 MXN (`supplementalCents = 35000`).
- **Specific Fix:** Update default props to `partsCostCents = 20000`
  ($200 MXN) and `laborCostCents = 15000` ($150 MXN), summing exactly to $350
  MXN.
- **Acceptance Criteria:** Displayed itemized components sum to the exact total
  supplemental charge.

---

#### 🟠 CRIT-06: WhatsApp Share Fallback

- **Target File:**
  [`src/client/sdk/ui/src/components/pass/SharePassActions.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/pass/SharePassActions.svelte)
- **Specific Fix:** When `navigator.share` is unavailable, copy to clipboard AND
  trigger
  `window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText), '_blank')`.
- **Acceptance Criteria:** Desktop users clicking the WhatsApp share button are
  immediately directed to WhatsApp Web.

---

#### 🟠 CRIT-07: Dynamic 7-Day Calendar Generation

- **Target File:**
  [`src/client/sdk/ui/src/components/cotizador/ScheduleSelector.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/cotizador/ScheduleSelector.svelte)
- **Specific Fix:** Replace static mock dates (`"Sábado 29"`, `"Domingo 30"`)
  with dynamically generated 7-day window using
  `Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })`.
- **Acceptance Criteria:** Calendar tabs always display valid upcoming calendar
  dates regardless of current month or day.

---

### 6.3 P2 Polish & Ergonomics Remediation Matrix

#### 🟡 POL-01: Svelte 5 `$derived.by` Modernization

- **Target Files:**
  - [`src/client/sdk/ui/src/components/VehiclePlateCard.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/VehiclePlateCard.svelte)
  - [`src/client/sdk/ui/src/components/SvgGpsTracker.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/SvgGpsTracker.svelte)
  - [`src/client/sdk/ui/src/components/TechProfileCard.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/TechProfileCard.svelte)
  - [`src/client/sdk/ui/src/components/TrustBadge.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/components/TrustBadge.svelte)
- **Specific Fix:** Replace `$derived(() => { switch(...) })` with
  `$derived.by(() => { switch(...) })` to return direct reactive values instead
  of function pointers.

#### 🟡 POL-02: 6-Node Lifecycle Visualizer in Client Cockpit

- **Target File:**
  [`src/client/apps/web/src/lib/components/LiveServiceCockpit.svelte`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/apps/web/src/lib/components/LiveServiceCockpit.svelte)
- **Specific Fix:** Add 6th terminal node (`Factura & Garantía`) to the FSM
  visualizer bar.

#### 🟡 POL-03: WCAG AA Contrast Compliance on Primary Buttons

- **Target Files:**
  [`src/client/sdk/ui/src/tokens.css`](file:///home/yrrrrrf/Documents/lab/tek/apps/yessyfy/src/client/sdk/ui/src/tokens.css)
  & component templates.
- **Specific Fix:** Ensure all text on `btn-primary` uses `text-primary-content`
  (`#0B3D47`) rather than `text-white` to achieve 7.2:1 contrast.

---

## 🏁 Execution Sequence for Phase 6 Remediation

```
Step 1: Core & API Patches
  ├── Fix antiDisintermediation.ts (remove /g flag)
  ├── Fix sat.ts (align ISR to 1.0%)
  └── Fix schemas/yessyfy.ts (add missing statuses)
           │
           ▼
Step 2: Shared UI Patches
  ├── Fix UrgencySelector.svelte (align 1.2x/1.5x)
  ├── Fix BeforeAfterSlider.svelte (bind:clientWidth)
  ├── Fix SupplementalApprovalModal.svelte (sum $350)
  ├── Fix ScheduleSelector.svelte (dynamic 7-day calendar)
  ├── Fix SharePassActions.svelte (wa.me fallback)
  └── Replace $derived(() => ...) with $derived.by(...)
           │
           ▼
Step 3: Apps Patches (Colab, Web, Vision)
  ├── Add Waze/Google Maps deep-links to ActiveJobExecutionView.svelte
  ├── Pre-unlock AudioContext on duty toggle in apps/colab/+page.svelte
  ├── Update KanbanBoard.svelte column mappings (Col 07 vs Col 08)
  └── Update LiveServiceCockpit.svelte 6-node visualizer
           │
           ▼
Step 4: Quality Gate Verification & Release Sign-Off
  ├── just check -vp   (0 type errors, 0 lint warnings)
  ├── just test -vp    (100% unit & FSM tests passing)
  ├── just build -vp   (3 apps built successfully)
  └── just audit       (0 circular dependencies, clean health)
```

This updated master plan is completely actionable and guarantees 100% compliance
across UX, legal, and engineering standards.
