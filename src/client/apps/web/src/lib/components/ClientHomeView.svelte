<script lang="ts">
import { CotizadorWidget, LeafletInteractiveMap, TrustBadge, TRADE_META_REGISTRY, type TechnicianPin } from '@sdk/ui';
import type { ServiceCategory } from '@sdk/core';

export interface BookingDetails {
  category: ServiceCategory;
  totalCents: number;
  scheduleDate: string;
  scheduleTimeSlot: string;
  addressText: string;
  postalCode: string;
  gateInstructions: string;
}

interface Props {
  isMember: boolean;
  hasActiveOrder?: boolean;
  onBook: (details: BookingDetails) => void;
  onSelectTrade: (trade: ServiceCategory) => void;
  onGoToCockpit: () => void;
}

let {
  isMember,
  hasActiveOrder = false,
  onBook,
  onSelectTrade,
  onGoToCockpit,
}: Props = $props();

const AVAILABLE_CDMX_TECHS: TechnicianPin[] = [
  {
    id: 'tech_01',
    name: 'Roberto Morales',
    trade: 'plomeria',
    coords: [19.4358, -99.1852],
    status: 'in_transit',
    etaMin: 14,
    vehicle: 'moto',
    rating: 4.95,
  },
  {
    id: 'tech_02',
    name: 'Ignacio Fuentes',
    trade: 'electricidad',
    coords: [19.4187, -99.1638],
    status: 'available',
    etaMin: 18,
    vehicle: 'auto',
    rating: 4.88,
  },
  {
    id: 'tech_03',
    name: 'Salvador Vega',
    trade: 'cerrajeria',
    coords: [19.3548, -99.1627],
    status: 'available',
    etaMin: 22,
    vehicle: 'moto',
    rating: 4.92,
  },
  {
    id: 'tech_04',
    name: 'Carlos Mendoza',
    trade: 'albanileria',
    coords: [19.3854, -99.1728],
    status: 'available',
    etaMin: 25,
    vehicle: 'auto',
    rating: 4.85,
  },
  {
    id: 'tech_05',
    name: 'Mariano Ríos',
    trade: 'jardineria',
    coords: [19.3628, -99.2592],
    status: 'in_transit',
    etaMin: 20,
    vehicle: 'moto',
    rating: 4.90,
  },
];
</script>

<div class="w-full space-y-16 pb-20">
  <!-- ACTIVE ORDER FLOATING BANNER (If user has an active order) -->
  {#if hasActiveOrder}
    <div class="sticky top-20 z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="card bg-primary text-primary-content p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-primary-content/20 animate-pulse">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🚗</span>
          <div>
            <h4 class="font-black text-sm">Tienes un Servicio Activo en Progreso</h4>
            <p class="text-xs text-primary-content/80">El técnico Roberto Morales está en camino a tu domicilio.</p>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-neutral btn-sm rounded-2xl font-bold shadow-md self-start sm:self-auto"
          onclick={onGoToCockpit}
        >
          Ver Telemetría en Vivo & Mapa →
        </button>
      </div>
    </div>
  {/if}

  <!-- HERO SECTION -->
  <section class="w-full bg-gradient-to-b from-primary/10 via-base-100 to-base-100 border-b border-base-300 py-12 md:py-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      <!-- Left Hero Column: Value Proposition -->
      <div class="lg:col-span-7 space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-xs sm:text-sm">
          <span>🛡️</span>
          <span>Primera Plataforma de Reparaciones con Custodia Escrow en México</span>
        </div>

        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-base-content tracking-tight leading-tight">
          Reparaciones del hogar profesionales, certificadas y <span class="text-primary underline decoration-primary/40">100% protegidas</span> por Escrow.
        </h1>

        <p class="text-sm sm:text-base text-base-content/75 leading-relaxed max-w-2xl">
          Dile adiós a la informalidad, los presupuestos con sorpresas y los anticipos perdidos. Tu dinero se resguarda en custodia legal hasta que el trabajo quede concluido, validado con fotos y firmado a tu total conformidad. Con factura SAT CFDI 4.0 inmediata.
        </p>

        <!-- Trust Badges -->
        <div class="flex flex-wrap gap-2.5 pt-1">
          <TrustBadge kind="kyc_verified" variant="compact" />
          <TrustBadge kind="insurance_500k" variant="compact" />
          <TrustBadge kind="warranty_30d" variant="compact" />
        </div>

        <!-- Key Metrics Bar -->
        <div class="grid grid-cols-3 gap-4 pt-6 border-t border-base-300 max-w-xl">
          <div>
            <div class="text-2xl sm:text-3xl font-black font-mono text-base-content">100%</div>
            <div class="text-[11px] sm:text-xs text-base-content/60 font-medium">Pago en Custodia Escrow</div>
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-black font-mono text-primary">4.95 ★</div>
            <div class="text-[11px] sm:text-xs text-base-content/60 font-medium">Calificación Promedio</div>
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-black font-mono text-accent">30 Días</div>
            <div class="text-[11px] sm:text-xs text-base-content/60 font-medium">Garantía por Escrito</div>
          </div>
        </div>
      </div>

      <!-- Right Hero Column: Cotizador Widget -->
      <div class="lg:col-span-5">
        <div class="card bg-base-100 border-2 border-primary/20 rounded-3xl p-2 sm:p-4 shadow-2xl backdrop-blur-sm">
          <div class="px-4 pt-3 pb-1">
            <h3 class="font-extrabold text-lg text-base-content flex items-center gap-2">
              <span>⚡</span> Cotizador & Reserva Inmediata
            </h3>
            <p class="text-xs text-base-content/60">Calcula el presupuesto cerrado de tu servicio en segundos</p>
          </div>
          <CotizadorWidget
            isMember={isMember}
            onBook={onBook}
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ACTIVE ORDER NOTIFICATION BANNER (If in progress) -->
  {#if hasActiveOrder}
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="card bg-gradient-to-r from-accent/20 via-primary/10 to-base-200 border-2 border-accent/50 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-accent text-accent-content font-black text-2xl flex items-center justify-center shadow-md animate-bounce">
            🔧
          </div>
          <div>
            <span class="badge badge-accent badge-sm font-bold uppercase mb-1">Servicio Activo en Curso</span>
            <h3 class="font-black text-lg text-base-content">Tienes una orden en ejecución con Roberto Morales</h3>
            <p class="text-xs text-base-content/70">Sigue la ruta en vivo del profesional, revisa el pase de caseta o chatea encriptado.</p>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-accent btn-md rounded-2xl font-black text-sm px-6 shadow-md text-accent-content shrink-0"
          onclick={onGoToCockpit}
        >
          Abrir Cockpit de Seguimiento →
        </button>
      </div>
    </section>
  {/if}

  <!-- TRADE CATEGORIES SECTION -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-base-200 border border-base-300 text-base-content/80 font-bold text-xs uppercase tracking-wider">
        Catálogo de Oficios
      </div>
      <h2 class="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
        Técnicos certificados para cada necesidad de tu hogar u oficina
      </h2>
      <p class="text-xs sm:text-sm text-base-content/70">
        Todos nuestros colaboradores independientes pasan por un estricto filtro pericial, revisión de antecedentes penales y validación de identidad con el INE.
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {#each Object.values(TRADE_META_REGISTRY) as trade}
        <button
          type="button"
          class="card bg-base-100 hover:bg-base-200/60 border border-base-300 hover:border-primary/60 rounded-3xl p-5 flex flex-col items-center justify-between text-center transition-all hover:shadow-lg group text-left h-full"
          onclick={() => onSelectTrade(trade.id)}
        >
          <div class="w-16 h-16 rounded-2xl bg-base-200 group-hover:bg-primary/10 flex items-center justify-center text-3xl mb-3 transition-colors">
            {trade.emoji}
          </div>
          <div class="space-y-1 w-full">
            <h4 class="font-bold text-sm text-base-content">{trade.name}</h4>
            <div class="badge badge-ghost badge-xs font-mono font-bold text-[10px]">
              Desde $450 MXN
            </div>
          </div>
          <span class="text-xs font-bold text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            Cotizar →
          </span>
        </button>
      {/each}
    </div>
  </section>

  <!-- HOW IT WORKS: 3-STEP ESCROW MODEL -->
  <section class="w-full bg-base-200/50 border-y border-base-300 py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary font-bold text-xs uppercase tracking-wider">
          Transparencia y Seguridad
        </div>
        <h2 class="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
          ¿Cómo funciona el Modelo Escrow de Yessyfy?
        </h2>
        <p class="text-xs sm:text-sm text-base-content/70">
          Un proceso digital de 3 pasos diseñado para eliminar el riesgo en contrataciones de servicios.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Step 1 -->
        <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-primary text-white font-black text-xl flex items-center justify-center shadow-md">
            1
          </div>
          <h3 class="font-black text-lg text-base-content">Cotiza y Bloquea en Escrow</h3>
          <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
            Obtén un presupuesto cerrado basado en el tabulador oficial. El monto queda resguardado en custodia legal. <strong>El colaborador no recibe el dinero por adelantado.</strong>
          </p>
          <ul class="text-xs space-y-1.5 text-base-content/80 pt-2 font-medium">
            <li class="flex items-center gap-2">✓ Cero anticipos en efectivo</li>
            <li class="flex items-center gap-2">✓ Desglose transparente con IVA</li>
            <li class="flex items-center gap-2">✓ Pago con tarjeta, SPEI o OXXO</li>
          </ul>
        </div>

        <!-- Step 2 -->
        <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-accent text-accent-content font-black text-xl flex items-center justify-center shadow-md">
            2
          </div>
          <h3 class="font-black text-lg text-base-content">Asignación & Llegada en Sitio</h3>
          <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
            Asignamos al profesional más calificado cerca de tu colonia. Sigue su ruta GPS en vivo y comparte su pase digital de acceso para la caseta de vigilancia.
          </p>
          <ul class="text-xs space-y-1.5 text-base-content/80 pt-2 font-medium">
            <li class="flex items-center gap-2">✓ Colaboradores verificados (INE / No Antecedentes)</li>
            <li class="flex items-center gap-2">✓ Pase digital para WhatsApp de vigilancia</li>
            <li class="flex items-center gap-2">✓ Chat encriptado dentro de la plataforma</li>
          </ul>
        </div>

        <!-- Step 3 -->
        <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-success text-white font-black text-xl flex items-center justify-center shadow-md">
            3
          </div>
          <h3 class="font-black text-lg text-base-content">Inspección QA, Firma y Factura</h3>
          <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
            Revisa la evidencia fotográfica Antes vs. Después con sello de tiempo y GPS. Al firmar de conformidad, se libera el pago al técnico y se emite tu factura SAT CFDI 4.0.
          </p>
          <ul class="text-xs space-y-1.5 text-base-content/80 pt-2 font-medium">
            <li class="flex items-center gap-2">✓ Evidencia pericial con SHA-256</li>
            <li class="flex items-center gap-2">✓ Certificado de Garantía de 30 Días</li>
            <li class="flex items-center gap-2">✓ Factura electrónica SAT CFDI 4.0 inmediata</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- WARRANTY & COMPLIANCE SECTION -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="card bg-gradient-to-br from-base-200 via-base-100 to-base-200 border-2 border-primary/30 rounded-3xl p-8 sm:p-12 shadow-xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div class="space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
            Certificación Formal
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-base-content">
            Protección Total para tu Hogar y Cumplimiento SAT
          </h2>
          <p class="text-xs sm:text-sm text-base-content/75 leading-relaxed">
            En Yessyfy formalizamos los oficios tradicionales mediante tecnología fiduciaria y apego a la legislación mexicana. Cada trabajo cuenta con respaldo legal y cobertura de responsabilidad civil de hasta $500,000 MXN.
          </p>
          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="p-3.5 rounded-2xl bg-base-100 border border-base-300 space-y-1">
              <span class="font-bold text-xs text-base-content block">📄 SAT CFDI 4.0</span>
              <p class="text-[11px] text-base-content/60">Timbrado automático con retenciones LISR 113-A e LIVA 18-J.</p>
            </div>
            <div class="p-3.5 rounded-2xl bg-base-100 border border-base-300 space-y-1">
              <span class="font-bold text-xs text-base-content block">🛡️ Garantía 30 Días</span>
              <p class="text-[11px] text-base-content/60">Si la reparación falla, volvemos a intervenir sin costo adicional.</p>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex items-center justify-between border-b border-base-300 pb-3">
            <h4 class="font-bold text-sm text-base-content">Certificado de Garantía Yessyfy</h4>
            <span class="badge badge-success badge-sm font-mono font-bold">ACTIVO</span>
          </div>
          <div class="space-y-2 text-xs font-mono">
            <div class="flex justify-between text-base-content/70">
              <span>Folio de Garantía:</span>
              <span class="font-bold text-base-content">YSF-WAR-2026-CDMX</span>
            </div>
            <div class="flex justify-between text-base-content/70">
              <span>Custodia de Fondos:</span>
              <span class="font-bold text-success">Resguardado en Fideicomiso</span>
            </div>
            <div class="flex justify-between text-base-content/70">
              <span>Vigencia:</span>
              <span class="font-bold text-base-content">30 Días Naturales</span>
            </div>
            <div class="flex justify-between text-base-content/70">
              <span>Seguro de Responsabilidad Civil:</span>
              <span class="font-bold text-primary">$500,000.00 MXN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- LIVE CDMX COVERAGE MAP SECTION -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase mb-2">
          <span>📍</span> Cobertura Metropolitana CDMX
        </div>
        <h2 class="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
          Red de Técnicos Certificados en Tiempo Real
        </h2>
        <p class="text-sm text-base-content/70 mt-1 max-w-2xl">
          Monitoreo geolocalizado de técnicos con antecedentes penales verificados, seguro civil y herramientas periciales en Polanco, Condesa, Del Valle, Roma, Coyoacán y Santa Fe.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="badge badge-success badge-sm font-mono font-bold text-white flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          5 TÉCNICOS DISPONIBLES
        </span>
      </div>
    </div>

    <LeafletInteractiveMap
      heightClass="h-[420px]"
      center={[19.4147, -99.1678]}
      zoom={13}
      technicians={AVAILABLE_CDMX_TECHS}
      clientDestination={{
        name: 'Mi Zona (CDMX)',
        address: 'Zona Metropolitana de la Ciudad de México',
        coords: [19.4326, -99.1912],
        geofenceRadiusMeters: 200,
      }}
    />
  </section>

  <!-- FOOTER -->
  <footer class="w-full bg-base-200 border-t border-base-300 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      <div class="space-y-3 md:col-span-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-primary text-white font-black text-lg flex items-center justify-center">
            Y
          </div>
          <span class="font-black text-xl text-base-content">Yessyfy</span>
          <span class="badge badge-primary badge-xs font-bold">CDMX</span>
        </div>
        <p class="text-xs text-base-content/70 max-w-md leading-relaxed">
          Plataforma tecnológica de intermediación de servicios y oficios para el hogar con custodia fiduciaria Escrow, aseguramiento pericial y cumplimiento fiscal SAT CFDI 4.0.
        </p>
        <p class="text-[11px] text-base-content/50 font-mono">
          © 2026 Yessyfy Technologies S.A.P.I. de C.V. Todos los derechos reservados.
        </p>
      </div>

      <div class="space-y-2 text-xs">
        <h4 class="font-extrabold text-base-content uppercase tracking-wider text-[11px]">Servicios en CDMX</h4>
        <ul class="space-y-1.5 text-base-content/70">
          <li>Plomería y Fugas de Gas</li>
          <li>Electricidad e Instalaciones</li>
          <li>Cerrajería de Emergencia</li>
          <li>Jardinería y Paisajismo</li>
          <li>Albañilería y Acabados</li>
        </ul>
      </div>

      <div class="space-y-2 text-xs">
        <h4 class="font-extrabold text-base-content uppercase tracking-wider text-[11px]">Seguridad & Legal</h4>
        <ul class="space-y-1.5 text-base-content/70">
          <li>Garantía Escrow de 30 Días</li>
          <li>Facturación Electrónica SAT CFDI 4.0</li>
          <li>Términos y Condiciones de Custodia</li>
          <li>Aviso de Privacidad Integral</li>
        </ul>
      </div>
    </div>
  </footer>
</div>
