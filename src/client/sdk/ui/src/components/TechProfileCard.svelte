<script lang="ts">
import type { TechnicianRecord } from '@sdk/core';
import { TRADE_META_REGISTRY } from '../types.ts';
import TrustBadge from './TrustBadge.svelte';

interface Props {
  technician: TechnicianRecord;
  compact?: boolean;
}

let { technician, compact = false }: Props = $props();

const initials = $derived.by(() => {
  const name = technician.user?.fullName || 'Colaborador';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
});

const primaryTrade = $derived(
  technician.trades.length > 0 ? TRADE_META_REGISTRY[technician.trades[0]] : null,
);
</script>

<div class="card bg-base-100 border border-base-300 rounded-3xl p-5 shadow-sm {compact ? 'space-y-3' : 'space-y-4'}">
  <div class="flex items-center gap-3.5">
    <!-- Avatar -->
    <div class="avatar placeholder">
      <div class="bg-gradient-to-tr {primaryTrade?.gradientClass || 'from-primary to-accent'} text-white rounded-2xl w-14 h-14 font-black text-lg shadow-md flex items-center justify-center">
        <span>{initials}</span>
      </div>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <h4 class="font-extrabold text-base text-base-content truncate">
          {technician.user?.fullName || 'Técnico Asignado'}
        </h4>
        <span class="text-xs text-primary" title="Identidad Verificada">✓</span>
      </div>
      
      <div class="flex items-center gap-2 mt-1 text-xs">
        <div class="flex items-center gap-1 font-bold text-amber-500">
          <span>★</span>
          <span>{technician.ratingAvg.toFixed(1)}</span>
        </div>
        <span class="text-base-content/40">•</span>
        <span class="text-base-content/70">{technician.jobsCompleted} servicios</span>
      </div>
    </div>
  </div>

  <!-- Trades -->
  <div class="flex flex-wrap gap-1.5">
    {#each technician.trades as trade}
      {@const meta = TRADE_META_REGISTRY[trade]}
      {#if meta}
        <span class="badge badge-sm {meta.badgeClass} font-medium gap-1">
          <span>{meta.emoji}</span>
          <span>{meta.name}</span>
        </span>
      {/if}
    {/each}
  </div>

  {#if !compact}
    <div class="pt-2 border-t border-base-300 flex flex-wrap gap-2">
      <TrustBadge kind="kyc_verified" variant="compact" />
      <TrustBadge kind="insurance_500k" variant="compact" />
    </div>
  {/if}
</div>
