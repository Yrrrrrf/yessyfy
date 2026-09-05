<script lang="ts">
import { formatMxn } from '@sdk/core';
import { LeafletInteractiveMap, type ClientDestination, type TechnicianPin } from '@sdk/ui';

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
  clientCoords: [number, number];
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
  clientCoords: [19.4326, -99.1932],
};

const collabLocation: [number, number] = [19.4358, -99.1852]; // Polanco Base
const radarCenterCoords: [number, number] = [19.4342, -99.1892]; // Midpoint Polanco Base <-> Client

const routeToJob: Array<[number, number]> = [
  collabLocation,
  [19.4352, -99.1872],
  [19.4345, -99.1895],
  [19.4338, -99.1912],
  [19.4330, -99.1925],
  activeJobOffer.clientCoords,
];

const radarTechnicians = $derived<TechnicianPin[]>([
  {
    id: 'my_collab_pin',
    name: isCollabOnDuty ? 'Mi Ubicación (En Guardia)' : 'Mi Ubicación (Pausado)',
    trade: 'plomeria',
    coords: collabLocation,
    status: isCollabOnDuty ? 'available' : 'offline',
    etaMin: 0,
    vehicle: 'moto',
    rating: 4.95,
  },
]);

const incomingClientDestination = $derived<ClientDestination>({
  name: 'Destino Solicitud: Mariana Garza',
  address: activeJobOffer.address,
  coords: activeJobOffer.clientCoords,
  geofenceRadiusMeters: 150,
});
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  <!-- INCOMING JOB ALERT (When timer is active: Full Map + 45s Countdown) -->
  {#if radarTimerSeconds > 0}
    <div class="card bg-gradient-to-br from-error/15 via-base-100 to-base-200 border-2 border-error rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-pulse">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl animate-bounce">🚨</span>
          <div>
            <span class="badge badge-error text-white badge-sm font-black uppercase">¡Nueva Solicitud Cercana!</span>
            <h3 class="font-black text-xl text-base-content mt-1">{activeJobOffer.title}</h3>
          </div>
        </div>

        <div class="w-14 h-14 rounded-2xl bg-error text-white font-mono font-black text-xl flex items-center justify-center shadow-lg ring-4 ring-error/30">
          {radarTimerSeconds}s
        </div>
      </div>

      <!-- Real Leaflet Route & Destination Map -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-base-content/70">
          <span>Ruta Estimada a Domicilio del Cliente:</span>
          <span class="text-primary font-mono">1.2 km • ~5 min en moto</span>
        </div>
        <LeafletInteractiveMap
          heightClass="h-[280px]"
          center={radarCenterCoords}
          zoom={15}
          technicians={radarTechnicians}
          clientDestination={incomingClientDestination}
          activeRoute={routeToJob}
          selectedTechnicianId="my_collab_pin"
        />
      </div>

      <!-- Job Card Details Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-base-100 border border-base-300 text-xs">
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Ubicación</span>
          <span class="font-semibold text-base-content">📍 {activeJobOffer.address}</span>
          <span class="text-[10px] text-base-content/50 block font-mono">Polanco V Sección, CDMX</span>
        </div>
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Tiempo Estimado</span>
          <span class="font-semibold text-base-content">⏱️ ~{activeJobOffer.estDurationMinutes} minutos de trabajo</span>
          <span class="text-[10px] text-base-content/50 block">Cliente Verificado (4.9 ★)</span>
        </div>
        <div>
          <span class="text-[10px] text-base-content/60 block uppercase font-bold">Ganancia Neta SPEI</span>
          <span class="font-mono font-black text-success text-base">{formatMxn(activeJobOffer.payoutNetCents)}</span>
          <span class="text-[10px] text-base-content/50 block font-mono">Retenciones SAT 1% ISR calculadas</span>
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
  {:else}
    <!-- LIVE TACTICAL RADAR MAP (Technician's Standby View) -->
    <div class="card bg-base-100 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="font-black text-base text-base-content flex items-center gap-2">
            <span>🗺️</span> Telemetría de Cobertura & Demanda Activa
          </h3>
          <p class="text-xs text-base-content/60">
            {isCollabOnDuty
              ? 'Tu señal GPS está activa y transmitiendo a la central de despacho.'
              : 'Conéctate para activar tu transmisión de posición.'}
          </p>
        </div>

        {#if isCollabOnDuty}
          <span class="badge badge-success badge-sm font-mono font-bold text-white flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            RADAR ONLINE
          </span>
        {/if}
      </div>

      <!-- Interactive Standby Map with Client Pin, Geofence, and Route -->
      <LeafletInteractiveMap
        heightClass="h-[440px]"
        center={radarCenterCoords}
        zoom={15}
        technicians={radarTechnicians}
        clientDestination={incomingClientDestination}
        activeRoute={isCollabOnDuty ? routeToJob : null}
        selectedTechnicianId="my_collab_pin"
      />

      <!-- Active Job Opportunity Card on Standby Radar -->
      <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-base-200 to-base-100 border border-primary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div class="flex items-start gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-primary text-primary-content font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
            {activeJobOffer.categoryEmoji}
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge badge-primary badge-sm font-black text-primary-content uppercase">Nueva Chamba en Radar</span>
              <span class="text-xs font-mono font-bold text-base-content/70">📍 {activeJobOffer.distanceKm} km • ~5 min en moto</span>
            </div>
            <h4 class="font-black text-base text-base-content">{activeJobOffer.title}</h4>
            <div class="text-xs text-base-content/70 flex items-center gap-2 flex-wrap">
              <span class="font-bold text-base-content flex items-center gap-1">
                <span>👤</span>
                <span>Cliente: Mariana Garza</span>
              </span>
              <span>•</span>
              <span>{activeJobOffer.address}</span>
              <span>•</span>
              <span class="text-warning font-bold">★ {activeJobOffer.clientRating}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4 self-end sm:self-center shrink-0">
          <div class="text-right">
            <span class="text-[10px] text-base-content/60 uppercase font-bold block">Ganancia Neta SPEI</span>
            <span class="font-mono font-black text-success text-xl leading-tight block">{formatMxn(activeJobOffer.payoutNetCents)}</span>
            <span class="text-[10px] text-base-content/50 font-mono block">1% ISR incluido</span>
          </div>

          <div class="flex items-center gap-2">
            {#if isCollabOnDuty}
              <button
                type="button"
                class="btn btn-outline btn-sm rounded-xl font-bold"
                onclick={onTriggerSimulatedJob}
              >
                🚨 Simular 45s
              </button>
              <button
                type="button"
                class="btn btn-success text-white btn-sm rounded-xl font-black shadow-md shadow-success/20"
                onclick={() => onAcceptJob(activeJobOffer)}
              >
                ✓ Aceptar Chamba
              </button>
            {:else}
              <span class="badge badge-neutral text-xs font-bold py-3 px-3">
                Conéctate para aceptar
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
