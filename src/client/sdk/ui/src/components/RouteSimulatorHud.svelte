<script lang="ts">
import { gpsTelemetryStore, type GpsTelemetryEngine } from '@sdk/state';

interface Props {
  store?: GpsTelemetryEngine;
  class?: string;
  title?: string;
}

let {
  store = gpsTelemetryStore,
  class: className = '',
  title = 'Simulador de Telemetría GPS en Vivo',
}: Props = $props();

const progressRounded = $derived(Math.round(store.progress));
const etaDisplay = $derived(
  store.isInsideGeofence ? '0 min (En Caseta)' : `~${store.etaMinutes} min`
);
</script>

<div class="card bg-base-100/95 backdrop-blur-md border border-base-300 rounded-3xl p-5 shadow-lg space-y-4 {className}">
  <!-- Header Bar: Title, Live Status Badge & ETA -->
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300/80 pb-3">
    <div class="flex items-center gap-2">
      <span class="text-xl">🛰️</span>
      <div>
        <h4 class="font-black text-sm text-base-content leading-tight">{title}</h4>
        <span class="text-[10px] font-mono text-base-content/60 uppercase">
          Leaflet 1.9.4 • Geocerca 150m • CDMX Polanco
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if store.isInsideGeofence}
        <span class="badge badge-success font-black text-white text-xs px-2.5 py-1 animate-bounce shadow-sm">
          🚨 ¡En Caseta! (≤150m)
        </span>
      {:else if store.isPlaying}
        <span class="badge badge-info font-bold text-info-content text-xs px-2.5 py-1 animate-pulse shadow-sm">
          🏍️ En Ruta (25 km/h)
        </span>
      {:else}
        <span class="badge badge-ghost font-bold text-base-content/70 text-xs px-2.5 py-1">
          ⏸️ En Pausa
        </span>
      {/if}

      <span class="badge badge-outline badge-primary font-mono text-xs font-bold">
        ⏱️ ETA: {etaDisplay}
      </span>
    </div>
  </div>

  <!-- Scrub Slider & Traveled Progress -->
  <div class="space-y-1.5">
    <div class="flex items-center justify-between text-xs font-mono font-bold text-base-content/70">
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-base-content/40"></span>
        0% Reforma
      </span>
      <span class="text-primary font-black text-sm">
        {progressRounded}% completado
      </span>
      <span class="flex items-center gap-1">
        100% Horacio 1420
        <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
      </span>
    </div>

    <input
      type="range"
      min="0"
      max="100"
      step="0.5"
      value={store.progress}
      aria-label="Progreso del recorrido simulado"
      class="range range-primary range-sm w-full cursor-pointer"
      oninput={(e) => store.setProgress(parseFloat(e.currentTarget.value))}
    />
  </div>

  <!-- Action Controls: Play/Pause, Reset, Speed Multipliers -->
  <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn btn-sm rounded-2xl font-black gap-1.5 min-w-[120px] shadow-sm {store.isPlaying ? 'btn-warning text-warning-content' : 'btn-primary text-primary-content'}"
        onclick={() => store.togglePlay()}
      >
        <span>{store.isPlaying ? '⏸️' : '▶️'}</span>
        <span>{store.isPlaying ? 'Pausar' : 'Iniciar'}</span>
      </button>

      <button
        type="button"
        class="btn btn-sm btn-ghost rounded-2xl font-bold border border-base-300 hover:bg-base-200"
        title="Reiniciar al 0%"
        onclick={() => store.reset()}
      >
        <span>🔄</span>
        <span class="hidden sm:inline">Reiniciar</span>
      </button>
    </div>

    <!-- Multiplier Selector -->
    <div class="flex items-center gap-1.5">
      <span class="text-[11px] font-mono text-base-content/60 font-bold uppercase hidden sm:inline">Velocidad:</span>
      <div class="join bg-base-200 p-0.5 rounded-2xl border border-base-300">
        <button
          type="button"
          class="btn btn-xs join-item rounded-xl font-mono font-black {store.playbackSpeed === 1 ? 'btn-primary text-primary-content shadow' : 'btn-ghost'}"
          onclick={() => store.setPlaybackSpeed(1)}
        >
          1x
        </button>
        <button
          type="button"
          class="btn btn-xs join-item rounded-xl font-mono font-black {store.playbackSpeed === 2 ? 'btn-primary text-primary-content shadow' : 'btn-ghost'}"
          onclick={() => store.setPlaybackSpeed(2)}
        >
          2x
        </button>
        <button
          type="button"
          class="btn btn-xs join-item rounded-xl font-mono font-black {store.playbackSpeed === 4 ? 'btn-primary text-primary-content shadow' : 'btn-ghost'}"
          onclick={() => store.setPlaybackSpeed(4)}
        >
          4x
        </button>
      </div>
    </div>
  </div>

  <!-- Telemetry Vector Metrics Readout -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-base-300/60 text-xs font-mono">
    <div class="p-2 rounded-2xl bg-base-200/80 border border-base-300 space-y-0.5">
      <span class="text-[10px] uppercase font-bold text-base-content/60 block">Recorrido</span>
      <span class="font-black text-base-content">{Math.round(store.distanceTraveledMeters)} m</span>
    </div>

    <div class="p-2 rounded-2xl bg-base-200/80 border border-base-300 space-y-0.5">
      <span class="text-[10px] uppercase font-bold text-base-content/60 block">Restante</span>
      <span class="font-black text-base-content">{Math.round(store.distanceRemainingMeters)} m</span>
    </div>

    <div class="p-2 rounded-2xl bg-base-200/80 border border-base-300 space-y-0.5">
      <span class="text-[10px] uppercase font-bold text-base-content/60 block">A Caseta</span>
      <span class="font-black {store.isInsideGeofence ? 'text-success' : 'text-primary'}">
        {Math.round(store.distanceToDestinationMeters)} m
      </span>
    </div>

    <div class="p-2 rounded-2xl bg-base-200/80 border border-base-300 space-y-0.5">
      <span class="text-[10px] uppercase font-bold text-base-content/60 block">Rumbo / Giro</span>
      <span class="font-black text-base-content">{Math.round(store.heading)}°</span>
    </div>
  </div>
</div>



