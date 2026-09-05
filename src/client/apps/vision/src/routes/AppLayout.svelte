<script lang="ts">
import { getLayoutStore, WorkspaceLayout } from 'rune-lab/layout';
import {
  type Command,
  getCommandStore,
  getRegistryStore,
  getToastStore,
  useShortcuts,
} from 'rune-lab/palettes';
import { onMount, type Snippet } from 'svelte';
import { formatMxn } from '@sdk/core';
import { StatusBadge, PriceBreakdown, ToastContainer, Logo } from '@sdk/ui';
import { visionStore, type VisionConsole } from '../lib/visionStore.svelte.ts';

let { children }: { children: Snippet } = $props();

const layout = getLayoutStore();
const commands = getCommandStore();
const registry = getRegistryStore();
const toasts = getToastStore();

const zoneToggles = [
  { zone: 'strip', keys: 'alt+1', label: 'Toggle Workspace Strip' },
  { zone: 'nav', keys: 'alt+2', label: 'Toggle Navigation Panel' },
  { zone: 'detail', keys: 'alt+3', label: 'Toggle Detail Panel' },
  { zone: 'statusbar', keys: 'alt+4', label: 'Toggle Statusbar' },
] as const;

useShortcuts([
  ...zoneToggles.map(({ zone, keys, label }) => ({
    id: `lab.toggle.${zone}`,
    keys,
    label,
    category: 'Layout',
    handler: (e: KeyboardEvent) => {
      e.preventDefault();
      layout.toggleZone(zone);
    },
  })),
  {
    id: 'lab.palette.commands',
    keys: 'ctrl+space',
    label: 'Open Command Palette',
    category: 'Palettes',
    handler: (e: KeyboardEvent) => {
      e.preventDefault();
      registry.open('commands');
    },
  },
]);

onMount(() => {
  const opsCommands: Command[] = [
    {
      id: 'jump.ticket.0101',
      label: 'Saltar a Orden: #YSF-2026-0101 (Polanco Fuga)',
      category: 'Despacho Rápido',
      action: () => {
        visionStore.selectTicket('ord_101');
        toasts.info('Navegado a Orden #YSF-2026-0101');
      },
    },
    {
      id: 'jump.ticket.0102',
      label: 'Saltar a Orden: #YSF-2026-0102 (Coyoacán Corto)',
      category: 'Despacho Rápido',
      action: () => {
        visionStore.selectTicket('ord_102');
        toasts.info('Navegado a Orden #YSF-2026-0102');
      },
    },
    {
      id: 'jump.ticket.0103',
      label: 'Saltar a Orden: #YSF-2026-0103 (Condesa Cerrajería)',
      category: 'Despacho Rápido',
      action: () => {
        visionStore.selectTicket('ord_103');
        toasts.info('Navegado a Orden con Disputa #YSF-2026-0103');
      },
    },
    {
      id: 'ops.escrow.freeze',
      label: '🚨 Congelar Fondos Escrow (Disputa Inmediata)',
      category: 'Operaciones',
      action: () => {
        if (visionStore.selectedTicket) {
          visionStore.freezeEscrow(visionStore.selectedTicket.id);
          toasts.error(`Fondos Escrow congelados para orden #${visionStore.selectedTicket.code}`);
        }
      },
    },
    {
      id: 'ops.pac.batch_stamp',
      label: '💼 Timbrar Lote Masivo SAT CFDI 4.0',
      category: 'Fiscal',
      action: () => {
        toasts.success('Lote de 3 facturas timbradas exitosamente ante el SAT');
      },
    },
  ];

  for (const cmd of opsCommands) commands.register(cmd);
  return () => {
    for (const cmd of opsCommands) commands.unregister(cmd.id);
  };
});

const TACTICAL_CONSOLES: { id: VisionConsole; label: string; icon: string; badge?: string }[] = [
  { id: 'kanban', label: 'Kanban 8 Fases', icon: '⤳' },
  { id: 'dispatch', label: 'Despacho & Flota', icon: '🗺️', badge: '18' },
  { id: 'tree', label: '14 Atajos WhatsApp', icon: '🌲' },
  { id: 'qa', label: 'Auditoría QA', icon: '📸', badge: '1' },
  { id: 'escrow', label: 'Escrow & SAT CFDI', icon: '💼' },
];
</script>

<WorkspaceLayout>
  <!-- 1. WORKSPACE STRIP (64px) -->
  {#snippet workspaceStrip()}
    <div class="h-full w-full bg-base-300/80 border-r border-base-300 flex flex-col items-center py-3 gap-3">
      <!-- App Brand Mark -->
      <Logo variant="icon" size="md" class="mb-2" />

      <!-- Tactical Consoles Navigation -->
      {#each TACTICAL_CONSOLES as console}
        <button
          type="button"
          class="relative w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all {visionStore.activeConsole === console.id ? 'bg-primary text-white shadow-lg shadow-primary/30 font-bold scale-105' : 'text-base-content/70 hover:bg-base-200'}"
          title={console.label}
          onclick={() => visionStore.setConsole(console.id)}
        >
          <span>{console.icon}</span>
          {#if console.badge}
            <span class="badge badge-error badge-xs font-mono font-bold absolute -top-1 -right-1 text-[9px] shadow">
              {console.badge}
            </span>
          {/if}
        </button>
      {/each}

      <!-- Command Palette Hint at Bottom -->
      <button
        type="button"
        class="mt-auto w-10 h-10 rounded-xl bg-base-200 hover:bg-base-100 flex items-center justify-center text-xs text-base-content/60 font-mono"
        title="Command Palette (ctrl+space)"
        onclick={() => registry.open('commands')}
      >
        ⌘
      </button>
    </div>
  {/snippet}

  <!-- 2. NAVIGATION PANEL (280px) -->
  {#snippet navigationPanel()}
    <div class="h-full w-full bg-base-200/90 border-r border-base-300 p-4 flex flex-col gap-4 overflow-y-auto">
      <div class="flex items-center justify-between">
        <h3 class="font-black text-xs uppercase tracking-wider text-base-content/70">Filtros de Despacho</h3>
        <span class="badge badge-neutral badge-xs font-mono">{visionStore.orders.length} tickets</span>
      </div>

      <!-- CDMX Alcaldías Filter -->
      <div class="space-y-1.5">
        <label for="alcaldia-filter" class="text-[11px] font-bold text-base-content/60 block uppercase">Alcaldías CDMX</label>
        <select
          id="alcaldia-filter"
          bind:value={visionStore.selectedAlcaldia}
          class="select select-xs w-full text-xs"
        >
          <option value="todos">Todas las Zonas</option>
          <option value="Miguel Hidalgo">Miguel Hidalgo (Polanco)</option>
          <option value="Cuauhtémoc">Cuauhtémoc (Condesa / Roma)</option>
          <option value="Benito Juárez">Benito Juárez (Del Valle)</option>
          <option value="Coyoacán">Coyoacán Centro</option>
        </select>
      </div>

      <!-- Urgency Filter -->
      <div class="space-y-1.5">
        <label for="urgency-filter" class="text-[11px] font-bold text-base-content/60 block uppercase">Nivel de Urgencia</label>
        <select
          id="urgency-filter"
          bind:value={visionStore.selectedUrgency}
          class="select select-xs w-full text-xs"
        >
          <option value="todos">Todos los Niveles</option>
          <option value="emergencia_24_7">🚨 Emergencia 24/7 (SLA &lt; 30m)</option>
          <option value="mismo_dia">📅 Mismo Día</option>
          <option value="normal">⏱️ Normal</option>
        </select>
      </div>

      <!-- Quick Queue of Orders -->
      <div class="space-y-2 pt-2 border-t border-base-300">
        <span class="text-[10px] font-bold uppercase text-base-content/60 block">Cola Activa</span>
        <div class="space-y-1.5">
          {#each visionStore.orders as order}
            <button
              type="button"
              class="w-full text-left p-2.5 rounded-xl border transition-all text-xs {visionStore.selectedTicketId === order.id ? 'border-primary bg-primary/10 font-bold shadow-sm' : 'border-base-300 bg-base-100 hover:bg-base-200/50'}"
              onclick={() => visionStore.selectTicket(order.id)}
            >
              <div class="flex items-center justify-between">
                <span class="font-mono text-primary text-[11px]">{order.code}</span>
                <StatusBadge status={order.status} size="xs" />
              </div>
              <div class="text-[11px] truncate mt-1 text-base-content">{order.customer?.fullName}</div>
              <div class="text-[10px] text-base-content/60 font-mono mt-0.5">{order.addressText.split(',')[0]}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/snippet}

  <!-- 3. CONTENT AREA -->
  {#snippet content()}
    <div class="h-full w-full overflow-y-auto bg-base-100">
      {@render children()}
    </div>
  {/snippet}

  <!-- 4. DETAIL PANEL (340px) -->
  {#snippet detailPanel()}
    <div class="h-full w-full bg-base-200/95 border-l border-base-300 p-4 flex flex-col gap-4 overflow-y-auto">
      {#if visionStore.selectedTicket}
        {@const t = visionStore.selectedTicket}
        <div class="flex items-center justify-between border-b border-base-300 pb-3">
          <div>
            <span class="badge badge-primary font-mono text-xs font-bold">{t.code}</span>
            <h4 class="font-bold text-sm text-base-content mt-1">{t.category.toUpperCase()}</h4>
          </div>
          <StatusBadge status={t.status} size="sm" />
        </div>

        <!-- Customer & Collaborator summary -->
        <div class="space-y-3 text-xs">
          <div class="p-3 rounded-xl bg-base-100 border border-base-300 space-y-1">
            <span class="text-[10px] text-base-content/60 uppercase font-bold block">Cliente</span>
            <div class="font-bold">{t.customer?.fullName}</div>
            <div class="font-mono text-primary">{t.customer?.phone}</div>
            <div class="text-base-content/70 text-[11px]">{t.addressText}</div>
          </div>

          <div class="p-3 rounded-xl bg-base-100 border border-base-300 space-y-1">
            <span class="text-[10px] text-base-content/60 uppercase font-bold block">Colaborador Asignado</span>
            <div class="font-bold">{t.collaborator?.fullName}</div>
            <div class="font-mono text-accent">{t.collaborator?.phone}</div>
          </div>

          <!-- Description -->
          <div class="p-3 rounded-xl bg-base-100 border border-base-300 space-y-1">
            <span class="text-[10px] text-base-content/60 uppercase font-bold block">Avería Reportada</span>
            <p class="text-base-content/80 text-[11px] leading-relaxed">{t.description}</p>
          </div>

          <!-- Financial Snapshot -->
          <div class="p-3 rounded-xl bg-base-100 border border-base-300 space-y-1 font-mono text-[11px]">
            <div class="flex justify-between">
              <span class="text-base-content/70">Total Cliente:</span>
              <span class="font-bold">{formatMxn(t.totalCustomerCents)}</span>
            </div>
            <div class="flex justify-between text-success">
              <span>Neto Colaborador SPEI:</span>
              <span class="font-bold">{formatMxn(t.collaboratorNetCents)}</span>
            </div>
          </div>
        </div>

        <!-- Contingency Actions -->
        <div class="mt-auto space-y-2 pt-4 border-t border-base-300">
          <span class="text-[10px] uppercase font-bold text-base-content/60 block">Acciones de Contingencia</span>
          {#if t.status === 'pending_validation'}
            <button
              type="button"
              class="btn btn-success btn-sm btn-block rounded-xl font-bold min-h-[44px]"
              onclick={() => {
                visionStore.approveTicket(t.id);
                toasts.success(`Ticket #${t.code} aprobado y liberado`);
              }}
            >
              ✓ Aprobar QA & Liberar Escrow
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-error btn-outline btn-sm btn-block rounded-xl font-bold min-h-[44px]"
            onclick={() => {
              visionStore.freezeEscrow(t.id);
              toasts.error(`Fondos congelados para ticket #${t.code}`);
            }}
          >
            🚨 Congelar Fondos (Abrir Disputa)
          </button>
        </div>
      {:else}
        <div class="h-full flex items-center justify-center text-xs text-base-content/50 italic">
          Selecciona un ticket para inspeccionar
        </div>
      {/if}
    </div>
  {/snippet}

  <!-- 5. STATUSBAR (24px) -->
  {#snippet statusbar()}
    <div class="h-full w-full bg-base-300/90 text-base-content flex items-center gap-6 px-4 text-[11px] font-mono border-t border-base-300">
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        <span>Escrow en Custodia: <strong class="text-primary font-bold">$218,500 MXN</strong></span>
      </span>
      <span class="text-base-content/60">Flota: <strong class="text-base-content">18 en ruta</strong></span>
      <span class="text-base-content/60">Timbres PAC SAT: <strong class="text-success">384 disponibles</strong></span>
      <span class="ml-auto text-base-content/50 text-[10px]">WhatsApp Cloud API: 142ms • <kbd class="kbd kbd-xs font-mono">ctrl+space</kbd> comandos</span>
    </div>
  {/snippet}
</WorkspaceLayout>

<ToastContainer position="bottom-end" />
