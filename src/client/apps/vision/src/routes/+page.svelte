<script lang="ts">
import {
  BeforeAfterSlider,
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
import { visionStore } from '../lib/visionStore.svelte.ts';

// 8-Column Canonical Kanban Lifecycle Stages (from Dashboard.html)
interface KanbanColumn {
  id: string;
  name: string;
  shortcut: string;
  colorClass: string;
  statusMatch: JobOrderStatus[];
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'saludo', name: '01: Saludo', shortcut: '/hi', colorClass: 'border-t-info', statusMatch: ['draft'] },
  { id: 'triage', name: '02: Triage', shortcut: '/route', colorClass: 'border-t-base-content/40', statusMatch: ['pending_triage'] },
  { id: 'discovery', name: '03: Discovery', shortcut: '/urgencia', colorClass: 'border-t-accent', statusMatch: ['dispatched'] },
  { id: 'cotizacion', name: '04: Cotización', shortcut: '/confirmacion_ok', colorClass: 'border-t-warning', statusMatch: ['accepted'] },
  { id: 'ejecucion', name: '05: Ejecución', shortcut: '/en_camino', colorClass: 'border-t-primary', statusMatch: ['in_transit', 'en_camino', 'in_progress', 'pending_quote_approval', 'winding_down'] },
  { id: 'validacion', name: '06: Validación', shortcut: '/validacion_ok', colorClass: 'border-t-warning', statusMatch: ['pending_validation', 'validated'] },
  { id: 'pago', name: '07: Pago Escrow', shortcut: '/pago', colorClass: 'border-t-secondary', statusMatch: ['completed'] },
  { id: 'cierre', name: '08: Facturación', shortcut: '/factura_digital', colorClass: 'border-t-success', statusMatch: ['completed'] },
];

// 14-Node WhatsApp Automation
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

// Batch CFDI selection
let selectedBatchOrders = $state<string[]>(['ord_101', 'ord_102']);
let batchStampingSuccess = $state(false);

function copyTemplate(text: string) {
  navigator.clipboard?.writeText(text);
  copiedToast = true;
  setTimeout(() => copiedToast = false, 2500);
}

function handleBatchStamp() {
  batchStampingSuccess = true;
  setTimeout(() => batchStampingSuccess = false, 4000);
}
</script>

<div class="p-6 space-y-6">
  <!-- CONSOLE 1: 8-COLUMN KANBAN BOARD (DASHBOARD.HTML CANONICAL) -->
  {#if visionStore.activeConsole === 'kanban'}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-base-content tracking-tight">Tablero Kanban de Ciclo de Vida (8 Fases)</h2>
          <p class="text-xs text-base-content/60">Monitoreo del flujo cerrado: Pedido ➔ Match ➔ Ejecución ➔ Validación ➔ Pago ➔ CFDI</p>
        </div>
        <span class="badge badge-accent badge-sm font-mono font-bold">FLUID-DISPATCH</span>
      </div>

      <!-- Horizontal scrolling 8-column pipeline -->
      <div class="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[580px]">
        {#each KANBAN_COLUMNS as col}
          {@const columnOrders = visionStore.orders.filter((o) => col.statusMatch.includes(o.status))}
          <div class="w-72 shrink-0 bg-base-200/70 border border-base-300 rounded-2xl flex flex-col max-h-[580px] shadow-sm border-t-4 {col.colorClass}">
            <!-- Column Header -->
            <div class="p-3 border-b border-base-300 flex items-center justify-between">
              <div>
                <span class="font-mono text-[10px] font-bold text-base-content/60">{col.shortcut}</span>
                <h4 class="font-extrabold text-xs text-base-content">{col.name}</h4>
              </div>
              <span class="badge badge-neutral badge-xs font-mono font-bold">{columnOrders.length}</span>
            </div>

            <!-- Orders in Column -->
            <div class="p-2 space-y-2.5 overflow-y-auto flex-1">
              {#each columnOrders as order}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="card bg-base-100 border border-base-300 rounded-xl p-3.5 hover:border-primary cursor-pointer transition-all shadow-xs space-y-2 {visionStore.selectedTicketId === order.id ? 'ring-2 ring-primary border-primary' : ''}"
                  onclick={() => visionStore.selectTicket(order.id)}
                >
                  <div class="flex items-start justify-between">
                    <span class="font-mono text-[11px] font-bold text-primary">{order.code}</span>
                    <StatusBadge status={order.status} size="xs" />
                  </div>

                  <div>
                    <div class="font-bold text-xs text-base-content">{order.customer?.fullName}</div>
                    <div class="text-[10px] text-base-content/60 truncate">{order.addressText}</div>
                  </div>

                  <div class="pt-2 border-t border-base-300/60 flex items-center justify-between text-[11px] font-mono">
                    <span class="text-base-content/70">{formatMxn(order.totalCustomerCents)}</span>
                    <span class="text-accent font-semibold text-[10px]">{order.collaborator?.fullName ? order.collaborator.fullName.split(' ')[0] : 'Colaborador'}</span>
                  </div>
                </div>
              {:else}
                <div class="h-24 flex items-center justify-center text-xs text-base-content/30 italic">
                  Sin tickets en esta fase
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

  <!-- CONSOLE 2: MULTIVEHICLE DISPATCH & FLEET MAP -->
  {:else if visionStore.activeConsole === 'dispatch'}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-base-content tracking-tight">Telemetría Multivehículo CDMX (Geocercas 150m)</h2>
            <p class="text-xs text-base-content/60">Polanco, Condesa, Coyoacán, Benito Juárez</p>
          </div>
          <span class="badge badge-success badge-sm font-mono font-bold">18 TÉCNICOS EN RUTA</span>
        </div>

        <SvgGpsTracker
          etaMinutes={11}
          collaboratorName="Roberto Morales Ramírez"
          vehicleMode="moto"
          progressPercent={70}
        />
      </div>

      <div class="lg:col-span-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-black text-sm text-base-content uppercase tracking-wider">Órdenes con SLA Activo</h3>
          <span class="badge badge-neutral badge-xs font-mono">{visionStore.orders.length}</span>
        </div>

        <div class="space-y-3">
          {#each visionStore.orders as order}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="card bg-base-200 border border-base-300 rounded-2xl p-4 hover:border-primary cursor-pointer transition-all shadow-sm {visionStore.selectedTicketId === order.id ? 'ring-2 ring-primary border-primary' : ''}"
              onclick={() => visionStore.selectTicket(order.id)}
            >
              <div class="flex items-start justify-between">
                <div>
                  <span class="font-mono text-xs font-bold text-primary">{order.code}</span>
                  <h4 class="font-bold text-sm text-base-content mt-0.5">{order.customer?.fullName}</h4>
                  <p class="text-xs text-base-content/60 truncate max-w-[220px]">{order.addressText}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
              <div class="mt-3 pt-3 border-t border-base-300/80 flex items-center justify-between text-xs font-mono">
                <span class="text-base-content/70">{formatMxn(order.totalCustomerCents)}</span>
                <span class="text-accent font-semibold">{order.collaborator?.fullName}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

  <!-- CONSOLE 3: 14-NODE WHATSAPP CLOUD API AUTOMATION -->
  {:else if visionStore.activeConsole === 'tree'}
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-black text-base-content tracking-tight">Árbol Conversacional & Cloud API WhatsApp</h2>
          <p class="text-xs text-base-content/70">
            Haz clic en cualquier atajo para previsualizar y disparar la plantilla oficial HSM ante Meta.
          </p>
        </div>
        {#if copiedToast}
          <div class="badge badge-success font-bold text-xs p-3">
            ✓ Plantilla copiada al portapapeles
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each CONVERSATIONAL_NODES as node}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="p-4 rounded-2xl bg-base-200 border border-base-300 hover:border-primary cursor-pointer transition-all shadow-sm {selectedShortcut?.token === node.token ? 'border-primary ring-2 ring-primary' : ''}"
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
              📋 Disparar / Copiar para WhatsApp
            </button>
          </div>
        </div>
      {/if}
    </div>

  <!-- CONSOLE 4: QA FORENSIC AUDIT -->
  {:else if visionStore.activeConsole === 'qa'}
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-black text-base-content tracking-tight">Auditoría Fotográfica de Garantía (QA Pericial)</h2>
        <p class="text-xs text-base-content/70">
          Comparativa obligatoria Antes vs. Después. Verificación de sellado y evidencia con marca de agua y hash criptográfico SHA-256.
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
            <h3 class="text-lg font-black text-base-content mt-1">Dictamen Pericial de Calidad</h3>
            <p class="text-xs text-base-content/70 mt-0.5">
              Profesional Independiente: Ignacio Fuentes Silva • Coyoacán Centro
            </p>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
              <span class="text-base-content/70">Marca de Agua GPS:</span>
              <span class="font-mono font-semibold text-success">19.3621° N, -99.1687° W (Geocerca OK)</span>
            </div>
            <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
              <span class="text-base-content/70">Integridad Criptográfica:</span>
              <span class="font-mono text-accent">SHA-256: e89b...33fa [Válido]</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              class="btn btn-error btn-outline btn-sm font-bold min-h-[48px]"
              onclick={() => visionStore.freezeEscrow('ord_102')}
            >
              Rechazar QA & Congelar
            </button>
            <button
              type="button"
              class="btn btn-success btn-sm font-bold min-h-[48px]"
              onclick={() => visionStore.approveTicket('ord_102')}
            >
              Aprobar QA & Liberar Escrow
            </button>
          </div>
        </div>
      </div>
    </div>

  <!-- CONSOLE 5: ESCROW & SAT CFDI 4.0 BATCH STAMPING -->
  {:else if visionStore.activeConsole === 'escrow'}
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-black text-base-content tracking-tight">Libro Mayor de Escrow & Timbrado Masivo SAT CFDI 4.0</h2>
          <p class="text-xs text-base-content/70">
            Retenciones fiscales (LISR 113-A e LIVA 18-J) y emisión masiva de comprobantes fiscales digitales.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold min-h-[44px] shadow"
          onclick={handleBatchStamp}
        >
          💼 Timbrar Lote Seleccionado ({selectedBatchOrders.length})
        </button>
      </div>

      {#if batchStampingSuccess}
        <div class="alert alert-success text-xs font-bold p-3 rounded-2xl">
          ✓ Lote timbrado exitosamente ante el PAC SAT. Se han emitido los archivos XML y PDF oficiales.
        </div>
      {/if}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EscrowStatusCard amountCents={21850000} status="retained" />
        <EscrowStatusCard amountCents={7438600} status="released" />
        <EscrowStatusCard amountCents={4000000} status="disputed" />
      </div>

      <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="text-base-content/60 text-xs">
              <th>Sel</th>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Total Cliente</th>
              <th>Comisión (15%)</th>
              <th>Retención SAT</th>
              <th>Neto Colaborador</th>
              <th>Estado Escrow</th>
            </tr>
          </thead>
          <tbody>
            {#each visionStore.orders as order}
              <tr class="font-mono text-xs hover:bg-base-300/40">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedBatchOrders.includes(order.id)}
                    class="checkbox checkbox-primary checkbox-xs"
                    onchange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      if (checked) {
                        selectedBatchOrders = [...selectedBatchOrders, order.id];
                      } else {
                        selectedBatchOrders = selectedBatchOrders.filter((id) => id !== order.id);
                      }
                    }}
                  />
                </td>
                <td class="font-bold text-primary">{order.code}</td>
                <td class="font-sans font-medium">{order.customer?.fullName}</td>
                <td>{formatMxn(order.totalCustomerCents)}</td>
                <td>{formatMxn(order.platformFeeCents)}</td>
                <td class="text-error">-{formatMxn(order.isrWithheldCents + order.ivaWithheldCents)}</td>
                <td class="text-success font-bold">{formatMxn(order.collaboratorNetCents)}</td>
                <td><StatusBadge status={order.status} size="xs" /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
