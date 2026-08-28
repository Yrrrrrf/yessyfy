<script lang="ts">
import {
  BeforeAfterSlider,
  BottomSheet,
  CotizadorWidget,
  EscrowStatusCard,
  PhotoUploader,
  PriceBreakdown,
  StatusBadge,
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
  type PhotoQAPhase,
  type ServiceCategory,
  type TechnicianRecord,
  type WarrantyCertificate,
} from '@sdk';
import { serviceOrderMachine } from '@sdk/state';
import { createActor } from 'xstate';

// Simulated Technician
const mockTechnician: TechnicianRecord = {
  id: 'tech_01',
  userId: 'usr_tech_01',
  user: {
    id: 'usr_tech_01',
    fullName: 'Roberto Morales Ramírez',
    phone: '+525541982301',
    role: 'collaborator',
    status: 'active',
    locale: 'es-MX',
  },
  trades: ['plomeria', 'electricidad'],
  kycStatus: 'verified',
  kycDocuments: {
    ineFrontUrl: 'https://example.com/ine.jpg',
  },
  clabe: '012180001234567890',
  operationalState: 'on_job',
  ratingAvg: 4.9,
  jobsCompleted: 142,
  cancellationRate: 0.01,
  updatedAt: new Date().toISOString(),
};

// Initialize XState actor
const orderActor = createActor(serviceOrderMachine);
orderActor.start();

let currentSnapshot = $state(orderActor.getSnapshot());
orderActor.subscribe((snap) => {
  currentSnapshot = snap;
});

// UI State
let isMobileBookingOpen = $state(false);
let selectedTrade = $state<ServiceCategory>('plomeria');
let activeTab = $state<'landing' | 'live_order'>('landing');

// Mock Warranty Certificate when completed
const mockWarranty: WarrantyCertificate = {
  id: 'war_01',
  certificateNumber: 'YSF-WAR-2026-0881',
  jobOrderId: 'YSF-ORD-001',
  customerId: 'usr_cust_01',
  collaboratorId: 'usr_tech_01',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: new Date().toISOString(),
};

function handleBookFromCotizador(details: { category: ServiceCategory; totalCents: number }) {
  orderActor.send({
    type: 'SUBMIT_REQUEST',
    customerId: 'usr_customer_demo',
    category: details.category,
    locationType: 'residencial',
    urgency: 'normal',
    totalCustomerCents: details.totalCents,
  });
  activeTab = 'live_order';
  isMobileBookingOpen = false;
}
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col pb-24 md:pb-12">
  <!-- Navigation Header -->
  <header class="navbar bg-base-100/90 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-4 md:px-8">
    <div class="navbar-start flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-md">
        Y
      </div>
      <div>
        <span class="font-black text-xl tracking-tight text-base-content">Yessyfy</span>
        <span class="badge badge-primary badge-xs ml-1 font-bold">MÉXICO</span>
      </div>
    </div>

    <div class="navbar-center hidden md:flex items-center gap-2">
      <button
        type="button"
        class="btn btn-sm {activeTab === 'landing' ? 'btn-neutral' : 'btn-ghost'}"
        onclick={() => activeTab = 'landing'}
      >
        Descubrir Servicios
      </button>
      <button
        type="button"
        class="btn btn-sm {activeTab === 'live_order' ? 'btn-primary' : 'btn-ghost'}"
        onclick={() => activeTab = 'live_order'}
      >
        Simulador de Servicio
        <span class="badge badge-xs badge-accent font-mono">FSM</span>
      </button>
    </div>

    <div class="navbar-end flex items-center gap-2">
      <button
        type="button"
        class="btn btn-primary btn-sm rounded-xl font-bold shadow-sm"
        onclick={() => isMobileBookingOpen = true}
      >
        Cotizar Ahora
      </button>
    </div>
  </header>

  <!-- Main Body Content -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 space-y-12">
    {#if activeTab === 'landing'}
      <!-- HERO SECTION -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <span>🛡️</span>
            <span>Managed Marketplace • CDMX y Zona Metropolitana</span>
          </div>

          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-base-content">
            Cuando algo se rompe en casa, <span class="text-primary underline decoration-wavy decoration-primary/30">la tranquilidad</span> se repara aquí.
          </h1>

          <p class="text-base sm:text-lg text-base-content/80 leading-relaxed max-w-xl">
            Conectamos hogares con técnicos verificados, presupuestos transparentes sin cobros sorpresa y una <strong>garantía real de 30 días</strong> respaldada por retención en custodia Escrow.
          </p>

          <!-- Triple Guarantee Chips -->
          <div class="flex flex-wrap gap-2.5 pt-2">
            <TrustBadge kind="kyc_verified" />
            <TrustBadge kind="insurance_500k" />
            <TrustBadge kind="warranty_30d" />
          </div>
        </div>

        <div class="lg:col-span-5">
          <CotizadorWidget onBook={handleBookFromCotizador} />
        </div>
      </section>

      <!-- 6 CORE TRADE VERTICALS -->
      <section class="space-y-6 pt-8 border-t border-base-300">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-base-content">
            Nuestros 6 Oficios Certificados
          </h2>
          <p class="text-sm text-base-content/70">
            Personal rigurosamente evaluado, con herramientas propias y seguro de responsabilidad civil.
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each Object.values(TRADE_META_REGISTRY) as trade}
            <div class="card bg-base-200/60 border border-base-300 rounded-3xl p-5 hover:border-primary transition-all group">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr {trade.gradientClass} text-white flex items-center justify-center text-2xl shadow-md mb-3">
                {trade.emoji}
              </div>
              <h3 class="font-extrabold text-base text-base-content">{trade.name}</h3>
              <p class="text-xs text-base-content/70 mt-1 leading-relaxed">
                Reparaciones inmediatas, refacciones originales y sello de garantía formal.
              </p>
              <div class="mt-4 pt-3 border-t border-base-300/60 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Desde $400 MXN</span>
                <span class="text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">Cotizar →</span>
              </div>
            </div>
          {/each}
        </div>
      </section>

    {:else}
      <!-- LIVE SIMULATION OF MANAGED MARKETPLACE FSM -->
      <section class="space-y-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-base-200 border border-base-300 shadow-sm">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-primary font-mono text-xs">YSF-ORD-001</span>
              <StatusBadge status={currentSnapshot.value as JobOrderStatus} />
            </div>
            <h2 class="text-2xl font-black tracking-tight text-base-content mt-2">
              Simulador del Ciclo Operativo (6-Node Loop)
            </h2>
            <p class="text-xs text-base-content/70 mt-0.5">
              Estado actual de la máquina FSM XState: <strong class="font-mono text-primary">{currentSnapshot.value}</strong>
            </p>
          </div>

          <!-- FSM Control Buttons -->
          <div class="flex flex-wrap gap-2">
            {#if currentSnapshot.value === 'draft'}
              <button
                type="button"
                class="btn btn-sm btn-primary"
                onclick={() => orderActor.send({
                  type: 'SUBMIT_REQUEST',
                  customerId: 'demo_user',
                  category: 'plomeria',
                  locationType: 'residencial',
                  urgency: 'normal',
                  totalCustomerCents: 45000
                })}
              >
                1. Solicitar Pedido
              </button>
            {:else if currentSnapshot.value === 'pending_triage'}
              <button
                type="button"
                class="btn btn-sm btn-info"
                onclick={() => orderActor.send({ type: 'DISPATCH' })}
              >
                2. Despachar a Zona
              </button>
            {:else if currentSnapshot.value === 'dispatched'}
              <button
                type="button"
                class="btn btn-sm btn-accent"
                onclick={() => orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'tech_01' })}
              >
                3. Técnico Acepta
              </button>
            {:else if currentSnapshot.value === 'accepted'}
              <button
                type="button"
                class="btn btn-sm btn-accent"
                onclick={() => orderActor.send({ type: 'START_TRANSIT', etaMinutes: 12 })}
              >
                4. En Camino (/en_camino)
              </button>
            {:else if currentSnapshot.value === 'en_camino'}
              <button
                type="button"
                class="btn btn-sm btn-primary"
                onclick={() => orderActor.send({ type: 'ARRIVE_ON_SITE' })}
              >
                5. Llegar al Domicilio
              </button>
            {:else if currentSnapshot.value === 'in_progress'}
              <button
                type="button"
                class="btn btn-sm btn-warning"
                onclick={() => {
                  orderActor.send({
                    type: 'ADD_PHOTO',
                    photo: {
                      phase: 'diagnostic_before',
                      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
                      sha256: 'sha_diag_before_hash'
                    }
                  });
                  orderActor.send({ type: 'START_WIND_DOWN' });
                }}
              >
                6. Terminar Trabajo
              </button>
            {:else if currentSnapshot.value === 'winding_down'}
              <button
                type="button"
                class="btn btn-sm btn-success"
                onclick={() => {
                  orderActor.send({
                    type: 'ADD_PHOTO',
                    photo: {
                      phase: 'proof_finished',
                      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
                      sha256: 'sha_proof_finished_hash'
                    }
                  });
                  orderActor.send({ type: 'SUBMIT_QA' });
                }}
              >
                7. Subir Fotos QA
              </button>
            {:else if currentSnapshot.value === 'pending_validation'}
              <button
                type="button"
                class="btn btn-sm btn-success"
                onclick={() => orderActor.send({ type: 'VALIDATE_OK', rating: 5 })}
              >
                8. Validar Trabajo (Cliente)
              </button>
            {:else if currentSnapshot.value === 'validated'}
              <button
                type="button"
                class="btn btn-sm btn-primary"
                onclick={() => orderActor.send({ type: 'SETTLE_PAYOUT', warrantyCertificateId: 'YSF-WAR-01' })}
              >
                9. Liberar Pago Escrow & Garantía
              </button>
            {:else if currentSnapshot.value === 'completed'}
              <span class="badge badge-success font-bold p-3">✓ Flujo Completado 100%</span>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Column 1: Live Telemetry & Tech Profile -->
          <div class="space-y-6">
            <SvgGpsTracker
              etaMinutes={12}
              collaboratorName={mockTechnician.user?.fullName}
              vehicleMode="moto"
            />
            <TechProfileCard technician={mockTechnician} />
            <VehiclePlateCard plateNumber="M-892-CDMX" vehicleType="moto" />
          </div>

          <!-- Column 2: Financial Escrow & QA Verification -->
          <div class="space-y-6">
            <EscrowStatusCard
              amountCents={currentSnapshot.context.totalCustomerCents}
              status={currentSnapshot.value === 'completed' ? 'released' : 'retained'}
            />

            {#if currentSnapshot.value === 'completed'}
              <WarrantyCard certificate={mockWarranty} />
            {:else}
              <div class="space-y-4">
                <PhotoUploader
                  phase="diagnostic_before"
                  jobCode="YSF-ORD-001"
                />
                <BeforeAfterSlider
                  beforeUrl="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600"
                  afterUrl="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600"
                />
              </div>
            {/if}
          </div>
        </div>
      </section>
    {/if}
  </main>

  <!-- Mobile Bottom Sheet for Quick Booking -->
  <BottomSheet
    open={isMobileBookingOpen}
    title="Cotizar Reparación"
    onClose={() => isMobileBookingOpen = false}
  >
    <CotizadorWidget onBook={handleBookFromCotizador} />
  </BottomSheet>

  <!-- Mobile Dock Navigation -->
  <div class="dock md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300">
    <button
      type="button"
      class="{activeTab === 'landing' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => activeTab = 'landing'}
    >
      <span class="text-xl">🏠</span>
      <span class="dock-label text-[10px] font-bold">Inicio</span>
    </button>

    <button
      type="button"
      class="text-primary font-black"
      onclick={() => isMobileBookingOpen = true}
    >
      <span class="text-2xl">⚡</span>
      <span class="dock-label text-[10px] font-bold">Cotizar</span>
    </button>

    <button
      type="button"
      class="{activeTab === 'live_order' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => activeTab = 'live_order'}
    >
      <span class="text-xl">📍</span>
      <span class="dock-label text-[10px] font-bold">Servicio</span>
    </button>
  </div>
</div>
