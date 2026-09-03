<script lang="ts">
import { formatMxn, type JobFinancialBreakdown } from '@sdk/core';

interface Props {
  breakdown: JobFinancialBreakdown;
  showInternalMargins?: boolean;
}

let { breakdown, showInternalMargins = false }: Props = $props();
</script>

<div class="card bg-base-200/80 border border-base-300 p-4 rounded-2xl shadow-sm text-sm">
  <div class="flex justify-between items-center pb-2 border-b border-base-300">
    <span class="text-base-content/80 font-medium">Diagnóstico / Tarifa Base:</span>
    <span class="font-semibold text-base-content">{formatMxn(breakdown.baseBudgetCents)}</span>
  </div>

  {#if breakdown.supplementalCents > 0}
    <div class="flex justify-between items-center py-2 border-b border-base-300 text-xs">
      <span class="text-base-content/70">Materiales / Suplementos en sitio:</span>
      <span class="font-medium">{formatMxn(breakdown.supplementalCents)}</span>
    </div>
  {/if}

  <div class="flex justify-between items-center pt-3 text-base">
    <span class="font-bold text-base-content">Total Cliente (con IVA):</span>
    <span class="font-extrabold text-primary text-lg">{formatMxn(breakdown.totalCustomerCents)}</span>
  </div>

  {#if showInternalMargins}
    <div class="mt-4 pt-3 border-t border-dashed border-base-300 text-xs space-y-1.5 bg-base-100/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
      <div class="flex justify-between text-base-content/60">
        <span>Comisión Yessyfy (15%):</span>
        <span class="font-mono">{formatMxn(breakdown.platformFeeCents)}</span>
      </div>
      <div class="flex justify-between text-base-content/60">
        <span>Pasarela de Pago (3% + $3 MXN + IVA):</span>
        <span class="font-mono">{formatMxn(breakdown.gatewayFeeCents)}</span>
      </div>
      <div class="flex justify-between text-error/80">
        <span>Retención SAT ISR (1.0%):</span>
        <span class="font-mono">-{formatMxn(breakdown.isrWithheldCents)}</span>
      </div>
      <div class="flex justify-between text-error/80">
        <span>Retención SAT IVA (8%):</span>
        <span class="font-mono">-{formatMxn(breakdown.ivaWithheldCents)}</span>
      </div>
      <div class="flex justify-between font-bold text-success pt-1.5 border-t border-base-300">
        <span>Dispersión Neta SPEI Colaborador:</span>
        <span class="font-mono">{formatMxn(breakdown.collaboratorNetCents)}</span>
      </div>
      <div class="flex justify-between font-medium text-info">
        <span>Margen Contribución Yessyfy:</span>
        <span class="font-mono">{formatMxn(breakdown.platformContributionCents)}</span>
      </div>
    </div>
  {/if}
</div>
