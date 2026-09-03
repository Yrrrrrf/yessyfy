<script lang="ts">
import { PhotoUploader, StatusBadge } from '@sdk/ui';
import type { PhotoQAPhase } from '@sdk/core';
import type { serviceOrderMachine, ServiceOrderEvent } from '@sdk/state';
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

    <!-- Navigation Deep Links (Waze / Google Maps) -->
    {#if fsmState.value === 'in_transit' || fsmState.value === 'accepted' || fsmState.value === 'dispatched'}
      <div class="grid grid-cols-2 gap-3 pt-1">
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
    {/if}

    <!-- Action Quick Grid -->
    <div class="grid grid-cols-2 gap-3 pt-1">
      <button
        type="button"
        class="btn btn-outline btn-sm rounded-2xl font-bold min-h-[52px] flex items-center justify-center gap-2"
        onclick={() => onSendFsmEvent({ type: 'ARRIVE_ON_SITE' })}
      >
        <span class="text-lg">📍</span>
        <span class="text-xs">Marcar Llegada GPS</span>
      </button>

      <button
        type="button"
        class="btn btn-accent btn-sm rounded-2xl font-bold min-h-[52px] flex items-center justify-center gap-2 text-accent-content"
        onclick={onOpenChat}
      >
        <span class="text-lg">💬</span>
        <span class="text-xs">Chat Seguro con Cliente</span>
      </button>
    </div>
  </div>

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

    <!-- Phase Selector Tabs -->
    <div class="join w-full grid grid-cols-3">
      <button
        type="button"
        class="join-item btn btn-sm font-bold {activeUploadPhase === 'diagnostic_before' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
        onclick={() => activeUploadPhase = 'diagnostic_before'}
      >
        1. Diagnóstico Inicial
      </button>
      <button
        type="button"
        class="join-item btn btn-sm font-bold {activeUploadPhase === 'work_progress' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
        onclick={() => activeUploadPhase = 'work_progress'}
      >
        2. Avance en Sitio
      </button>
      <button
        type="button"
        class="join-item btn btn-sm font-bold {activeUploadPhase === 'proof_finished' ? 'btn-primary' : 'btn-ghost border border-base-300'}"
        onclick={() => activeUploadPhase = 'proof_finished'}
      >
        3. Trabajo Concluido
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
</div>
