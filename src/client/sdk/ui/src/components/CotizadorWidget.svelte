<script lang="ts">
import {
  calculateJobPricing,
  formatMxn,
  type Centavos,
  type LocationType,
  type ServiceCategory,
  type UrgencyLevel,
} from '@sdk';
import PriceBreakdown from './PriceBreakdown.svelte';
import { TRADE_META_REGISTRY } from '../types.ts';

interface Props {
  initialCategory?: ServiceCategory;
  isMember?: boolean;
  onBook?: (details: {
    category: ServiceCategory;
    locationType: LocationType;
    urgency: UrgencyLevel;
    totalCents: number;
    scheduleDate: string;
    scheduleTimeSlot: string;
    addressText: string;
    postalCode: string;
    gateInstructions: string;
  }) => void;
}

let { initialCategory = 'plomeria', isMember = false, onBook }: Props = $props();

const BASE_RATES: Record<ServiceCategory, number> = {
  plomeria: 45000,
  electricidad: 50000,
  cerrajeria: 40000,
  albanileria: 60000,
  mantenimiento_hogar: 40000,
  jardineria: 45000,
};

let selectedCategory = $state<ServiceCategory>('plomeria');
let selectedLocation = $state<LocationType>('residencial');
let selectedUrgency = $state<UrgencyLevel>('normal');

// Scheduling state
let scheduleMode = $state<'inmediata' | 'programada'>('inmediata');
let scheduleDate = $state('Hoy');
let scheduleTimeSlot = $state('14:00 - 16:00');

// Address & Security Access
let addressText = $state('Av. Horacio 1420, Depto 501, Polanco');
let postalCode = $state('11550');
let gateInstructions = $state('Anunciar con Don Pedro en caseta Torre B');

$effect(() => {
  if (initialCategory) {
    selectedCategory = initialCategory;
  }
});

const basePricing = $derived(
  calculateJobPricing(BASE_RATES[selectedCategory], {
    locationType: selectedLocation,
    urgency: selectedUrgency,
  }),
);

const finalPricing = $derived(() => {
  if (!isMember) return basePricing;
  // Apply 15% Yessyfy+ discount
  const discountedTotal = Math.round(basePricing.totalCustomerCents * 0.85) as Centavos;
  return {
    ...basePricing,
    totalCustomerCents: discountedTotal,
  };
});

function handleBook() {
  onBook?.({
    category: selectedCategory,
    locationType: selectedLocation,
    urgency: selectedUrgency,
    totalCents: finalPricing().totalCustomerCents,
    scheduleDate: scheduleMode === 'inmediata' ? 'Inmediato (30-45 min)' : scheduleDate,
    scheduleTimeSlot: scheduleMode === 'inmediata' ? 'En ruta' : scheduleTimeSlot,
    addressText,
    postalCode,
    gateInstructions,
  });
}
</script>

<div class="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-6 space-y-6 max-w-lg mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-xl font-extrabold tracking-tight text-base-content">Cotizador Transparente</h3>
      <p class="text-xs text-base-content/70 mt-1">
        Presupuestos claros desde el inicio. Sin sorpresas ni cobros ocultos.
      </p>
    </div>
    {#if isMember}
      <span class="badge badge-success badge-sm font-bold text-[10px]">
        Yessyfy+ Activo (-15%)
      </span>
    {/if}
  </div>

  <!-- 1. Trade Category Selector -->
  <div>
    <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">1. Selecciona el Oficio</div>
    <div class="grid grid-cols-3 gap-2">
      {#each Object.values(TRADE_META_REGISTRY) as trade}
        <button
          type="button"
          class="flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center {selectedCategory === trade.id ? 'border-primary bg-primary/10 font-bold shadow-sm' : 'border-base-300 hover:bg-base-200/60'}"
          onclick={() => selectedCategory = trade.id}
        >
          <span class="text-2xl mb-1">{trade.emoji}</span>
          <span class="text-xs leading-tight">{trade.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 2. Location Type & Urgency -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-1.5">2. Inmueble</div>
      <select bind:value={selectedLocation} class="select select-bordered select-sm w-full text-xs">
        <option value="residencial">Residencial (1.0x)</option>
        <option value="comercial">Comercial (1.15x)</option>
        <option value="premium">Premium / Plus (1.35x)</option>
      </select>
    </div>
    <div>
      <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-1.5">3. Urgencia</div>
      <select bind:value={selectedUrgency} class="select select-bordered select-sm w-full text-xs">
        <option value="normal">Normal (1.0x)</option>
        <option value="mismo_dia">Mismo Día (1.3x)</option>
        <option value="emergencia_24_7">Emergencia 24/7 (1.8x)</option>
      </select>
    </div>
  </div>

  <!-- 3. Scheduling Date & Time Slot -->
  <div>
    <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">4. ¿Cuándo lo necesitas?</div>
    <div class="join w-full grid grid-cols-2 mb-2">
      <button
        type="button"
        class="join-item btn btn-sm {scheduleMode === 'inmediata' ? 'btn-primary' : 'btn-outline'}"
        onclick={() => scheduleMode = 'inmediata'}
      >
        ⚡ Inmediato (30-45m)
      </button>
      <button
        type="button"
        class="join-item btn btn-sm {scheduleMode === 'programada' ? 'btn-primary' : 'btn-outline'}"
        onclick={() => scheduleMode = 'programada'}
      >
        📅 Programar Cita
      </button>
    </div>

    {#if scheduleMode === 'programada'}
      <div class="grid grid-cols-2 gap-2 pt-1">
        <div>
          <span class="text-[10px] text-base-content/60 block mb-1">Día</span>
          <select bind:value={scheduleDate} class="select select-bordered select-xs w-full">
            <option value="Hoy">Hoy</option>
            <option value="Mañana">Mañana</option>
            <option value="Sábado 29">Sábado 29</option>
            <option value="Domingo 30">Domingo 30</option>
          </select>
        </div>
        <div>
          <span class="text-[10px] text-base-content/60 block mb-1">Horario (Ventana 2h)</span>
          <select bind:value={scheduleTimeSlot} class="select select-bordered select-xs w-full">
            <option value="09:00 - 11:00">09:00 - 11:00</option>
            <option value="11:00 - 13:00">11:00 - 13:00</option>
            <option value="14:00 - 16:00">14:00 - 16:00</option>
            <option value="16:00 - 18:00">16:00 - 18:00</option>
          </select>
        </div>
      </div>
    {/if}
  </div>

  <!-- 4. Address & Condo Instructions -->
  <div class="space-y-2">
    <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60">5. Domicilio & Acceso (CDMX)</div>
    <input
      type="text"
      placeholder="Calle, No. Ext/Int, Colonia"
      bind:value={addressText}
      class="input input-bordered input-sm w-full text-xs"
    />
    <input
      type="text"
      placeholder="Instrucciones para caseta / vigilancia (opcional)"
      bind:value={gateInstructions}
      class="input input-bordered input-sm w-full text-xs"
    />
  </div>

  <!-- Pricing Preview -->
  <div class="space-y-1">
    <PriceBreakdown breakdown={finalPricing()} />
    {#if isMember}
      <div class="text-[11px] text-success font-semibold text-right">
        ✓ Descuento del 15% aplicado por Membresía Yessyfy+
      </div>
    {/if}
  </div>

  <!-- Action CTA Button -->
  <button
    type="button"
    class="btn btn-primary btn-block text-base font-bold shadow-lg shadow-primary/20 rounded-2xl min-h-[56px]"
    onclick={handleBook}
  >
    Pedir Servicio con Garantía ({formatMxn(finalPricing().totalCustomerCents)})
  </button>
</div>
