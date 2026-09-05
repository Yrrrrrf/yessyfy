<script lang="ts">
import { onMount } from 'svelte';
import { LeafletInteractiveMap, PhotoUploader, RouteSimulatorHud, StatusBadge } from '@sdk/ui';
import { formatMxn, type PhotoQAPhase } from '@sdk/core';
import {
  gpsTelemetryStore,
  type serviceOrderMachine,
  type ServiceOrderEvent,
} from '@sdk/state';
import type { SnapshotFrom } from 'xstate';

interface Props {
  fsmState: SnapshotFrom<typeof serviceOrderMachine>;
  onSendFsmEvent: (event: ServiceOrderEvent) => void;
  onOpenChat: () => void;
  onOpenSupplemental: () => void;
  onFinishJob: () => void;
}

let {
  fsmState,
  onSendFsmEvent,
  onOpenChat,
  onOpenSupplemental,
  onFinishJob,
}: Props = $props();

let activeUploadPhase = $state<PhotoQAPhase>('diagnostic_before');
let isCancelModalOpen = $state(false);
let cancelReason = $state<'in_transit' | 'no_show'>('in_transit');
let cancelDialogEl = $state<HTMLDialogElement | null>(null);

$effect(() => {
  if (isCancelModalOpen) {
    if (cancelDialogEl && !cancelDialogEl.open) {
      cancelDialogEl.showModal();
    }
  } else {
    if (cancelDialogEl?.open) {
      cancelDialogEl.close();
    }
  }
});

function handleCloseCancelModal() {
  isCancelModalOpen = false;
}

function handleConfirmCancellation() {
  if (cancelReason === 'in_transit') {
    onSendFsmEvent({ type: 'CANCEL_IN_TRANSIT' });
  } else {
    onSendFsmEvent({ type: 'CUSTOMER_NO_SHOW' });
  }
  isCancelModalOpen = false;
}

onMount(() => {
  gpsTelemetryStore.setOnArriveCallback((dist) => {
    onSendFsmEvent({ type: 'ARRIVE_ON_SITE', distanceMeters: dist });
  });
});
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <!-- Active Service Header Card -->
  <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 shadow-sm space-y-5">
    <div class="flex items-center justify-between border-b border-base-300 pb-4">
      <div>
        <span class="text-[10px] font-mono font-bold uppercase text-base-content/60 block">Servicio en Ejecución</span>
        <h2 class="text-xl font-black text-base-content">#{fsmState.context.code || 'YSF-2026-0881'}</h2>
      </div>
      <StatusBadge status={fsmState.value} />
    </div>

    <!-- Customer & Destination Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div class="p-3.5 rounded-2xl bg-base-200 border border-base-300 space-y-1">
        <span class="text-[10px] uppercase font-bold text-base-content/60 block">Cliente</span>
        <span class="font-bold text-base-content text-sm block">Mariana Garza Lozano</span>
        <span class="text-base-content/60 font-mono">📱 +52 55 4198 2300</span>
      </div>

      <div class="p-3.5 rounded-2xl bg-base-200 border border-base-300 space-y-1">
        <span class="text-[10px] uppercase font-bold text-base-content/60 block">Destino Residencial</span>
        <span class="font-bold text-base-content text-sm block">Av. Horacio 1420, Depto 501</span>
        <span class="text-base-content/60">Polanco V Sección, CDMX (Anunciarse en caseta Torre B)</span>
      </div>
    </div>

    <!-- Navigation Deep Links & Interactive Map (Waze / Google Maps / Leaflet) -->
    {#if fsmState.value === 'in_transit' || fsmState.value === 'accepted' || fsmState.value === 'dispatched'}
      <div class="space-y-4 pt-1">
        <!-- Floating Telemetry HUD -->
        <RouteSimulatorHud />

        <LeafletInteractiveMap
          heightClass="h-[280px]"
          center={gpsTelemetryStore.currentCoords}
          zoom={15}
          technicians={[
            {
              id: 'my_pos',
              name: 'Mi Ubicación',
              trade: 'plomeria',
              coords: gpsTelemetryStore.currentCoords,
              status: gpsTelemetryStore.isInsideGeofence ? 'on_site' : 'in_transit',
              etaMin: gpsTelemetryStore.etaMinutes,
              vehicle: 'moto',
            },
          ]}
          clientDestination={{
            name: 'Destino: Mariana Garza',
            address: 'Av. Horacio 1420, Polanco V Sección',
            coords: [19.4326, -99.1932],
            geofenceRadiusMeters: 150,
          }}
          traveledRoute={gpsTelemetryStore.traveledPath}
          remainingRoute={gpsTelemetryStore.remainingPath}
          technicianHeading={gpsTelemetryStore.heading}
          isInsideGeofence={gpsTelemetryStore.isInsideGeofence}
          selectedTechnicianId="my_pos"
        />

        <div class="grid grid-cols-2 gap-3">
          <a
            href="https://waze.com/ul?ll=19.4326,-99.1932&navigate=yes"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-primary rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2"
          >
            <span class="text-xl">🚗</span>
            <span>Abrir en Waze</span>
          </a>
          <a
            href="https://maps.google.com/?q=19.4326,-99.1932"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-neutral rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2"
          >
            <span class="text-xl">🗺️</span>
            <span>Google Maps</span>
          </a>
        </div>
      </div>
    {/if}

    {#if fsmState.value === 'accepted'}
      <div class="pt-1">
        <button
          type="button"
          class="btn btn-primary btn-block rounded-2xl font-black text-sm min-h-[56px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          onclick={() => onSendFsmEvent({ type: 'START_TRANSIT' })}
        >
          <span class="text-xl">🚗</span>
          <span>Iniciar Ruta hacia el Domicilio</span>
        </button>
      </div>
    {/if}

    <!-- Action Quick Grid -->
    <div class="grid grid-cols-2 gap-3 pt-1">
      {#if fsmState.value === 'in_transit' || fsmState.value === 'accepted'}
        <button
          type="button"
          class="btn {gpsTelemetryStore.isInsideGeofence ? 'btn-success text-white shadow-lg shadow-success/30 animate-pulse' : 'btn-outline btn-primary'} rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2"
          onclick={() => {
            if (fsmState.value === 'accepted') {
              onSendFsmEvent({ type: 'START_TRANSIT' });
            }
            gpsTelemetryStore.setProgress(100);
            onSendFsmEvent({
              type: 'ARRIVE_ON_SITE',
              distanceMeters: gpsTelemetryStore.distanceToDestinationMeters,
            });
          }}
        >
          <span class="text-xl">{gpsTelemetryStore.isInsideGeofence ? '🎯' : '📍'}</span>
          <div class="text-left leading-tight">
            <span class="text-xs font-black block">
              {gpsTelemetryStore.isInsideGeofence ? 'Confirmar Llegada en Caseta' : 'Marcar Llegada GPS'}
            </span>
            <span class="text-[10px] opacity-75 font-mono">
              {gpsTelemetryStore.isInsideGeofence ? '≤150m Geocerca Activa' : `${gpsTelemetryStore.distanceToDestinationMeters}m restantes`}
            </span>
          </div>
        </button>
      {:else}
        <div class="p-3 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center gap-2 text-success font-bold min-h-[56px]">
          <span class="text-xl">✅</span>
          <div class="text-left leading-tight">
            <span class="text-xs font-black block text-success">Llegada Confirmada</span>
            <span class="text-[10px] text-success/80 font-mono">GPS Validado en Caseta</span>
          </div>
        </div>
      {/if}

      <button
        type="button"
        class="btn btn-accent rounded-2xl font-bold min-h-[56px] flex items-center justify-center gap-2 text-accent-content"
        onclick={onOpenChat}
      >
        <span class="text-xl">💬</span>
        <span class="text-xs">Chat Seguro con Cliente</span>
      </button>
    </div>

    {#if fsmState.value === 'in_transit'}
      <!-- Collaborator Indemnity & In-Transit Incident Banner -->
      <div class="p-4 rounded-2xl bg-base-200 border border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🛡️</span>
          <div>
            <span class="font-bold text-base-content block">Protección de Traslado LFT / REPSE ($150.00 MXN)</span>
            <span class="text-base-content/60 text-[11px]">Si el cliente cancela en ruta o no se presenta en el domicilio, tu indemnización está garantizada.</span>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-outline btn-error btn-xs rounded-xl font-bold shrink-0 min-h-[40px] px-3"
          onclick={() => { cancelReason = 'in_transit'; isCancelModalOpen = true; }}
        >
          Reportar Cancelación / No-Show
        </button>
      </div>
    {/if}
  </div>

  {#if fsmState.value === 'cancelled'}
    <!-- Cancelled Order State with Indemnity Acknowledgment -->
    <div class="card bg-base-100 border border-error/40 rounded-3xl p-6 shadow-sm space-y-5 text-center">
      <div class="w-16 h-16 rounded-full bg-error/10 text-error font-black text-3xl mx-auto flex items-center justify-center">
        ✕
      </div>
      <div>
        <h3 class="text-lg font-black text-base-content">Servicio Cancelado</h3>
        <p class="text-xs text-base-content/70 max-w-md mx-auto mt-1">
          Este servicio fue cancelado en ruta o por ausencia del cliente. De conformidad con las directrices de la Ley Federal del Trabajo (LFT) y la política REPSE de Yessyfy, tus gastos de traslado y combustible están protegidos.
        </p>
      </div>

      <div class="bg-base-200 rounded-2xl p-4 border border-base-300 max-w-xs mx-auto space-y-1">
        <span class="text-[10px] text-base-content/60 uppercase font-bold tracking-wider block">Indemnización Acreditada</span>
        <p class="text-2xl font-black text-success font-mono">
          {formatMxn(fsmState.context.cancellationFeeCents || 15000)}
        </p>
        <span class="badge badge-success badge-xs font-mono font-bold">✓ Abonado a Billetera SAT</span>
      </div>

      <p class="text-[11px] text-base-content/50">
        Tu vehículo y cuenta están listos para recibir nuevas solicitudes en el Radar.
      </p>
    </div>
  {:else}
    <!-- 3-Phase Photo QA Workflow -->
    <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 shadow-sm space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-black text-base text-base-content">Protocolo de Evidencia Fotográfica QA</h3>
          <p class="text-xs text-base-content/60 mt-0.5">
            Obligatorio para liberar el pago Escrow y activar el certificado de garantía de 30 días.
          </p>
        </div>
        <span class="badge badge-success badge-sm font-mono font-bold">✓ GPS & SHA-256</span>
      </div>

      <!-- Phase Selector Tabs: 56px touch targets with completion status -->
      <div class="join w-full grid grid-cols-3">
        <button
          type="button"
          class="join-item btn min-h-[56px] font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 {activeUploadPhase === 'diagnostic_before' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
          onclick={() => activeUploadPhase = 'diagnostic_before'}
        >
          <span>1. Diagnóstico</span>
          {#if fsmState.context.photos?.some(p => p.phase === 'diagnostic_before')}
            <span class="badge badge-xs badge-success font-mono font-bold">✓</span>
          {/if}
        </button>
        <button
          type="button"
          class="join-item btn min-h-[56px] font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 {activeUploadPhase === 'work_progress' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
          onclick={() => activeUploadPhase = 'work_progress'}
        >
          <span>2. Avance</span>
          {#if fsmState.context.photos?.some(p => p.phase === 'work_progress')}
            <span class="badge badge-xs badge-success font-mono font-bold">✓</span>
          {/if}
        </button>
        <button
          type="button"
          class="join-item btn min-h-[56px] font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 {activeUploadPhase === 'proof_finished' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
          onclick={() => activeUploadPhase = 'proof_finished'}
        >
          <span>3. Concluido</span>
          {#if fsmState.context.photos?.some(p => p.phase === 'proof_finished')}
            <span class="badge badge-xs badge-success font-mono font-bold">✓</span>
          {/if}
        </button>
      </div>

      <PhotoUploader
        phase={activeUploadPhase}
        jobCode={fsmState.context.code || 'YSF-2026-0881'}
        onPhotoCaptured={(data) => {
          onSendFsmEvent({
            type: 'ADD_PHOTO',
            photo: {
              phase: data.phase,
              imageUrl: data.dataUrl,
              sha256: data.sha256,
              latitude: data.latitude,
              longitude: data.longitude,
            },
          });
        }}
      />
    </div>

    <!-- Supplemental Hidden Damage Report Trigger -->
    <div class="card bg-base-200 border border-warning/50 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div class="flex items-center gap-3">
        <span class="text-2xl">⚠️</span>
        <div>
          <h4 class="font-bold text-sm text-base-content">¿Detectaste daños ocultos o refacciones extra?</h4>
          <p class="text-xs text-base-content/60">Solicita la aprobación del sobrecosto antes de continuar.</p>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-warning btn-sm rounded-xl font-bold shrink-0"
        onclick={onOpenSupplemental}
      >
        Reportar Sobrecosto →
      </button>
    </div>

    <!-- Conclude Work & Client Signature Trigger -->
    <button
      type="button"
      class="btn btn-accent btn-block rounded-2xl font-black text-sm min-h-[56px] shadow-lg shadow-accent/20 text-accent-content"
      onclick={onFinishJob}
    >
      ✓ Concluir Trabajo & Solicitar Firma al Cliente
    </button>
  {/if}
</div>

<!-- In-Transit Cancellation & No-Show Modal (DaisyUI v5 native dialog) -->
<dialog
  bind:this={cancelDialogEl}
  class="modal modal-bottom sm:modal-middle"
  oncancel={(e) => {
    e.preventDefault();
    handleCloseCancelModal();
  }}
  onclose={() => {
    if (isCancelModalOpen) handleCloseCancelModal();
  }}
>
  <div class="modal-box bg-base-100 border-2 border-error/40 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5">
    <div class="flex items-center justify-between border-b border-base-300 pb-3">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-error/20 text-error font-black flex items-center justify-center text-lg">
          ⚠️
        </div>
        <div>
          <h3 class="font-black text-base text-base-content">Reportar Cancelación / Incidencia</h3>
          <p class="text-[11px] text-base-content/60">Protección Contractual LFT / REPSE</p>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={handleCloseCancelModal}>✕</button>
    </div>

    <!-- Indemnity Highlight Banner -->
    <div class="p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center gap-3">
      <span class="text-2xl">🛡️</span>
      <div>
        <span class="font-bold text-xs text-success-content block">Indemnización al Colaborador Garantizada</span>
        <p class="text-[11px] text-base-content/80 mt-0.5">
          Recibirás <strong>$150.00 MXN</strong> ({formatMxn(15000)}) directos a tu Billetera SAT para cubrir costos de combustible y tiempo de traslado.
        </p>
      </div>
    </div>

    <!-- Reason Selector -->
    <div class="space-y-2">
      <span class="text-[11px] uppercase font-bold text-base-content/70 tracking-wider block">Selecciona el motivo de cancelación:</span>
      <div class="space-y-2">
        <label class="flex items-start gap-3 p-3 rounded-xl border {cancelReason === 'in_transit' ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/50'} cursor-pointer">
          <input
            type="radio"
            name="cancelReason"
            value="in_transit"
            checked={cancelReason === 'in_transit'}
            onchange={() => cancelReason = 'in_transit'}
            class="radio radio-primary radio-sm mt-0.5"
          />
          <div>
            <span class="font-bold text-xs text-base-content block">Cancelación en Ruta por el Cliente</span>
            <span class="text-[11px] text-base-content/60">El cliente canceló la solicitud mientras ibas en camino hacia el domicilio.</span>
          </div>
        </label>

        <label class="flex items-start gap-3 p-3 rounded-xl border {cancelReason === 'no_show' ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/50'} cursor-pointer">
          <input
            type="radio"
            name="cancelReason"
            value="no_show"
            checked={cancelReason === 'no_show'}
            onchange={() => cancelReason = 'no_show'}
            class="radio radio-primary radio-sm mt-0.5"
          />
          <div>
            <span class="font-bold text-xs text-base-content block">Cliente No Se Presentó (No-Show)</span>
            <span class="text-[11px] text-base-content/60">Llegaste al domicilio y el cliente no atendió tras el tiempo reglamentario de espera.</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Modal Actions -->
    <div class="grid grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        class="btn btn-ghost btn-sm rounded-xl font-bold min-h-[48px]"
        onclick={handleCloseCancelModal}
      >
        Volver
      </button>
      <button
        type="button"
        class="btn btn-error btn-sm rounded-xl font-bold min-h-[48px] text-white shadow-md shadow-error/20"
        onclick={handleConfirmCancellation}
      >
        Confirmar Cancelación
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={handleCloseCancelModal}>close</button>
  </form>
</dialog>
