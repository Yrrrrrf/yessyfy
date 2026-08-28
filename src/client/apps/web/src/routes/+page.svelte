<script lang="ts">
import {
  AccessSecurityPass,
  AuthOtpModal,
  BeforeAfterSlider,
  BottomSheet,
  ClientReviewAndRatingSheet,
  CotizadorWidget,
  EscrowStatusCard,
  FiscalInvoiceDrawer,
  InAppChatDrawer,
  PhotoUploader,
  PriceBreakdown,
  StatusBadge,
  SupplementalApprovalModal,
  SvgGpsTracker,
  TechProfileCard,
  TRADE_META_REGISTRY,
  TrustBadge,
  VehiclePlateCard,
  WarrantyCard,
} from '@sdk/ui';
import {
  calculateJobPricing,
  formatMxn,
  type JobOrderStatus,
  type LocationType,
  type ServiceCategory,
  type TechnicianRecord,
  type UrgencyLevel,
  type WarrantyCertificate,
} from '@sdk';
import { serviceOrderMachine } from '@sdk/state';
import { createActor } from 'xstate';

// Role Mode: Client Consumer vs. Collaborator Cockpit
type UserRoleMode = 'cliente' | 'colaborador';
let roleMode = $state<UserRoleMode>('cliente');

// Client Tab navigation
type ClientTab = 'inicio' | 'buscar' | 'reservas' | 'perfil';
let currentClientTab = $state<ClientTab>('inicio');

// Collaborator Tab navigation
type CollabTab = 'radar' | 'chamba_activa' | 'billetera';
let currentCollabTab = $state<CollabTab>('chamba_activa');

// Membership & Auth States
let isMember = $state(true); // Default true to showcase 15% discount
let isAuthModalOpen = $state(false);
let authenticatedUser = $state<{ id: string; phone: string; role: string } | null>({
  id: 'usr_c_mariana',
  phone: '+525541982300',
  role: 'customer',
});

// Modals and Drawers States
let isChatOpen = $state(false);
let isSecurityPassOpen = $state(false);
let isSupplementalModalOpen = $state(false);
let isReviewSheetOpen = $state(false);
let isFiscalInvoiceOpen = $state(false);
let isBookingSheetOpen = $state(false);

// Active Service Order FSM Actor
const orderActor = createActor(serviceOrderMachine);
orderActor.start();

let fsmState = $state(orderActor.getSnapshot());
orderActor.subscribe((snap) => {
  fsmState = snap;
});

// Sound / Vibration synthesized alert for Radar
function triggerRadarAlert() {
  if (typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 alert tone
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (_) {}

    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  }
}

// Collaborator on-duty state & countdown
let isCollabOnDuty = $state(true);
let radarTimerSeconds = $state(45);
let radarTimerInterval = $state<number | null>(null);

function startRadarTimer() {
  radarTimerSeconds = 45;
  triggerRadarAlert();
  if (radarTimerInterval) clearInterval(radarTimerInterval);
  radarTimerInterval = setInterval(() => {
    if (radarTimerSeconds > 0) {
      radarTimerSeconds--;
    } else {
      if (radarTimerInterval) clearInterval(radarTimerInterval);
    }
  }, 1000) as unknown as number;
}

// Search & Directory State
let searchQuery = $state('');
let filterTrade = $state<ServiceCategory | 'todos'>('todos');

// Verified Independent Collaborators Database
const PROS: (TechnicianRecord & { distanceKm: number; etaMin: number; priceFromCents: number })[] = [
  {
    id: 'tech_01',
    userId: 'usr_t1',
    user: {
      id: 'usr_t1',
      fullName: 'Roberto Morales Ramírez',
      phone: '+525541982301',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['plomeria', 'electricidad'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine.jpg' },
    clabe: '012180001234567890',
    operationalState: 'on_job',
    ratingAvg: 4.95,
    jobsCompleted: 148,
    cancellationRate: 0.01,
    updatedAt: new Date().toISOString(),
    distanceKm: 2.3,
    etaMin: 14,
    priceFromCents: 45000,
  },
  {
    id: 'tech_02',
    userId: 'usr_t2',
    user: {
      id: 'usr_t2',
      fullName: 'Ignacio Fuentes Silva',
      phone: '+525533112244',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['electricidad'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine2.jpg' },
    clabe: '012180009876543210',
    operationalState: 'idle',
    ratingAvg: 4.88,
    jobsCompleted: 92,
    cancellationRate: 0.02,
    updatedAt: new Date().toISOString(),
    distanceKm: 3.8,
    etaMin: 22,
    priceFromCents: 50000,
  },
];

const filteredPros = $derived(
  PROS.filter((p) => {
    const matchesTrade = filterTrade === 'todos' || p.trades.includes(filterTrade);
    const matchesQuery = !searchQuery || (p.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesTrade && matchesQuery;
  }),
);

// Active Order Photos (Dynamic for Before/After Slider)
let beforePhotoUrl = $state('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800');
let afterPhotoUrl = $state('https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800');

// Warranty Certificate for Completed Orders
let activeWarranty = $state<WarrantyCertificate>({
  id: 'war_001',
  certificateNumber: 'YSF-WAR-2026-0881',
  jobOrderId: 'YSF-ORD-001',
  customerId: 'usr_c_mariana',
  collaboratorId: 'usr_t1',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: new Date().toISOString(),
});

function handleBookService(details: {
  category: ServiceCategory;
  totalCents: number;
  scheduleDate: string;
  scheduleTimeSlot: string;
  addressText: string;
  postalCode: string;
  gateInstructions: string;
}) {
  orderActor.send({
    type: 'SUBMIT_REQUEST',
    customerId: authenticatedUser?.id || 'usr_c_mariana',
    category: details.category,
    locationType: 'residencial',
    urgency: 'normal',
    totalCustomerCents: details.totalCents,
  });
  orderActor.send({ type: 'DISPATCH' });
  orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'usr_t1' });
  orderActor.send({ type: 'START_TRANSIT', etaMinutes: 14 });

  currentClientTab = 'reservas';
  isBookingSheetOpen = false;
}
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col pb-24 md:pb-8">
  <!-- Brand Navigation Header with Role Switcher -->
  <header class="navbar bg-base-100/95 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-4 md:px-8">
    <div class="navbar-start flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-md">
        Y
      </div>
      <div>
        <span class="font-black text-xl tracking-tight text-base-content">Yessyfy</span>
        <span class="badge badge-primary badge-xs ml-1.5 font-bold">CDMX</span>
      </div>
    </div>

    <!-- Center: Role Switcher Pill -->
    <div class="navbar-center">
      <div class="join bg-base-200 p-1 rounded-2xl border border-base-300 shadow-inner">
        <button
          type="button"
          class="join-item btn btn-xs sm:btn-sm font-bold {roleMode === 'cliente' ? 'btn-primary text-white shadow' : 'btn-ghost'}"
          onclick={() => roleMode = 'cliente'}
        >
          👤 Modo Cliente
        </button>
        <button
          type="button"
          class="join-item btn btn-xs sm:btn-sm font-bold {roleMode === 'colaborador' ? 'btn-accent text-accent-content shadow' : 'btn-ghost'}"
          onclick={() => {
            roleMode = 'colaborador';
            startRadarTimer();
          }}
        >
          🔧 Cockpit Técnico
        </button>
      </div>
    </div>

    <!-- End: User Status & Booking CTA -->
    <div class="navbar-end flex items-center gap-2">
      {#if roleMode === 'cliente'}
        {#if authenticatedUser}
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-xl text-xs font-bold hidden sm:inline-flex"
            onclick={() => currentClientTab = 'perfil'}
          >
            Mariana G. (Polanco)
          </button>
        {:else}
          <button
            type="button"
            class="btn btn-outline btn-sm rounded-xl font-bold"
            onclick={() => isAuthModalOpen = true}
          >
            Entrar con Celular
          </button>
        {/if}
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold shadow-sm min-h-[44px]"
          onclick={() => isBookingSheetOpen = true}
        >
          Pedir Servicio
        </button>
      {:else}
        <!-- Collaborator Duty Toggle -->
        <button
          type="button"
          class="btn btn-sm rounded-xl font-bold {isCollabOnDuty ? 'btn-success text-white' : 'btn-ghost border border-base-300'}"
          onclick={() => isCollabOnDuty = !isCollabOnDuty}
        >
          <span class="w-2.5 h-2.5 rounded-full {isCollabOnDuty ? 'bg-white animate-pulse' : 'bg-base-content/40'}"></span>
          <span>{isCollabOnDuty ? 'En Guardia' : 'Desconectado'}</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- Main Viewport -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 space-y-8">
    {#if roleMode === 'cliente'}
      <!-- ================================================================= -->
      <!-- CLIENT EXPERIENCE (MARIANA GARZA - POLANCO PWA) -->
      <!-- ================================================================= -->
      {#if currentClientTab === 'inicio'}
        <!-- HERO SECTION -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          <div class="lg:col-span-7 space-y-6">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
              <span>🛡️</span>
              <span>Garantía Legal de 30 Días & Custodia Escrow</span>
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-base-content">
              Cuando algo se rompe en casa, <span class="text-primary underline decoration-wavy decoration-primary/30">la tranquilidad</span> se repara aquí.
            </h1>

            <p class="text-base sm:text-lg text-base-content/80 leading-relaxed max-w-xl">
              Conectamos tu departamento o residencia con <strong>profesionales independientes verificados</strong>. Tus fondos se custodian hasta tu firma digital de satisfacción.
            </p>

            <div class="flex flex-wrap gap-2.5 pt-1">
              <TrustBadge kind="kyc_verified" />
              <TrustBadge kind="insurance_500k" />
              <TrustBadge kind="warranty_30d" />
            </div>

            <div class="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                class="btn btn-primary font-bold rounded-2xl shadow-lg shadow-primary/20 min-h-[56px] px-8 text-base"
                onclick={() => isBookingSheetOpen = true}
              >
                Cotizar Reparación Inmediata
              </button>
              <button
                type="button"
                class="btn btn-ghost border border-base-300 font-bold rounded-2xl min-h-[56px] px-6 text-base"
                onclick={() => currentClientTab = 'buscar'}
              >
                Ver Directorio de Oficios
              </button>
            </div>
          </div>

          <div class="lg:col-span-5">
            <CotizadorWidget {isMember} onBook={handleBookService} />
          </div>
        </section>

        <!-- 6 TRADES -->
        <section class="space-y-6 pt-8 border-t border-base-300">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-black tracking-tight text-base-content">Nuestros 6 Oficios Certificados</h2>
            <button type="button" class="text-xs text-primary font-bold hover:underline" onclick={() => currentClientTab = 'buscar'}>
              Ver todos →
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each Object.values(TRADE_META_REGISTRY) as trade}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="card bg-base-200/60 border border-base-300 rounded-3xl p-5 hover:border-primary cursor-pointer transition-all group"
                onclick={() => { filterTrade = trade.id; currentClientTab = 'buscar'; }}
              >
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr {trade.gradientClass} text-white flex items-center justify-center text-2xl shadow-md mb-3">
                  {trade.emoji}
                </div>
                <h3 class="font-extrabold text-base text-base-content">{trade.name}</h3>
                <p class="text-xs text-base-content/70 mt-1">Garantía formal por escrito y refacciones originales.</p>
                <div class="mt-4 pt-3 border-t border-base-300/60 flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase text-base-content/50">Desde $400 MXN</span>
                  <span class="text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">Pedir →</span>
                </div>
              </div>
            {/each}
          </div>
        </section>

      {:else if currentClientTab === 'buscar'}
        <!-- DIRECTORY -->
        <section class="space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-black tracking-tight text-base-content">Profesionales Verificados en CDMX</h2>
              <p class="text-xs text-base-content/70">Tiempos de respuesta y antecedentes certificados en tu zona.</p>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o servicio..."
              bind:value={searchQuery}
              class="input input-bordered w-full md:w-72 rounded-2xl text-xs"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredPros as pro}
              <div class="card bg-base-200/70 border border-base-300 rounded-3xl p-5 hover:border-primary transition-all space-y-4 shadow-sm">
                <TechProfileCard technician={pro} />
                <div class="flex items-center justify-between pt-2 border-t border-base-300 text-xs font-mono">
                  <span class="text-base-content/60">A {pro.distanceKm} km • ETA ~{pro.etaMin} min</span>
                  <span class="font-bold text-primary font-sans">Desde {formatMxn(pro.priceFromCents)}</span>
                </div>
                <button
                  type="button"
                  class="btn btn-primary btn-sm btn-block rounded-xl font-bold min-h-[48px]"
                  onclick={() => {
                    handleBookService({
                      category: pro.trades[0],
                      totalCents: pro.priceFromCents,
                      scheduleDate: 'Hoy',
                      scheduleTimeSlot: 'Inmediata',
                      addressText: 'Av. Horacio 1420, Polanco',
                      postalCode: '11550',
                      gateInstructions: 'Anunciar en caseta Torre B',
                    });
                  }}
                >
                  Solicitar Visita con Garantía
                </button>
              </div>
            {/each}
          </div>
        </section>

      {:else if currentClientTab === 'reservas'}
        <!-- LIVE ACTIVE SERVICE & EXECUTION TRACKER -->
        <section class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-base-200 border border-base-300 shadow-sm">
            <div>
              <div class="flex items-center gap-2">
                <span class="badge badge-primary font-mono text-xs font-bold">YSF-ORD-001</span>
                <StatusBadge status={fsmState.value as JobOrderStatus} />
              </div>
              <h2 class="text-2xl font-black tracking-tight text-base-content mt-1.5">
                Seguimiento en Vivo de tu Reparación
              </h2>
              <p class="text-xs text-base-content/70">
                Colaborador asignado: <strong>Roberto Morales Ramírez</strong> • Especialista en Plomería
              </p>
            </div>

            <!-- Quick Action Buttons for Client -->
            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-neutral rounded-xl font-bold min-h-[44px]"
                onclick={() => isSecurityPassOpen = true}
              >
                🛡️ Pase de Caseta
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary rounded-xl font-bold min-h-[44px]"
                onclick={() => isChatOpen = true}
              >
                💬 Chat con Técnico
              </button>
            </div>
          </div>

          <!-- Preventive Trade Safety Alert -->
          {#if fsmState.value === 'in_transit'}
            <div class="alert alert-warning text-xs p-3 rounded-2xl">
              <span>⚠️ <strong>Aviso Preventivo de Plomería:</strong> Si la fuga es abundante, cierra la llave de paso general mientras arriba el profesional.</span>
            </div>
          {/if}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <!-- Left: Live GPS Map & Technician Details -->
            <div class="space-y-6">
              <SvgGpsTracker
                etaMinutes={14}
                collaboratorName="Roberto Morales"
                vehicleMode="moto"
                progressPercent={65}
              />
              <TechProfileCard technician={PROS[0]} />
              <VehiclePlateCard plateNumber="M-892-CDMX" vehicleType="moto" />
            </div>

            <!-- Right: Escrow, Quality Proof, and Settlement Flow -->
            <div class="space-y-6">
              <EscrowStatusCard
                amountCents={fsmState.context.totalCustomerCents}
                status={fsmState.value === 'completed' ? 'released' : 'retained'}
              />

              <!-- Hidden Damage Alert Trigger -->
              {#if fsmState.value === 'pending_quote_approval'}
                <div class="card bg-warning/15 border-2 border-warning rounded-3xl p-5 space-y-3 shadow-md">
                  <div class="flex items-center justify-between">
                    <h4 class="font-black text-sm text-warning-content">Aviso de Daño Oculto en Sitio</h4>
                    <span class="badge badge-warning badge-xs font-mono font-bold">ACCION REQUERIDA</span>
                  </div>
                  <p class="text-xs text-base-content/80">
                    El técnico detectó un daño imprevisto y envió la evidencia para tu aprobación.
                  </p>
                  <button
                    type="button"
                    class="btn btn-warning btn-block btn-sm rounded-xl font-bold min-h-[48px]"
                    onclick={() => isSupplementalModalOpen = true}
                  >
                    🔍 Ver Evidencia & Aprobar Sobrecosto ({formatMxn(fsmState.context.supplementalCents)})
                  </button>
                </div>
              {/if}

              <!-- QA Proof and Rating -->
              {#if fsmState.value === 'winding_down' || fsmState.value === 'pending_validation'}
                <div class="space-y-4 card bg-base-200 border border-base-300 rounded-3xl p-5">
                  <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Evidencia Real del Servicio (Antes / Después)
                  </span>
                  <BeforeAfterSlider
                    beforeUrl={beforePhotoUrl}
                    afterUrl={afterPhotoUrl}
                    beforeLabel="Diagnóstico Inicial"
                    afterLabel="Trabajo Finalizado"
                  />

                  {#if fsmState.value === 'pending_validation'}
                    <button
                      type="button"
                      class="btn btn-primary btn-block rounded-xl font-bold min-h-[56px] text-base shadow-lg shadow-primary/20"
                      onclick={() => isReviewSheetOpen = true}
                    >
                      ⭐ Calificar, Firmar & Concluir Servicio
                    </button>
                  {/if}
                </div>
              {:else if fsmState.value === 'completed'}
                <div class="space-y-4">
                  <WarrantyCard certificate={activeWarranty} />
                  <div class="card bg-base-200 border border-base-300 rounded-3xl p-5 space-y-3">
                    <h4 class="font-black text-sm text-base-content">Facturación Electrónica SAT CFDI 4.0</h4>
                    <p class="text-xs text-base-content/70">
                      Descarga tu factura deducible oficial con folio fiscal digital timbrado ante el SAT.
                    </p>
                    <button
                      type="button"
                      class="btn btn-accent btn-block btn-sm rounded-xl font-bold min-h-[48px]"
                      onclick={() => isFiscalInvoiceOpen = true}
                    >
                      📄 Solicitar / Descargar Factura CFDI 4.0
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </section>

      {:else if currentClientTab === 'perfil'}
        <!-- CLIENT PROFILE & SETTINGS -->
        <section class="max-w-2xl mx-auto space-y-6">
          <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-3xl bg-primary text-white font-black text-2xl flex items-center justify-center shadow-lg">
                M
              </div>
              <div>
                <h3 class="text-xl font-black text-base-content">Mariana Garza Lozano</h3>
                <p class="text-xs text-base-content/70 font-mono">+52 55 4198 2300 • Polanco V Secc, CDMX</p>
                <div class="flex gap-2 mt-1.5">
                  <span class="badge badge-success badge-sm font-bold">Membresía Yessyfy+ Activa</span>
                  <span class="badge badge-ghost badge-sm font-mono text-[10px]">RFC: GARM880415XYZ</span>
                </div>
              </div>
            </div>

            <!-- Saved Addresses in CDMX -->
            <div class="space-y-2">
              <span class="text-xs font-bold uppercase text-base-content/70 block">Domicilios Guardados</span>
              <div class="p-3 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold block">🏠 Departamento Polanco (Principal)</span>
                  <span class="text-base-content/60">Av. Horacio 1420, Depto 501, C.P. 11550</span>
                </div>
                <span class="badge badge-neutral badge-xs">Predeterminado</span>
              </div>
            </div>

            <!-- Invoicing History -->
            <div class="space-y-2">
              <span class="text-xs font-bold uppercase text-base-content/70 block">Facturación & Garantías</span>
              <div class="p-3 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold block">YSF-ORD-001 (Plomería)</span>
                  <span class="text-base-content/60">Póliza activa hasta Sep 2026 • CFDI 4.0 emitido</span>
                </div>
                <button type="button" class="btn btn-xs btn-outline" onclick={() => isFiscalInvoiceOpen = true}>
                  Ver Factura
                </button>
              </div>
            </div>
          </div>
        </section>
      {/if}

    {:else}
      <!-- ================================================================= -->
      <!-- COLLABORATOR EXPERIENCE (ROBERTO MORALES FIELD COCKPIT) -->
      <!-- ================================================================= -->
      <section class="space-y-6">
        <!-- Cockpit Header -->
        <div class="card bg-base-200 border-2 border-accent/40 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-accent text-accent-content font-black text-xl flex items-center justify-center shadow">
                🔧
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl font-black text-base-content">Cockpit Técnico: Roberto Morales</h2>
                  <span class="badge badge-success badge-sm font-bold">Activo</span>
                </div>
                <p class="text-xs text-base-content/70">
                  Fontanería & Electricidad • Moto Italika FT150 (M-892-CDMX)
                </p>
              </div>
            </div>

            <!-- Tab pills inside cockpit -->
            <div class="join bg-base-100 p-1 rounded-2xl border border-base-300">
              <button
                type="button"
                class="join-item btn btn-sm {currentCollabTab === 'chamba_activa' ? 'btn-neutral' : 'btn-ghost text-xs'}"
                onclick={() => currentCollabTab = 'chamba_activa'}
              >
                Chamba Activa
              </button>
              <button
                type="button"
                class="join-item btn btn-sm {currentCollabTab === 'billetera' ? 'btn-neutral' : 'btn-ghost text-xs'}"
                onclick={() => currentCollabTab = 'billetera'}
              >
                Billetera & SAT
              </button>
            </div>
          </div>
        </div>

        <!-- RADAR INCOMING JOB ALERT (SIMULATED MODAL) -->
        {#if fsmState.value === 'dispatched' || fsmState.value === 'pending_triage'}
          <div class="card bg-gradient-to-br from-error/20 via-base-200 to-base-100 border-4 border-error rounded-3xl p-6 shadow-2xl space-y-5 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-3xl">🚨</span>
                <h3 class="font-black text-xl text-error">¡NUEVO SERVICIO ENTRADA! (RADAR 5km)</h3>
              </div>
              <div class="w-12 h-12 rounded-full bg-error text-white font-mono font-black text-xl flex items-center justify-center shadow-lg">
                {radarTimerSeconds}s
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div class="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2">
                <span class="text-[10px] uppercase font-bold text-base-content/60">Detalles de la Chamba</span>
                <h4 class="font-bold text-base text-base-content">Plomería: Fuga en tarja de cocina</h4>
                <p class="text-base-content/70">Av. Horacio 1420, Depto 501, Polanco • A 2.3 km (14 min en moto)</p>
              </div>

              <div class="p-4 rounded-2xl bg-success/15 border border-success/30 space-y-1">
                <span class="text-[10px] uppercase font-bold text-success">Tu Ganancia Neta SPEI</span>
                <div class="text-3xl font-black font-mono text-success">$617.98 MXN</div>
                <p class="text-[11px] text-base-content/70">Tarifa $810 - Com 15% - Retención SAT (ISR 2.1% + IVA 8%)</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                class="btn btn-outline btn-lg rounded-2xl font-bold min-h-[64px]"
                onclick={() => orderActor.send({ type: 'CANCEL' })}
              >
                Rechazar
              </button>
              <button
                type="button"
                class="btn btn-success text-white btn-lg rounded-2xl font-black text-lg min-h-[64px] shadow-xl"
                onclick={() => {
                  orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'usr_t1' });
                  orderActor.send({ type: 'START_TRANSIT', etaMinutes: 14 });
                }}
              >
                ACEPTAR CHAMBA ($617.98)
              </button>
            </div>
          </div>
        {/if}

        {#if currentCollabTab === 'chamba_activa'}
          <!-- ACTIVE FIELD EXECUTION CONSOLE -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <!-- Left: Transit, Navigation & Geofence -->
            <div class="card bg-base-200 border border-base-300 rounded-3xl p-5 space-y-5">
              <div class="flex items-center justify-between">
                <h3 class="font-black text-base text-base-content">Tránsito & Ruta en Vivo</h3>
                <StatusBadge status={fsmState.value as JobOrderStatus} />
              </div>

              <!-- 1-Tap Waze Deep-link -->
              <div class="grid grid-cols-2 gap-2">
                <a
                  href="https://waze.com/ul?q=Horacio+1420+Polanco+CDMX"
                  target="_blank"
                  rel="noreferrer"
                  class="btn btn-neutral btn-sm rounded-xl font-bold min-h-[48px] text-xs"
                >
                  🚗 Abrir en Waze
                </a>
                <a
                  href="https://maps.google.com/?q=Horacio+1420+Polanco+CDMX"
                  target="_blank"
                  rel="noreferrer"
                  class="btn btn-outline btn-sm rounded-xl font-bold min-h-[48px] text-xs"
                >
                  🗺️ Google Maps
                </a>
              </div>

              <!-- Geofence 150m Check-in -->
              <div class="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-3">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-base-content/70">Distancia al Domicilio:</span>
                  <span class="font-mono font-bold text-success">110 metros (Dentro de geocerca)</span>
                </div>

                {#if fsmState.value === 'in_transit'}
                  <button
                    type="button"
                    class="btn btn-primary btn-block rounded-xl font-black min-h-[56px] text-base"
                    onclick={() => orderActor.send({ type: 'ARRIVE_ON_SITE', distanceMeters: 110 })}
                  >
                    ✓ LLEGUÉ AL DOMICILIO (CHECK-IN)
                  </button>
                  <button
                    type="button"
                    class="btn btn-error btn-outline btn-block btn-xs mt-1"
                    onclick={() => orderActor.send({ type: 'CUSTOMER_NO_SHOW' })}
                  >
                    ⏱️ Esperé 10 min y no salieron (Cobrar $250 No-Show)
                  </button>
                {/if}
              </div>

              <!-- In-App Chat Trigger for Collaborator -->
              <button
                type="button"
                class="btn btn-ghost border border-base-300 btn-block btn-sm rounded-xl font-bold min-h-[44px]"
                onclick={() => isChatOpen = true}
              >
                💬 Chat con Cliente (Mariana Garza)
              </button>
            </div>

            <!-- Right: On-Site Camera QA & Hidden Damage -->
            <div class="card bg-base-200 border border-base-300 rounded-3xl p-5 space-y-5">
              <h3 class="font-black text-base text-base-content">Acciones en Sitio</h3>

              <!-- On-Site Hidden Damage Button -->
              {#if fsmState.value === 'in_progress'}
                <div class="p-4 rounded-2xl bg-warning/10 border border-warning/30 space-y-3">
                  <span class="text-xs font-bold text-warning-content block">¿Encontraste un daño imprevisto?</span>
                  <button
                    type="button"
                    class="btn btn-warning btn-sm btn-block rounded-xl font-bold min-h-[48px]"
                    onclick={() => {
                      orderActor.send({
                        type: 'PROPOSE_SUPPLEMENTAL_QUOTE',
                        supplementalCents: 20000,
                        reason: 'Tubería de cobre reventada detrás del muro con fuga activa',
                      });
                    }}
                  >
                    ⚠️ Reportar Daño Oculto (+$200 MXN)
                  </button>
                </div>
              {/if}

              <!-- Camera QA Evidence with GPS Watermark -->
              <div class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">
                  Cámara de Evidencia Técnica (Sello GPS)
                </span>
                <PhotoUploader
                  phase={fsmState.value === 'in_progress' ? 'diagnostic_before' : 'proof_finished'}
                  jobCode="YSF-ORD-001"
                  latitude={19.4326}
                  longitude={-99.1332}
                  onPhotoCaptured={(photo) => {
                    if (photo.phase === 'diagnostic_before') {
                      beforePhotoUrl = photo.dataUrl;
                    } else {
                      afterPhotoUrl = photo.dataUrl;
                    }
                    orderActor.send({
                      type: 'ADD_PHOTO',
                      photo: {
                        phase: photo.phase,
                        imageUrl: photo.dataUrl,
                        sha256: photo.sha256,
                        latitude: photo.latitude,
                        longitude: photo.longitude,
                      },
                    });
                  }}
                />
              </div>

              <!-- Lifecycle Progression Buttons -->
              {#if fsmState.value === 'in_progress'}
                <button
                  type="button"
                  class="btn btn-neutral btn-block rounded-xl font-bold min-h-[52px]"
                  onclick={() => orderActor.send({ type: 'START_WIND_DOWN' })}
                >
                  Iniciar Pruebas Finales (Hermeticidad)
                </button>
              {:else if fsmState.value === 'winding_down'}
                <button
                  type="button"
                  class="btn btn-success text-white btn-block rounded-xl font-bold min-h-[52px]"
                  onclick={() => orderActor.send({ type: 'SUBMIT_QA' })}
                >
                  Enviar Evidencia a Validación del Cliente
                </button>
              {/if}
            </div>
          </div>

        {:else if currentCollabTab === 'billetera'}
          <!-- COLLABORATOR SAT EARNINGS WALLET -->
          <div class="max-w-2xl mx-auto space-y-6">
            <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-5">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs text-base-content/60 block">Saldo Acumulado de la Semana</span>
                  <h3 class="text-3xl font-black font-mono text-success">$3,840.50 MXN</h3>
                </div>
                <span class="badge badge-success font-bold text-xs p-2.5">Corte: Martes 10:00 AM</span>
              </div>

              <div class="p-4 rounded-2xl bg-base-100 border border-base-300 text-xs space-y-2 font-mono">
                <div class="font-sans font-bold text-sm text-base-content pb-1 border-b border-base-300">
                  Desglose Fiscal de Última Orden (#YSF-ORD-001)
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Tarifa Cobrada al Cliente:</span>
                  <span>$810.00 MXN</span>
                </div>
                <div class="flex justify-between text-error">
                  <span>(-) Comisión Yessyfy (15%):</span>
                  <span>-$121.50 MXN</span>
                </div>
                <div class="flex justify-between text-error">
                  <span>(-) Retención SAT ISR (2.1% Art. 113-A):</span>
                  <span>-$14.66 MXN</span>
                </div>
                <div class="flex justify-between text-error">
                  <span>(-) Retención SAT IVA (8% Art. 18-J):</span>
                  <span>-$55.86 MXN</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-base-300 font-bold text-sm text-success">
                  <span>(=) Dispersión Neta SPEI a tu Banco:</span>
                  <span>$617.98 MXN</span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-base-100 border border-base-300 text-xs flex justify-between items-center">
                <div>
                  <span class="text-[10px] text-base-content/60 block">Cuenta CLABE para Depósitos SPEI</span>
                  <span class="font-mono font-bold">BBVA •••• •••• 6789</span>
                </div>
                <span class="badge badge-neutral badge-xs">Verificada</span>
              </div>
            </div>
          </div>
        {/if}
      </section>
    {/if}
  </main>

  <!-- ================================================================= -->
  <!-- MODALS & DRAWERS SHARED ACROSS EXPERIENCES -->
  <!-- ================================================================= -->
  <!-- 1. Auth SMS OTP Modal -->
  <AuthOtpModal
    open={isAuthModalOpen}
    onClose={() => isAuthModalOpen = false}
    onAuthenticated={(u) => authenticatedUser = u}
  />

  <!-- 2. In-App Chat Drawer with Contact Masking -->
  <InAppChatDrawer
    open={isChatOpen}
    jobCode="YSF-ORD-001"
    peerName={roleMode === 'cliente' ? 'Roberto Morales Ramírez' : 'Mariana Garza'}
    peerRole={roleMode === 'cliente' ? 'collaborator' : 'customer'}
    currentUserRole={roleMode === 'cliente' ? 'client' : 'collaborator'}
    onClose={() => isChatOpen = false}
  />

  <!-- 3. Residential Gatehouse Security Pass -->
  <AccessSecurityPass
    open={isSecurityPassOpen}
    collaboratorName="Roberto Morales Ramírez"
    verificationCode="YSF-VER-0982"
    vehicleType="Motocicleta"
    vehicleModel="Italika FT150 Roja"
    plateNumber="M-892-CDMX"
    destinationAddress="Av. Horacio 1420, Depto 501, Polanco"
    onClose={() => isSecurityPassOpen = false}
  />

  <!-- 4. Hidden Damage Supplemental Approval Modal -->
  <SupplementalApprovalModal
    open={isSupplementalModalOpen}
    reason={fsmState.context.supplementalReason || 'Tubería de cobre picada con fuga oculta dentro del muro'}
    supplementalCents={fsmState.context.supplementalCents || 20000}
    partsCostCents={12000}
    laborCostCents={8000}
    onApprove={() => {
      orderActor.send({ type: 'APPROVE_SUPPLEMENTAL_QUOTE' });
      isSupplementalModalOpen = false;
    }}
    onReject={() => {
      orderActor.send({ type: 'REJECT_SUPPLEMENTAL_QUOTE' });
      isSupplementalModalOpen = false;
    }}
  />

  <!-- 5. Client Review, Rating and Digital Signature Pad -->
  <ClientReviewAndRatingSheet
    open={isReviewSheetOpen}
    collaboratorName="Roberto Morales"
    jobCode="YSF-ORD-001"
    onClose={() => isReviewSheetOpen = false}
    onSubmit={(review) => {
      orderActor.send({ type: 'VALIDATE_OK', rating: review.rating });
      orderActor.send({ type: 'SETTLE_PAYOUT', warrantyCertificateId: 'YSF-WAR-001' });
      isReviewSheetOpen = false;
    }}
  />

  <!-- 6. SAT CFDI 4.0 Fiscal Invoice Drawer -->
  <FiscalInvoiceDrawer
    open={isFiscalInvoiceOpen}
    jobCode="YSF-ORD-001"
    totalCents={fsmState.context.totalCustomerCents}
    onClose={() => isFiscalInvoiceOpen = false}
  />

  <!-- 7. Booking Bottom Sheet (Mobile) -->
  <BottomSheet
    open={isBookingSheetOpen}
    title="Cotizar Reparación con Garantía"
    onClose={() => isBookingSheetOpen = false}
  >
    <CotizadorWidget {isMember} onBook={handleBookService} />
  </BottomSheet>

  <!-- Mobile DaisyUI Dock Navigation (for Client Mode) -->
  {#if roleMode === 'cliente'}
    <div class="dock md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300">
      <button
        type="button"
        class="{currentClientTab === 'inicio' ? 'dock-active text-primary' : 'text-base-content/70'}"
        onclick={() => currentClientTab = 'inicio'}
      >
        <span class="text-xl">🏠</span>
        <span class="dock-label text-[10px] font-bold">Inicio</span>
      </button>

      <button
        type="button"
        class="{currentClientTab === 'buscar' ? 'dock-active text-primary' : 'text-base-content/70'}"
        onclick={() => currentClientTab = 'buscar'}
      >
        <span class="text-xl">🔍</span>
        <span class="dock-label text-[10px] font-bold">Buscar</span>
      </button>

      <button
        type="button"
        class="text-primary font-black"
        onclick={() => isBookingSheetOpen = true}
      >
        <span class="text-2xl">⚡</span>
        <span class="dock-label text-[10px] font-bold">Cotizar</span>
      </button>

      <button
        type="button"
        class="{currentClientTab === 'reservas' ? 'dock-active text-primary' : 'text-base-content/70'}"
        onclick={() => currentClientTab = 'reservas'}
      >
        <span class="text-xl">📍</span>
        <span class="dock-label text-[10px] font-bold">Servicio</span>
      </button>

      <button
        type="button"
        class="{currentClientTab === 'perfil' ? 'dock-active text-primary' : 'text-base-content/70'}"
        onclick={() => currentClientTab = 'perfil'}
      >
        <span class="text-xl">👤</span>
        <span class="dock-label text-[10px] font-bold">Perfil</span>
      </button>
    </div>
  {/if}
</div>
