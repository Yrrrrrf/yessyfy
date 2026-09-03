<script lang="ts">
import { StatusBadge, SvgGpsTracker } from '@sdk/ui';
import { formatMxn } from '@sdk/core';
import { visionStore } from '../visionStore.svelte.ts';
</script>

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
