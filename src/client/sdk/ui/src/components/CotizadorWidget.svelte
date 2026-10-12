<script lang="ts">
import {
  calculateJobPricing,
  formatMxn,
  type Centavos,
  type LocationType,
  type ServiceCategory,
  type UrgencyLevel,
} from '@sdk/core';
import PriceBreakdown from './PriceBreakdown.svelte';
import TradeCategorySelector from './cotizador/TradeCategorySelector.svelte';
import UrgencySelector from './cotizador/UrgencySelector.svelte';
import ScheduleSelector from './cotizador/ScheduleSelector.svelte';
import AddressAccessForm from './cotizador/AddressAccessForm.svelte';

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

const finalPricing = $derived(
  isMember
    ? calculateJobPricing(
        Math.round(BASE_RATES[selectedCategory] * 0.85),
        {
          locationType: selectedLocation,
          urgency: selectedUrgency,
        },
      )
    : basePricing,
);

function handleBook() {
  onBook?.({
    category: selectedCategory,
    locationType: selectedLocation,
    urgency: selectedUrgency,
    totalCents: finalPricing.totalCustomerCents,
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

  <TradeCategorySelector
    selectedCategory={selectedCategory}
    onSelect={(cat) => selectedCategory = cat}
  />

  <UrgencySelector
    selectedLocation={selectedLocation}
    selectedUrgency={selectedUrgency}
    onLocationChange={(loc) => selectedLocation = loc}
    onUrgencyChange={(urg) => selectedUrgency = urg}
  />

  <ScheduleSelector
    scheduleMode={scheduleMode}
    scheduleDate={scheduleDate}
    scheduleTimeSlot={scheduleTimeSlot}
    onModeChange={(mode) => scheduleMode = mode}
    onDateChange={(d) => scheduleDate = d}
    onTimeChange={(t) => scheduleTimeSlot = t}
  />

  <AddressAccessForm
    bind:addressText
    bind:gateInstructions
  />

  <div class="space-y-1">
    <PriceBreakdown breakdown={finalPricing} />
    {#if isMember}
      <div class="text-[11px] text-success font-semibold text-right">
        ✓ Descuento del 15% aplicado por Membresía Yessyfy+
      </div>
    {/if}
  </div>

  <button
    type="button"
    class="btn btn-primary btn-block text-base font-bold shadow-lg shadow-primary/20 rounded-2xl min-h-[56px]"
    onclick={handleBook}
  >
    Pedir Servicio con Garantía ({formatMxn(finalPricing.totalCustomerCents)})
  </button>
</div>



