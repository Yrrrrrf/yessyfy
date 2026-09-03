<script lang="ts">
import { formatMxn } from '@sdk/core';

interface Props {
  open: boolean;
  reason: string;
  supplementalCents: number;
  evidencePhotoUrl?: string;
  partsCostCents?: number;
  laborCostCents?: number;
  onApprove: () => void;
  onReject: () => void;
}

let {
  open,
  reason,
  supplementalCents,
  evidencePhotoUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
  partsCostCents = 20000, // $200 MXN
  laborCostCents = 15000, // $150 MXN
  onApprove,
  onReject,
}: Props = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div
      class="bg-base-100 border-2 border-warning/50 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header Alert -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-warning text-warning-content font-black text-xl flex items-center justify-center shadow">
            ⚠️
          </div>
          <div>
            <h3 class="text-base font-black text-base-content">Hallazgo Imprevisto en Sitio</h3>
            <p class="text-[11px] text-base-content/60">Inspección técnica y cotización suplementaria</p>
          </div>
        </div>
        <span class="badge badge-warning badge-sm font-bold">Requiere Autorización</span>
      </div>

      <!-- Evidence Photo with GPS Stamp -->
      <div class="space-y-1.5">
        <span class="text-[10px] uppercase font-bold text-base-content/60 tracking-wider">Evidencia Fotográfica del Técnico</span>
        <div class="relative rounded-2xl overflow-hidden border border-base-300 shadow-inner group">
          <img src={evidencePhotoUrl} alt="Daño imprevisto en sitio" class="w-full h-44 object-cover" />
          <div class="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs p-2 text-[10px] text-white/90 font-mono flex justify-between">
            <span>GPS: 19.4326° N, -99.1332° W</span>
            <span class="text-success font-bold">✓ Coincide con domicilio</span>
          </div>
        </div>
      </div>

      <!-- Description of the unexpected defect -->
      <div class="p-3.5 rounded-2xl bg-warning/10 border border-warning/30 space-y-1">
        <span class="text-[10px] font-bold text-warning-content uppercase">Motivo Reportado por el Técnico:</span>
        <p class="text-xs text-base-content/90 font-medium leading-relaxed italic">
          "{reason || 'Se detectó daño en tubería de cobre y contratuerca degollada al retirar la tarja'}"
        </p>
      </div>

      <!-- Itemized Cost Breakdown -->
      <div class="p-4 rounded-2xl bg-base-200 border border-base-300 space-y-2.5 text-xs">
        <span class="text-[10px] uppercase font-bold text-base-content/60 tracking-wider block">Desglose del Sobrecosto</span>
        <div class="flex justify-between">
          <span class="text-base-content/70">Refacciones y materiales originales:</span>
          <span class="font-mono font-semibold">{formatMxn(partsCostCents)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-base-content/70">Mano de obra suplementaria autorizada:</span>
          <span class="font-mono font-semibold">{formatMxn(laborCostCents)}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-base-300 font-bold text-sm">
          <span>Sobrecosto Total a Retener en Escrow:</span>
          <span class="text-primary font-mono">{formatMxn(supplementalCents)}</span>
        </div>
      </div>

      <!-- Transparent Consequences on Reject -->
      <div class="p-3 rounded-xl bg-base-200/60 border border-base-300 text-[11px] text-base-content/70 space-y-1">
        <span class="font-bold block text-base-content">¿Qué pasa si rechazo el sobrecosto?</span>
        <p>El técnico suspenderá la intervención mayor, colocará un tapón o seguro provisional para evitar fugas inmediatas y únicamente se cobrará la tarifa de diagnóstico base ya amparada en la póliza.</p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-xl font-bold min-h-[50px]"
          onclick={onReject}
        >
          Rechazar Sobrecosto
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold min-h-[50px] shadow-md text-sm"
          onclick={onApprove}
        >
          Aceptar & Sumar a Escrow
        </button>
      </div>
    </div>
  </div>
{/if}
