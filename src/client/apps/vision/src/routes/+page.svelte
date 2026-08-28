<script lang="ts">
import {
  BeforeAfterSlider,
  DetailSheet,
  EscrowStatusCard,
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
  type JobOrder,
  type JobOrderStatus,
  type ServiceCategory,
  type TechnicianRecord,
  type WarrantyCertificate,
} from '@sdk';

// Active Tab in Vision CRM
type VisionTab = 'dispatch' | 'qa_audits' | 'escrow_cfdi' | 'triage_tree';
let currentTab = $state<VisionTab>('dispatch');

// Mock Active Orders in Operations
let orders = $state<JobOrder[]>([
  {
    id: 'ord_101',
    code: 'YSF-2026-0101',
    customerId: 'usr_c1',
    customer: {
      id: 'usr_c1',
      fullName: 'Mariana Garza Lozano',
      phone: '+525541009988',
      role: 'customer',
      status: 'active',
      locale: 'es-MX',
    },
    collaboratorId: 'usr_t1',
    collaborator: {
      id: 'usr_t1',
      fullName: 'Roberto Morales Ramírez',
      phone: '+525541982301',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    category: 'plomeria',
    locationType: 'residencial',
    urgency: 'emergencia_24_7',
    status: 'in_transit',
    coordinates: { lat: 19.4326, lng: -99.1332, latitude: 19.4326, longitude: -99.1332 },
    addressText: 'Av. Horacio 1420, Polanco, CDMX',
    postalCode: '11550',
    description: 'Fuga severa de agua bajo la tarja de cocina, requiere cambio de trampa y llave angular.',
    baseBudgetCents: 45000,
    supplementalCents: 0,
    totalCustomerCents: 81000, // 450 * 1.8 = 810 MXN
    platformFeeCents: 12150,
    collaboratorGrossCents: 68850,
    isrWithheldCents: 1466,
    ivaWithheldCents: 5586,
    collaboratorNetCents: 61798,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    dispatchedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord_102',
    code: 'YSF-2026-0102',
    customerId: 'usr_c2',
    customer: {
      id: 'usr_c2',
      fullName: 'Carlos Slim Helú Jr.',
      phone: '+525521998877',
      role: 'customer',
      status: 'active',
      locale: 'es-MX',
    },
    collaboratorId: 'usr_t2',
    collaborator: {
      id: 'usr_t2',
      fullName: 'Ignacio Fuentes Silva',
      phone: '+525533112244',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    category: 'electricidad',
    locationType: 'premium',
    urgency: 'mismo_dia',
    status: 'pending_validation',
    coordinates: { lat: 19.3621, lng: -99.1687, latitude: 19.3621, longitude: -99.1687 },
    addressText: 'Coyoacán Centro, CDMX',
    postalCode: '04000',
    description: 'Cortocircuito en tablero general e instalación de 4 pastillas termomagnéticas.',
    baseBudgetCents: 50000,
    supplementalCents: 20000,
    totalCustomerCents: 97500, // (500 * 1.5 * 1.3) = 975 MXN
    platformFeeCents: 14625,
    collaboratorGrossCents: 82875,
    isrWithheldCents: 1765,
    ivaWithheldCents: 6724,
    collaboratorNetCents: 74386,
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    arrivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord_103',
    code: 'YSF-2026-0103',
    customerId: 'usr_c3',
    customer: {
      id: 'usr_c3',
      fullName: 'Fernanda Montes',
      phone: '+525599881122',
      role: 'customer',
      status: 'active',
      locale: 'es-MX',
    },
    collaboratorId: 'usr_t3',
    collaborator: {
      id: 'usr_t3',
      fullName: 'Miguel Ángel Domínguez',
      phone: '+525566778899',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    category: 'cerrajeria',
    locationType: 'residencial',
    urgency: 'normal',
    status: 'disputed',
    coordinates: { lat: 19.4121, lng: -99.1722, latitude: 19.4121, longitude: -99.1722 },
    addressText: 'Colonia Condesa, CDMX',
    postalCode: '06140',
    description: 'Apertura de chapa de alta seguridad y cambio de cilindro Yale.',
    baseBudgetCents: 40000,
    supplementalCents: 0,
    totalCustomerCents: 40000,
    platformFeeCents: 6000,
    collaboratorGrossCents: 34000,
    isrWithheldCents: 724,
    ivaWithheldCents: 2758,
    collaboratorNetCents: 30518,
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
]);

// Selected Job for Inspector Sheet
let selectedJob = $state<JobOrder | null>(null);

// Pricing Breakdown for Selected Job
const selectedBreakdown = $derived(
  selectedJob
    ? calculateJobPricing(selectedJob.baseBudgetCents, {
        locationType: selectedJob.locationType,
        urgency: selectedJob.urgency,
      }, { supplementalCents: selectedJob.supplementalCents })
    : null,
);

// 14-Node Conversational Shortcut Map with WhatsApp Template Copy
interface ShortcutNode {
  token: string;
  name: string;
  count: number;
  category: string;
  recipient: 'Cliente' | 'Colaborador' | 'Ambos';
  templateText: string;
}

const CONVERSATIONAL_NODES: ShortcutNode[] = [
  {
    token: '/hi',
    name: '01: Saludo & Menú',
    count: 12,
    category: 'Triage',
    recipient: 'Cliente',
    templateText: '¡Hola! Bienvenido a Yessyfy CDMX 🛡️. ¿Qué servicio para tu hogar necesitas hoy? (1) Plomería, (2) Electricidad, (3) Cerrajería, (4) Jardinería, (5) Albañilería, (6) Mantenimiento.',
  },
  {
    token: '/route',
    name: '02: Selección Oficio',
    count: 8,
    category: 'Triage',
    recipient: 'Cliente',
    templateText: 'Excelente. Para asignarte el colaborador técnico adecuado, por favor compártenos tu ubicación o colonia y una breve descripción de la falla.',
  },
  {
    token: '/urgencia',
    name: '03: Urgencia / Cotización',
    count: 6,
    category: 'Discovery',
    recipient: 'Cliente',
    templateText: 'Cotización inicial estimada: Normal (1.0x), Mismo Día (1.3x) o Emergencia 24/7 (1.8x). Tus fondos se resguardan en custodia Escrow hasta que revises el trabajo.',
  },
  {
    token: '/confirmacion_ok',
    name: '04: Presupuesto Aceptado',
    count: 5,
    category: 'Match',
    recipient: 'Cliente',
    templateText: '¡Presupuesto confirmado! Hemos bloqueado el monto en custodia Escrow. Estamos buscando al profesional independiente más cercano a tu domicilio.',
  },
  {
    token: '/en_camino',
    name: '05: Colaborador en Ruta',
    count: 4,
    category: 'Ejecución',
    recipient: 'Cliente',
    templateText: 'Tu profesional independiente está en camino. Puedes seguir su ruta GPS en vivo en la app. Recuerda cerrar la llave de paso o bajar el interruptor si hay riesgo.',
  },
  {
    token: '/en_proceso',
    name: '06: Llegada & Inicio Trabajo',
    count: 7,
    category: 'Ejecución',
    recipient: 'Cliente',
    templateText: 'El colaborador técnico ha llegado al domicilio. Está tomando las fotos de diagnóstico obligatorias antes de iniciar la intervención.',
  },
  {
    token: '/por_terminar',
    name: '07: Pruebas Finales',
    count: 2,
    category: 'Ejecución',
    recipient: 'Colaborador',
    templateText: 'Pruebas de calidad en curso. Realiza las pruebas de hermeticidad o voltaje y prepara las fotos del trabajo finalizado para la validación del cliente.',
  },
  {
    token: '/finalizado',
    name: '08: Trabajo Listo (Fotos QA)',
    count: 3,
    category: 'QA',
    recipient: 'Cliente',
    templateText: 'El colaborador ha finalizado el trabajo y cargado la evidencia fotográfica con marca de agua y coordenadas GPS. Por favor revisa el resultado en tu app.',
  },
  {
    token: '/validacion_ok',
    name: '09: Cliente Firma Conforme',
    count: 9,
    category: 'Validación',
    recipient: 'Cliente',
    templateText: '¡Gracias por validar el servicio! Tu firma de conformidad ha sido registrada y tu Garantía Formal de 30 Días se encuentra activa.',
  },
  {
    token: '/problema_pendiente',
    name: '10: Disputa / Defecto',
    count: 1,
    category: 'Disputa',
    recipient: 'Ambos',
    templateText: 'Hemos registrado tu reporte de garantía. Los fondos en Escrow permanecen congelados mientras el equipo técnico de Yessyfy revisa la evidencia en un plazo menor a 24 horas.',
  },
  {
    token: '/pago',
    name: '11: Dispersión Escrow SPEI',
    count: 14,
    category: 'Pago',
    recipient: 'Colaborador',
    templateText: 'Pago liberado exitosamente vía SPEI interbancario a tu cuenta CLABE con retenciones automáticas SAT (LISR 113-A e LIVA 18-J aplicadas).',
  },
  {
    token: '/factura_digital',
    name: '12: Timbrado CFDI 4.0 SAT',
    count: 14,
    category: 'Fiscal',
    recipient: 'Cliente',
    templateText: 'Tu factura electrónica CFDI 4.0 con folio fiscal UUID ha sido generada exitosamente y enviada a tu correo.',
  },
  {
    token: '/done',
    name: '13: Emisión Garantía 30 Días',
    count: 14,
    category: 'Recompra',
    recipient: 'Cliente',
    templateText: 'Certificado de Garantía Yessyfy #YSF-WAR activo por 30 días naturales. ¡Gracias por confiar en profesionales independientes de calidad!',
  },
];

let selectedShortcut = $state<ShortcutNode | null>(null);
let copiedToast = $state(false);

function copyTemplate(text: string) {
  navigator.clipboard?.writeText(text);
  copiedToast = true;
  setTimeout(() => copiedToast = false, 2500);
}

function approveQaAndRelease(order: JobOrder) {
  order.status = 'completed';
  selectedJob = null;
}

function flagDispute(order: JobOrder) {
  order.status = 'disputed';
  selectedJob = null;
}
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col" data-theme="vision-dark">
  <!-- Vision Operational Bar -->
  <header class="bg-base-200 border-b border-base-300 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-primary text-primary-content font-black text-lg flex items-center justify-center shadow">
        V
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-extrabold text-lg text-base-content tracking-tight">Vision CRM</h1>
          <span class="badge badge-accent badge-sm font-mono font-bold">OPS-LIVE</span>
        </div>
        <p class="text-[11px] text-base-content/60">Yessyfy Centro de Control y Despacho</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-1.5 bg-base-300/60 p-1 rounded-2xl">
      <button
        type="button"
        class="btn btn-sm text-xs {currentTab === 'dispatch' ? 'btn-primary' : 'btn-ghost'}"
        onclick={() => currentTab = 'dispatch'}
      >
        🗺️ Despacho & Flota
      </button>
      <button
        type="button"
        class="btn btn-sm text-xs {currentTab === 'qa_audits' ? 'btn-primary' : 'btn-ghost'}"
        onclick={() => currentTab = 'qa_audits'}
      >
        📸 Auditoría QA
        <span class="badge badge-xs badge-warning ml-1">1</span>
      </button>
      <button
        type="button"
        class="btn btn-sm text-xs {currentTab === 'escrow_cfdi' ? 'btn-primary' : 'btn-ghost'}"
        onclick={() => currentTab = 'escrow_cfdi'}
      >
        💼 Escrow & SAT CFDI
      </button>
      <button
        type="button"
        class="btn btn-sm text-xs {currentTab === 'triage_tree' ? 'btn-primary' : 'btn-ghost'}"
        onclick={() => currentTab = 'triage_tree'}
      >
        🌲 Árbol Conversacional (14 Atajos)
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="flex items-center gap-4 text-xs font-mono">
      <div class="text-right">
        <span class="text-base-content/60 block text-[10px]">Custodia Escrow</span>
        <span class="font-bold text-primary">$218,500 MXN</span>
      </div>
      <div class="text-right">
        <span class="text-base-content/60 block text-[10px]">Profesionales Activos</span>
        <span class="font-bold text-accent">18 en ruta</span>
      </div>
    </div>
  </header>

  <!-- Content Workspace -->
  <main class="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
    {#if currentTab === 'dispatch'}
      <!-- DISPATCH & ACTIVE ORDERS VIEW -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Live Map Column -->
        <div class="lg:col-span-7 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-lg text-base-content">Telemetría y Geocercas (150m)</h2>
            <span class="text-xs text-base-content/60 font-mono">Actualizado: hace 4s</span>
          </div>
          <SvgGpsTracker
            etaMinutes={11}
            collaboratorName="Roberto Morales"
            vehicleMode="moto"
            progressPercent={70}
          />
        </div>

        <!-- Orders Queue Column -->
        <div class="lg:col-span-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-lg text-base-content">Órdenes en Monitoreo</h2>
            <span class="badge badge-neutral text-xs font-mono">{orders.length} pedidos</span>
          </div>

          <div class="space-y-3">
            {#each orders as order}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="card bg-base-200 border border-base-300 rounded-2xl p-4 hover:border-primary cursor-pointer transition-all shadow-sm {selectedJob?.id === order.id ? 'border-primary ring-1 ring-primary' : ''}"
                onclick={() => selectedJob = order}
              >
                <div class="flex items-start justify-between">
                  <div>
                    <span class="font-mono text-xs font-bold text-primary">{order.code}</span>
                    <h4 class="font-bold text-sm text-base-content mt-0.5">{order.customer?.fullName}</h4>
                    <p class="text-xs text-base-content/60 truncate max-w-[240px]">{order.addressText}</p>
                  </div>
                  <StatusBadge status={order.status} size="sm" />
                </div>

                <div class="mt-3 pt-3 border-t border-base-300/80 flex items-center justify-between text-xs font-mono">
                  <span class="text-base-content/70">Monto: {formatMxn(order.totalCustomerCents)}</span>
                  <span class="text-accent font-semibold">{order.collaborator?.fullName}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    {:else if currentTab === 'qa_audits'}
      <!-- QA AUDIT SPLIT SCREEN -->
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-black text-base-content">Auditoría Fotográfica de Garantía (QA)</h2>
          <p class="text-xs text-base-content/70">
            Comparativa obligatoria del Antes vs. Después. Verificación de sellado y evidencia con marca de agua y hash criptográfico.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="space-y-3">
            <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">Inspección Deslizante en Sitio</span>
            <BeforeAfterSlider
              beforeUrl="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800"
              afterUrl="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"
              beforeLabel="Diagnóstico Inicial"
              afterLabel="Reparación Finalizada"
            />
          </div>

          <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-6">
            <div>
              <span class="badge badge-warning badge-sm font-mono">YSF-2026-0102</span>
              <h3 class="text-lg font-black text-base-content mt-1">Dictamen de Calidad</h3>
              <p class="text-xs text-base-content/70 mt-0.5">
                Profesional Independiente: Ignacio Fuentes Silva • Coyoacán Centro
              </p>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
                <span class="text-base-content/70">Marca de Agua GPS:</span>
                <span class="font-mono font-semibold text-success">19.3621° N, -99.1687° W (Coincide con geocerca)</span>
              </div>
              <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
                <span class="text-base-content/70">Integridad Hash SHA-256:</span>
                <span class="font-mono text-accent">e89b...33fa [Verificado]</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                class="btn btn-error btn-outline btn-sm font-bold min-h-[48px]"
                onclick={() => flagDispute(orders[1])}
              >
                Rechazar QA & Congelar
              </button>
              <button
                type="button"
                class="btn btn-success btn-sm font-bold min-h-[48px]"
                onclick={() => approveQaAndRelease(orders[1])}
              >
                Aprobar QA & Liberar Escrow
              </button>
            </div>
          </div>
        </div>
      </div>

    {:else if currentTab === 'escrow_cfdi'}
      <!-- ESCROW & SAT CFDI 4.0 LEDGER -->
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-black text-base-content">Gestión Fiscal y Custodia de Fondos</h2>
          <p class="text-xs text-base-content/70">
            Libro mayor de doble partida, retenciones automáticas del SAT (LISR 113-A / LIVA 18-J) y timbrado PAC.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EscrowStatusCard amountCents={21850000} status="retained" />
          <EscrowStatusCard amountCents={7438600} status="released" />
          <EscrowStatusCard amountCents={4000000} status="disputed" />
        </div>

        <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr class="text-base-content/60 text-xs">
                <th>Folio</th>
                <th>Cliente</th>
                <th>Total Cliente</th>
                <th>Comisión YSF (15%)</th>
                <th>Retención SAT (ISR+IVA)</th>
                <th>Neto SPEI Profesional</th>
                <th>Estado Escrow</th>
                <th>CFDI 4.0</th>
              </tr>
            </thead>
            <tbody>
              {#each orders as order}
                <tr class="font-mono text-xs hover:bg-base-300/40">
                  <td class="font-bold text-primary">{order.code}</td>
                  <td class="font-sans font-medium">{order.customer?.fullName}</td>
                  <td>{formatMxn(order.totalCustomerCents)}</td>
                  <td>{formatMxn(order.platformFeeCents)}</td>
                  <td class="text-error">-{formatMxn(order.isrWithheldCents + order.ivaWithheldCents)}</td>
                  <td class="text-success font-bold">{formatMxn(order.collaboratorNetCents)}</td>
                  <td><StatusBadge status={order.status} size="xs" /></td>
                  <td>
                    <span class="badge badge-ghost badge-xs font-sans">Generar PDF/XML</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    {:else if currentTab === 'triage_tree'}
      <!-- 14-NODE INTERACTIVE CONVERSATIONAL SHORTCUT TREE -->
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-base-content">Árbol Conversacional y Comandos Rápidos</h2>
            <p class="text-xs text-base-content/70">
              Haz clic en cualquier atajo para previsualizar y copiar la plantilla oficial de WhatsApp Business API.
            </p>
          </div>
          {#if copiedToast}
            <div class="badge badge-success font-bold text-xs p-3">
              ✓ Mensaje copiado al portapapeles
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each CONVERSATIONAL_NODES as node}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="p-4 rounded-2xl bg-base-200 border border-base-300 hover:border-primary cursor-pointer transition-all shadow-sm {selectedShortcut?.token === node.token ? 'border-primary ring-1 ring-primary' : ''}"
              onclick={() => selectedShortcut = node}
            >
              <div class="flex items-start justify-between">
                <div>
                  <span class="badge badge-accent badge-xs font-mono font-bold">{node.token}</span>
                  <h4 class="font-bold text-sm text-base-content mt-1">{node.name}</h4>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] text-base-content/60 uppercase">{node.category}</span>
                    <span class="text-[10px] badge badge-ghost badge-xs">Para: {node.recipient}</span>
                  </div>
                </div>
                <span class="text-2xl font-black font-mono text-primary">{node.count}</span>
              </div>
            </div>
          {/each}
        </div>

        {#if selectedShortcut}
          <div class="card bg-base-200 border-2 border-primary rounded-3xl p-6 space-y-4 shadow-xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="badge badge-primary font-mono text-sm font-bold">{selectedShortcut.token}</span>
                <h3 class="font-bold text-base text-base-content">{selectedShortcut.name}</h3>
              </div>
              <span class="text-xs text-base-content/60">Destinatario: <strong>{selectedShortcut.recipient}</strong></span>
            </div>

            <div class="p-4 rounded-2xl bg-base-100 border border-base-300 font-sans text-sm leading-relaxed text-base-content/90">
              "{selectedShortcut.templateText}"
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="btn btn-outline btn-sm rounded-xl font-bold min-h-[44px]"
                onclick={() => selectedShortcut = null}
              >
                Cerrar
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-xl font-bold min-h-[44px]"
                onclick={() => selectedShortcut && copyTemplate(selectedShortcut.templateText)}
              >
                📋 Copiar Mensaje para WhatsApp
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Job Detail Slide-over Inspector Sheet -->
  {#if selectedJob}
    <DetailSheet
      open={true}
      title={selectedJob.code}
      subtitle={selectedJob.addressText}
      onClose={() => selectedJob = null}
    >
      <div class="space-y-4">
        <StatusBadge status={selectedJob.status} />

        <div class="space-y-1">
          <span class="text-[10px] uppercase font-bold text-base-content/60">Descripción del Trabajo</span>
          <p class="text-xs text-base-content/80 leading-relaxed">{selectedJob.description}</p>
        </div>

        {#if selectedBreakdown}
          <PriceBreakdown breakdown={selectedBreakdown} showInternalMargins={true} />
        {/if}

        {#if selectedJob.collaborator}
          <div class="space-y-1">
            <span class="text-[10px] uppercase font-bold text-base-content/60">Profesional Asignado</span>
            <div class="p-3 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-between">
              <span class="text-xs font-bold">{selectedJob.collaborator.fullName}</span>
              <span class="font-mono text-xs text-primary">{selectedJob.collaborator.phone}</span>
            </div>
          </div>
        {/if}
      </div>

      {#snippet actions()}
        <div class="flex gap-2">
          {#if selectedJob?.status === 'pending_validation'}
            <button
              type="button"
              class="btn btn-sm btn-success flex-1 min-h-[48px]"
              onclick={() => selectedJob && approveQaAndRelease(selectedJob)}
            >
              Aprobar & Liberar
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-sm btn-error btn-outline flex-1 min-h-[48px]"
            onclick={() => selectedJob && flagDispute(selectedJob)}
          >
            Abrir Disputa
          </button>
        </div>
      {/snippet}
    </DetailSheet>
  {/if}
</div>
