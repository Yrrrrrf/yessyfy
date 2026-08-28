<script lang="ts">
import { formatMxn } from '@sdk';
import StatusBadge from './StatusBadge.svelte';

interface Props {
  amountCents: number;
  status: 'retained' | 'released' | 'disputed';
}

let { amountCents, status }: Props = $props();
</script>

<div class="card bg-base-100 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-xl">🔒</span>
      <span class="font-bold text-sm tracking-tight text-base-content">Protección Escrow Yessyfy</span>
    </div>
    <StatusBadge escrowStatus={status} size="sm" />
  </div>

  <div class="p-4 rounded-2xl bg-base-200/70 border border-base-300/60 flex items-center justify-between">
    <span class="text-xs font-semibold text-base-content/70">Monto en Custodia:</span>
    <span class="text-xl font-black font-mono text-primary">{formatMxn(amountCents)}</span>
  </div>

  <div class="text-xs text-base-content/70 leading-relaxed">
    {#if status === 'retained'}
      Tus fondos están protegidos por el sistema Escrow. El técnico no recibe el pago hasta que tú revises el trabajo, valides las fotos del antes/después y firmes de conformidad.
    {:else if status === 'released'}
      Servicio concluido exitosamente. Los fondos fueron dispersados al colaborador independiente y tu garantía de 30 días está activa.
    {:else if status === 'disputed'}
      Has reportado una inconformidad. El pago al colaborador está congelado mientras el equipo de Operaciones revisa las fotos y evidencia técnica.
    {/if}
  </div>
</div>
