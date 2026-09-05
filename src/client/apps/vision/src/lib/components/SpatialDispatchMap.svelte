<script lang="ts">
import { InAppChatDrawer, LeafletInteractiveMap, StatusBadge, SvgGpsTracker, type TechnicianPin } from '@sdk/ui';
import { formatMxn } from '@sdk/core';
import { visionStore } from '../visionStore.svelte.ts';

let mapMode = $state<'leaflet' | 'svg'>('leaflet');
let isChatOpen = $state(false);

const FLEET_TECHNICIANS: TechnicianPin[] = [
  {
    id: 'tech_01',
    name: 'Roberto Morales',
    trade: 'plomeria',
    coords: [19.4358, -99.1852], // Polanco
    status: 'in_transit',
    etaMin: 11,
    vehicle: 'moto',
    rating: 4.95,
  },
  {
    id: 'tech_02',
    name: 'Ignacio Fuentes',
    trade: 'electricidad',
    coords: [19.4187, -99.1638], // Roma Norte
    status: 'on_site',
    etaMin: 0,
    vehicle: 'auto',
    rating: 4.88,
  },
  {
    id: 'tech_03',
    name: 'Salvador Vega',
    trade: 'cerrajeria',
    coords: [19.3548, -99.1627], // Coyoacán
    status: 'available',
    etaMin: 20,
    vehicle: 'moto',
    rating: 4.92,
  },
  {
    id: 'tech_04',
    name: 'Carlos Mendoza',
    trade: 'albanileria',
    coords: [19.3854, -99.1728], // Del Valle
    status: 'available',
    etaMin: 25,
    vehicle: 'auto',
    rating: 4.85,
  },
  {
    id: 'tech_05',
    name: 'Mariano Ríos',
    trade: 'jardineria',
    coords: [19.3628, -99.2592], // Santa Fe
    status: 'in_transit',
    etaMin: 18,
    vehicle: 'moto',
    rating: 4.90,
  },
];

const selectedOrder = $derived(visionStore.selectedTicket);

const clientDestination = $derived(
  selectedOrder
    ? {
        name: selectedOrder.customer?.fullName ?? 'Cliente Yessyfy',
        address: selectedOrder.addressText,
        coords: [
          selectedOrder.coordinates?.lat ?? 19.4326,
          selectedOrder.coordinates?.lng ?? -99.1332,
        ] as [number, number],
        geofenceRadiusMeters: 150,
      }
    : {
        name: 'Mariana Garza',
        address: 'Av. Horacio 1420, Depto 402, Polanco V Sección',
        coords: [19.4326, -99.1912] as [number, number],
        geofenceRadiusMeters: 150,
      }
);
</script>

  <div class="lg:col-span-8 space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 class="text-xl font-black text-base-content tracking-tight">Telemetría GIS Multivehículo CDMX</h2>
        <p class="text-xs text-base-content/60">Polanco, Condesa, Coyoacán, Benito Juárez, Santa Fe (Geocercas 150m)</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Map View Toggle -->
        <div class="join bg-base-200 p-1 rounded-2xl border border-base-300">
          <button
            type="button"
            class="btn btn-xs join-item rounded-xl font-bold {mapMode === 'leaflet' ? 'btn-primary text-primary-content shadow' : 'btn-ghost'}"
            onclick={() => (mapMode = 'leaflet')}
          >
            🗺️ Mapa Leaflet GIS
          </button>
          <button
            type="button"
            class="btn btn-xs join-item rounded-xl font-bold {mapMode === 'svg' ? 'btn-primary text-primary-content shadow' : 'btn-ghost'}"
            onclick={() => (mapMode = 'svg')}
          >
            📐 HUD Vectorial
          </button>
        </div>
        <span class="badge badge-success badge-sm font-mono font-bold">18 TÉCNICOS EN RUTA</span>
      </div>
    </div>

    {#if mapMode === 'leaflet'}
      <LeafletInteractiveMap
        heightClass="h-[460px]"
        center={[19.4147, -99.1678]}
        zoom={13}
        technicians={FLEET_TECHNICIANS}
        {clientDestination}
        selectedTechnicianId="tech_01"
        onTechnicianClick={(id) => console.log('Selected tech:', id)}
      />
    {:else}
      <SvgGpsTracker
        etaMinutes={11}
        collaboratorName="Roberto Morales Ramírez"
        vehicleMode="moto"
        progressPercent={70}
      />
    {/if}
  </div>

{#if selectedOrder}
  <InAppChatDrawer
    open={isChatOpen}
    jobCode={selectedOrder.code}
    peerName={`${selectedOrder.collaborator?.fullName ?? 'Técnico'} & ${selectedOrder.customer?.fullName ?? 'Cliente'}`}
    peerRole="operations"
    currentUserRole="operations"
    onClose={() => (isChatOpen = false)}
  />
{/if}
