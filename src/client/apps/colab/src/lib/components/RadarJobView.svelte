<script lang="ts">
import { formatMxn } from '@sdk/core';

interface IncomingJob {
  id: string;
  code: string;
  categoryName: string;
  categoryEmoji: string;
  title: string;
  address: string;
  distanceKm: number;
  estDurationMinutes: number;
  payoutNetCents: number;
  clientRating: number;
}

interface Props {
  isCollabOnDuty: boolean;
  radarTimerSeconds: number;
  onAcceptJob: (job: IncomingJob) => void;
  onRejectJob: (job: IncomingJob) => void;
  onTriggerSimulatedJob: () => void;
}

let {
  isCollabOnDuty,
  radarTimerSeconds,
  onAcceptJob,
  onRejectJob,
  onTriggerSimulatedJob,
}: Props = $props();

const activeJobOffer: IncomingJob = {
  id: 'job_incoming_01',
  code: 'YSF-2026-0881',
  categoryName: 'Plomería',
  categoryEmoji: '🔧',
  title: 'Reparación de Fuga en Monomando y Llave Angular',
  address: 'Av. Horacio 1420, Depto 501, Polanco V Sección',
  distanceKm: 1.2,
  estDurationMinutes: 45,
  payoutNetCents: 34200, // $342.00 MXN net payout after fee & SAT retentions
  clientRating: 4.9,
};
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
  <!-- Status Banner -->
  <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-2xl {isCollabOnDuty ? 'bg-success text-white' : 'bg-base-300 text-base-content/50'} font-black text-2xl flex items-center justify-center shadow-md">
        📡
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-black text-base-content">Radar de Servicios Activo</h2>
          <span class="badge {isCollabOnDuty ? 'badge-success' : 'badge-neutral'} badge-xs font-bold uppercase">
            {isCollabOnDuty ? 'En Guardia' : 'Pausado'}
          </span>
        </div>
        <p class="text-xs text-base-content/70 mt-0.5">
          {isCollabOnDuty ? 'Escaneando solicitudes en tiempo real en Polanco, Condesa y Roma Norte.' : 'Activa el modo guardia para recibir ofertas de trabajo.'}
        </p>
      </div>
    </div>

    {#if isCollabOnDuty && radarTimerSeconds === 0}
      <button
        type="button"
        class="btn btn-outline btn-sm rounded-xl font-bold"
        onclick={onTriggerSimulatedJob}
      >
        Simular Solicitud Entrante 🚨
      </button>
    {/if}
  </div>

  <!-- INCOMING JOB ALERT (When timer is active) -->
  {#if radarTimerSeconds > 0}
    <div class="card bg-gradient-to-br from-error/20 via-base-100 to-base-200 border-2 border-error rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-pulse">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl animate-bounce">🚨</span>
          <div>
            <span class="badge badge-error text-white badge-sm font-black uppercase">¡Nueva Solicitud Cercana!</span>
            <h3 class="font-black text-xl text-base-content mt-1">{activeJobOffer.title}</h3>
          </div>
        </div>

        <div class="w-14 h-14 rounded-2xl bg-error text-white font-mono font-black text-xl flex items-center justify-center shadow-lg">
          {radarTimerSeconds}s
        </div>
      </div>

      <!-- Job Card Details -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-base-100 border border-base-300 text-xs">
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Ubicación</span>
          <span class="font-semibold text-base-content">📍 {activeJobOffer.address}</span>
          <span class="text-[10px] text-base-content/50 block font-mono">~{activeJobOffer.distanceKm} km (5 min en moto)</span>
        </div>
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Tiempo Estimado</span>
          <span class="font-semibold text-base-content">⏱️ ~{activeJobOffer.estDurationMinutes} minutos</span>
          <span class="text-[10px] text-base-content/50 block">Cliente: 4.9 ★ verificado</span>
        </div>
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Ganancia Neta SPEI</span>
          <span class="font-mono font-black text-success text-base">{formatMxn(activeJobOffer.payoutNetCents)}</span>
          <span class="text-[10px] text-base-content/50 block font-mono">Retenciones SAT ya calculadas</span>
        </div>
      </div>

      <!-- Accept / Reject Actions -->
      <div class="grid grid-cols-2 gap-4 pt-2">
        <button
          type="button"
          class="btn btn-outline btn-md rounded-2xl font-bold min-h-[56px]"
          onclick={() => onRejectJob(activeJobOffer)}
        >
          Rechazar Solicitud
        </button>
        <button
          type="button"
          class="btn btn-success text-white btn-md rounded-2xl font-black text-base min-h-[56px] shadow-lg shadow-success/20"
          onclick={() => onAcceptJob(activeJobOffer)}
        >
          ✓ Aceptar Chamba Inmediata
        </button>
      </div>
    </div>
  {:else if isCollabOnDuty}
    <!-- Radar Scanning Animation -->
    <div class="text-center py-16 space-y-4">
      <div class="relative w-24 h-24 mx-auto flex items-center justify-center">
        <div class="absolute inset-0 rounded-full bg-accent/20 animate-ping"></div>
        <div class="w-16 h-16 rounded-full bg-accent text-accent-content font-black text-2xl flex items-center justify-center shadow-lg">
          📡
        </div>
      </div>
      <div>
        <h3 class="font-black text-base text-base-content">Buscando solicitudes en tu zona...</h3>
        <p class="text-xs text-base-content/60 mt-1 max-w-sm mx-auto">
          Mantén la aplicación abierta. Cuando un cliente solicite un servicio cerca de ti, sonará la alerta y tendrás 45 segundos para aceptar.
        </p>
      </div>
    </div>
  {/if}
</div>
