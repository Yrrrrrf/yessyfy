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
  type LocationType,
  type ServiceCategory,
  type TechnicianRecord,
  type UrgencyLevel,
  type WarrantyCertificate,
} from '@sdk';
import { serviceOrderMachine } from '@sdk/state';
import { createActor } from 'xstate';

// Tab navigation: mobile 4 tabs or desktop sections
type TabMode = 'inicio' | 'buscar' | 'reservas' | 'perfil';
let currentTab = $state<TabMode>('inicio');

// Membership Yessyfy+ toggle
let isAnnualBilling = $state(false);
let isMember = $state(false);

// Search & Filter State
let searchQuery = $state('');
let filterTrade = $state<ServiceCategory | 'todos'>('todos');
let isBookingSheetOpen = $state(false);

// Active Service Order FSM Actor
const orderActor = createActor(serviceOrderMachine);
orderActor.start();

let fsmState = $state(orderActor.getSnapshot());
orderActor.subscribe((snap) => {
  fsmState = snap;
});

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
  {
    id: 'tech_03',
    userId: 'usr_t3',
    user: {
      id: 'usr_t3',
      fullName: 'Miguel Ángel Domínguez',
      phone: '+525566778899',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['cerrajeria'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine3.jpg' },
    clabe: '012180005544332211',
    operationalState: 'idle',
    ratingAvg: 4.92,
    jobsCompleted: 210,
    cancellationRate: 0.0,
    updatedAt: new Date().toISOString(),
    distanceKm: 1.5,
    etaMin: 9,
    priceFromCents: 40000,
  },
  {
    id: 'tech_04',
    userId: 'usr_t4',
    user: {
      id: 'usr_t4',
      fullName: 'David Vargas Pacheco',
      phone: '+525588771122',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['mantenimiento_hogar', 'albanileria'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine4.jpg' },
    clabe: '012180007766554433',
    operationalState: 'idle',
    ratingAvg: 4.85,
    jobsCompleted: 76,
    cancellationRate: 0.01,
    updatedAt: new Date().toISOString(),
    distanceKm: 4.1,
    etaMin: 26,
    priceFromCents: 40000,
  },
];

const filteredPros = $derived(
  PROS.filter((p) => {
    const matchesTrade = filterTrade === 'todos' || p.trades.includes(filterTrade);
    const matchesQuery = !searchQuery || (p.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesTrade && matchesQuery;
  }),
);

// Warranty Certificate for Completed Orders
const activeWarranty: WarrantyCertificate = {
  id: 'war_001',
  certificateNumber: 'YSF-WAR-2026-0881',
  jobOrderId: 'YSF-ORD-001',
  customerId: 'usr_cust_01',
  collaboratorId: 'usr_t1',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: new Date().toISOString(),
};

function handleBookService(details: { category: ServiceCategory; totalCents: number }) {
  orderActor.send({
    type: 'SUBMIT_REQUEST',
    customerId: 'usr_customer_web',
    category: details.category,
    locationType: 'residencial',
    urgency: 'normal',
    totalCustomerCents: details.totalCents,
  });
  orderActor.send({ type: 'DISPATCH' });
  orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'usr_t1' });
  orderActor.send({ type: 'START_TRANSIT', etaMinutes: 14 });
  currentTab = 'reservas';
  isBookingSheetOpen = false;
}
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col pb-24 md:pb-8">
  <!-- Brand Navigation Header -->
  <header class="navbar bg-base-100/95 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-4 md:px-8">
    <div class="navbar-start flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-md">
        Y
      </div>
      <div>
        <span class="font-black text-xl tracking-tight text-base-content">Yessyfy</span>
        <span class="badge badge-primary badge-xs ml-1.5 font-bold">CDMX / ZMVM</span>
      </div>
    </div>

    <!-- Desktop Navigation Links -->
    <div class="navbar-center hidden md:flex items-center gap-1">
      <button
        type="button"
        class="btn btn-sm {currentTab === 'inicio' ? 'btn-neutral' : 'btn-ghost'}"
        onclick={() => currentTab = 'inicio'}
      >
        Inicio
      </button>
      <button
        type="button"
        class="btn btn-sm {currentTab === 'buscar' ? 'btn-neutral' : 'btn-ghost'}"
        onclick={() => currentTab = 'buscar'}
      >
        Buscar Profesionales
      </button>
      <button
        type="button"
        class="btn btn-sm {currentTab === 'reservas' ? 'btn-neutral' : 'btn-ghost'}"
        onclick={() => currentTab = 'reservas'}
      >
        Mi Servicio en Vivo
        {#if fsmState.value !== 'draft' && fsmState.value !== 'completed'}
          <span class="relative flex h-2 w-2 ml-1">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        {/if}
      </button>
    </div>

    <div class="navbar-end flex items-center gap-2">
      <button
        type="button"
        class="btn btn-outline btn-sm rounded-xl font-bold hidden sm:inline-flex"
        onclick={() => currentTab = 'perfil'}
      >
        Soy Profesional
      </button>
      <button
        type="button"
        class="btn btn-primary btn-sm rounded-xl font-bold shadow-sm min-h-[44px]"
        onclick={() => isBookingSheetOpen = true}
      >
        Pedir Servicio
      </button>
    </div>
  </header>

  <!-- Main Viewport -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 space-y-12">
    {#if currentTab === 'inicio'}
      <!-- HERO SECTION -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <span>🛡️</span>
            <span>Garantía de 30 Días & Custodia Escrow</span>
          </div>

          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-base-content">
            Cuando algo se rompe en casa, <span class="text-primary underline decoration-wavy decoration-primary/30">la tranquilidad</span> se repara aquí.
          </h1>

          <p class="text-base sm:text-lg text-base-content/80 leading-relaxed max-w-xl">
            Conectamos tu hogar con <strong>profesionales independientes verificados</strong> bajo cotizaciones transparentes. Tus fondos se resguardan en custodia hasta tu firma de conformidad.
          </p>

          <!-- Triple Guarantee Chips -->
          <div class="flex flex-wrap gap-2.5 pt-1">
            <TrustBadge kind="kyc_verified" />
            <TrustBadge kind="insurance_500k" />
            <TrustBadge kind="warranty_30d" />
          </div>

          <!-- Quick Action Buttons -->
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
              onclick={() => currentTab = 'buscar'}
            >
              Ver Directorio de Oficios
            </button>
          </div>
        </div>

        <div class="lg:col-span-5">
          <CotizadorWidget onBook={handleBookService} />
        </div>
      </section>

      <!-- 6 CORE TRADE VERTICALS -->
      <section class="space-y-6 pt-8 border-t border-base-300">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 class="text-2xl font-black tracking-tight text-base-content">
              Nuestros 6 Oficios Certificados
            </h2>
            <p class="text-xs text-base-content/70">
              Colaboradores técnicos independientes rigurosamente evaluados con antecedentes, seguro y herramientas.
            </p>
          </div>
          <button
            type="button"
            class="text-xs text-primary font-bold hover:underline"
            onclick={() => currentTab = 'buscar'}
          >
            Ver todos los profesionales →
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each Object.values(TRADE_META_REGISTRY) as trade}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="card bg-base-200/60 border border-base-300 rounded-3xl p-5 hover:border-primary cursor-pointer transition-all group"
              onclick={() => {
                filterTrade = trade.id;
                currentTab = 'buscar';
              }}
            >
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr {trade.gradientClass} text-white flex items-center justify-center text-2xl shadow-md mb-3">
                {trade.emoji}
              </div>
              <h3 class="font-extrabold text-base text-base-content">{trade.name}</h3>
              <p class="text-xs text-base-content/70 mt-1 leading-relaxed">
                Reparaciones con refacciones originales y garantía formal por escrito.
              </p>
              <div class="mt-4 pt-3 border-t border-base-300/60 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Desde $400 MXN</span>
                <span class="text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">Ver →</span>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- 3 STEPS TO PEACE OF MIND -->
      <section class="space-y-6 pt-8 border-t border-base-300">
        <div class="text-center max-w-lg mx-auto">
          <h2 class="text-2xl font-black tracking-tight text-base-content">
            Reparaciones sin sorpresas en 3 pasos
          </h2>
          <p class="text-xs text-base-content/70 mt-1">
            El sistema de protección que garantiza trabajo bien hecho o tu dinero de vuelta.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center text-lg">
              1
            </div>
            <h3 class="font-bold text-base text-base-content">Pides y Cotizas en 60 Segundos</h3>
            <p class="text-xs text-base-content/70 leading-relaxed">
              Eliges el oficio y recibes presupuesto fijo. Tus fondos quedan en custodia Escrow; nadie cobra por adelantado.
            </p>
          </div>

          <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-accent/20 text-accent font-black flex items-center justify-center text-lg">
              2
            </div>
            <h3 class="font-bold text-base text-base-content">Profesional Certificado en Camino</h3>
            <p class="text-xs text-base-content/70 leading-relaxed">
              Sigue la ruta en tiempo real. El colaborador toma fotos diagnósticas obligatorias con marca de agua antes de intervenir.
            </p>
          </div>

          <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-success/20 text-success font-black flex items-center justify-center text-lg">
              3
            </div>
            <h3 class="font-bold text-base text-base-content">Revisas y se Activa la Garantía</h3>
            <p class="text-xs text-base-content/70 leading-relaxed">
              Comparas el antes y después. Al firmar de conformidad, se dispersa el pago y recibes tu póliza digital de 30 días.
            </p>
          </div>
        </div>
      </section>

      <!-- YESSYFY+ MEMBERSHIP BANNER -->
      <section class="card bg-gradient-to-r from-secondary to-base-300 text-white rounded-3xl p-8 shadow-xl">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2 max-w-xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold">
              <span>⭐</span>
              <span>Membresía Yessyfy+</span>
            </div>
            <h3 class="text-2xl sm:text-3xl font-black">
              15% de descuento en todos tus servicios del año
            </h3>
            <p class="text-xs text-white/80 leading-relaxed">
              Incluye 2 visitas diagnósticas sin costo, atención prioritaria en contingencias 24/7 y ampliación de garantía a 60 días.
            </p>
          </div>

          <div class="flex flex-col items-center md:items-end gap-3">
            <div class="join bg-black/20 p-1 rounded-2xl">
              <button
                type="button"
                class="join-item btn btn-xs {!isAnnualBilling ? 'btn-primary' : 'btn-ghost text-white'}"
                onclick={() => isAnnualBilling = false}
              >
                Mensual ($149)
              </button>
              <button
                type="button"
                class="join-item btn btn-xs {isAnnualBilling ? 'btn-primary' : 'btn-ghost text-white'}"
                onclick={() => isAnnualBilling = true}
              >
                Anual ($1,490) <span class="badge badge-accent badge-xs">2 meses gratis</span>
              </button>
            </div>

            <button
              type="button"
              class="btn btn-primary font-bold rounded-2xl min-h-[52px] px-6 text-sm shadow-md"
              onclick={() => isMember = !isMember}
            >
              {isMember ? '✓ Membresía Activa' : 'Activar Yessyfy+'}
            </button>
          </div>
        </div>
      </section>

    {:else if currentTab === 'buscar'}
      <!-- SEARCH & DIRECTORY VIEW -->
      <section class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black tracking-tight text-base-content">
              Profesionales Independientes Verificados
            </h2>
            <p class="text-xs text-base-content/70">
              Conoce las calificaciones, antecedentes validados y tiempos de respuesta en tu zona.
            </p>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre o servicio..."
            bind:value={searchQuery}
            class="input input-bordered w-full md:w-72 rounded-2xl text-xs"
          />
        </div>

        <!-- Trade Filter Chips -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-sm rounded-full text-xs {filterTrade === 'todos' ? 'btn-neutral' : 'btn-ghost border border-base-300'}"
            onclick={() => filterTrade = 'todos'}
          >
            Todos los oficios
          </button>
          {#each Object.values(TRADE_META_REGISTRY) as trade}
            <button
              type="button"
              class="btn btn-sm rounded-full text-xs {filterTrade === trade.id ? 'btn-primary' : 'btn-ghost border border-base-300'}"
              onclick={() => filterTrade = trade.id}
            >
              <span>{trade.emoji}</span>
              <span>{trade.name}</span>
            </button>
          {/each}
        </div>

        <!-- Pros Grid -->
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
                  orderActor.send({
                    type: 'SUBMIT_REQUEST',
                    customerId: 'usr_c1',
                    category: pro.trades[0],
                    locationType: 'residencial',
                    urgency: 'normal',
                    totalCustomerCents: pro.priceFromCents,
                  });
                  orderActor.send({ type: 'DISPATCH' });
                  orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: pro.userId });
                  orderActor.send({ type: 'START_TRANSIT', etaMinutes: pro.etaMin });
                  currentTab = 'reservas';
                }}
              >
                Solicitar Visita con Garantía
              </button>
            </div>
          {/each}
        </div>
      </section>

    {:else if currentTab === 'reservas'}
      <!-- ACTIVE SERVICE & LIVE EXECUTION TRACKER -->
      <section class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-base-200 border border-base-300 shadow-sm">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-primary font-mono text-xs font-bold">YSF-ORD-001</span>
              <StatusBadge status={fsmState.value as JobOrderStatus} />
            </div>
            <h2 class="text-2xl font-black tracking-tight text-base-content mt-1.5">
              Seguimiento de tu Reparación
            </h2>
            <p class="text-xs text-base-content/70">
              Colaborador asignado: <strong>Roberto Morales Ramírez</strong> • Especialista en Plomería
            </p>
          </div>

          <!-- Trade-specific Safety Alert -->
          {#if fsmState.value === 'in_transit'}
            <div class="alert alert-warning text-xs p-3 rounded-2xl max-w-sm">
              <span>⚠️ <strong>Aviso de Plomería:</strong> Si la fuga es abundante, cierra la llave de paso general mientras llega el profesional.</span>
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <!-- Column 1: Map Telemetry & Technician Profile -->
          <div class="space-y-6">
            <SvgGpsTracker
              etaMinutes={14}
              collaboratorName="Roberto Morales"
              vehicleMode="moto"
            />
            <TechProfileCard technician={PROS[0]} />
            <VehiclePlateCard plateNumber="M-892-CDMX" vehicleType="moto" />
          </div>

          <!-- Column 2: Escrow, Photos, and Warranty Flow -->
          <div class="space-y-6">
            <EscrowStatusCard
              amountCents={fsmState.context.totalCustomerCents}
              status={fsmState.value === 'completed' ? 'released' : 'retained'}
            />

            {#if fsmState.value === 'in_progress' || fsmState.value === 'pending_quote_approval'}
              <!-- Supplemental On-Site Quote Notification -->
              {#if fsmState.value === 'pending_quote_approval'}
                <div class="card bg-warning/10 border-2 border-warning rounded-3xl p-5 space-y-3">
                  <h4 class="font-black text-sm text-warning-content">Aviso de Daño Oculto en Sitio</h4>
                  <p class="text-xs text-base-content/80">
                    El colaborador detectó: <em>"{fsmState.context.supplementalReason || 'Refacciones adicionales requeridas'}"</em>.
                  </p>
                  <div class="flex justify-between items-center text-sm font-bold pt-2 border-t border-warning/30">
                    <span>Sobrecosto Autorizado:</span>
                    <span class="text-primary font-mono">{formatMxn(fsmState.context.supplementalCents)}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline min-h-[48px]"
                      onclick={() => orderActor.send({ type: 'REJECT_SUPPLEMENTAL_QUOTE' })}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-primary min-h-[48px]"
                      onclick={() => orderActor.send({ type: 'APPROVE_SUPPLEMENTAL_QUOTE' })}
                    >
                      Aceptar Sobrecosto
                    </button>
                  </div>
                </div>
              {/if}

              <PhotoUploader
                phase="diagnostic_before"
                jobCode="YSF-ORD-001"
                onPhotoCaptured={(photo) => {
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
            {:else if fsmState.value === 'winding_down' || fsmState.value === 'pending_validation'}
              <div class="space-y-4">
                <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">
                  Comparativa de Calidad Antes / Después
                </span>
                <BeforeAfterSlider
                  beforeUrl="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800"
                  afterUrl="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"
                />

                {#if fsmState.value === 'pending_validation'}
                  <div class="p-4 rounded-2xl bg-base-200 border border-base-300 space-y-3">
                    <p class="text-xs text-base-content/80">
                      Por favor inspecciona la reparación. Si estás conforme con el resultado, firma y califica para liberar el pago en custodia Escrow.
                    </p>
                    <button
                      type="button"
                      class="btn btn-primary btn-block rounded-xl font-bold min-h-[56px] text-base"
                      onclick={() => {
                        orderActor.send({ type: 'VALIDATE_OK', rating: 5 });
                        orderActor.send({ type: 'SETTLE_PAYOUT', warrantyCertificateId: 'YSF-WAR-001' });
                      }}
                    >
                      Firmar Conforme & Activar Garantía (★★★★★)
                    </button>
                  </div>
                {/if}
              </div>
            {:else if fsmState.value === 'completed'}
              <div class="space-y-4">
                <WarrantyCard certificate={activeWarranty} />
                <div class="alert alert-success rounded-2xl text-xs">
                  <span>🎉 <strong>Servicio Concluido:</strong> Tu garantía de 30 días está formalmente registrada. Recibirás tu factura CFDI 4.0 por correo electrónico.</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </section>

    {:else if currentTab === 'perfil'}
      <!-- PROFILE & PRO ENROLLMENT -->
      <section class="max-w-xl mx-auto space-y-6">
        <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 text-center space-y-4">
          <div class="w-16 h-16 rounded-3xl bg-primary/20 text-primary font-black text-2xl flex items-center justify-center mx-auto">
            👤
          </div>
          <div>
            <h3 class="text-xl font-black text-base-content">Portal de Colaboradores Técnicos</h3>
            <p class="text-xs text-base-content/70 mt-1">
              ¿Eres profesional independiente en plomería, electricidad o cerrajería? Gana sin comisiones abusivas y cobra puntualmente por SPEI.
            </p>
          </div>

          <div class="space-y-2 text-xs text-left p-4 rounded-2xl bg-base-100 border border-base-300">
            <div class="flex items-center gap-2">
              <span class="text-primary font-bold">✓</span>
              <span>Sin horario forzoso ni exclusividad (Código de Comercio Arts. 273-308)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-primary font-bold">✓</span>
              <span>Dispersión automática a tu cuenta CLABE</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-primary font-bold">✓</span>
              <span>Retenciones fiscales automáticas ante el SAT (LISR / LIVA)</span>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-primary btn-block rounded-2xl font-bold min-h-[56px] text-base"
          >
            Registrarme como Profesional Independiente
          </button>
        </div>
      </section>
    {/if}
  </main>

  <!-- Mobile Bottom Sheet for Quick Booking -->
  <BottomSheet
    open={isBookingSheetOpen}
    title="Cotizar Reparación Transparente"
    onClose={() => isBookingSheetOpen = false}
  >
    <CotizadorWidget onBook={handleBookService} />
  </BottomSheet>

  <!-- Mobile DaisyUI Dock Navigation -->
  <div class="dock md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300">
    <button
      type="button"
      class="{currentTab === 'inicio' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => currentTab = 'inicio'}
    >
      <span class="text-xl">🏠</span>
      <span class="dock-label text-[10px] font-bold">Inicio</span>
    </button>

    <button
      type="button"
      class="{currentTab === 'buscar' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => currentTab = 'buscar'}
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
      class="{currentTab === 'reservas' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => currentTab = 'reservas'}
    >
      <span class="text-xl">📍</span>
      <span class="dock-label text-[10px] font-bold">Servicio</span>
    </button>

    <button
      type="button"
      class="{currentTab === 'perfil' ? 'dock-active text-primary' : 'text-base-content/70'}"
      onclick={() => currentTab = 'perfil'}
    >
      <span class="text-xl">👤</span>
      <span class="dock-label text-[10px] font-bold">Perfil</span>
    </button>
  </div>
</div>
