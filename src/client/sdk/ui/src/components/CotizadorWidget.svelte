<script lang="ts">
import {
  calculateJobPricing,
  type LocationType,
  type ServiceCategory,
  type UrgencyLevel,
} from '@sdk';
import PriceBreakdown from './PriceBreakdown.svelte';
import { TRADE_META_REGISTRY } from '../types.ts';

interface Props {
  initialCategory?: ServiceCategory;
  onBook?: (details: {
    category: ServiceCategory;
    locationType: LocationType;
    urgency: UrgencyLevel;
    totalCents: number;
  }) => void;
}

let { initialCategory = 'plomeria', onBook }: Props = $props();

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

$effect(() => {
  if (initialCategory) {
    selectedCategory = initialCategory;
  }
});

const currentPricing = $derived(
  calculateJobPricing(BASE_RATES[selectedCategory], {
    locationType: selectedLocation,
    urgency: selectedUrgency,
  }),
);

function handleBook() {
  onBook?.({
    category: selectedCategory,
    locationType: selectedLocation,
    urgency: selectedUrgency,
    totalCents: currentPricing.totalCustomerCents,
  });
}
</script>

<div class="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-6 space-y-6 max-w-lg mx-auto">
  <div>
    <h3 class="text-xl font-extrabold tracking-tight text-base-content">Cotizador Transparente</h3>
    <p class="text-xs text-base-content/70 mt-1">
      Presupuestos claros desde el inicio. Sin sorpresas ni tarifas infladas en sitio.
    </p>
  </div>

  <!-- Trade Category Selector -->
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

  <!-- Location Type -->
  <div>
    <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">2. Tipo de Inmueble</div>
    <div class="join w-full grid grid-cols-3">
      <button
        type="button"
        class="join-item btn btn-sm {selectedLocation === 'residencial' ? 'btn-primary' : 'btn-outline'}"
        onclick={() => selectedLocation = 'residencial'}
      >
        Residencial
      </button>
      <button
        type="button"
        class="join-item btn btn-sm {selectedLocation === 'comercial' ? 'btn-primary' : 'btn-outline'}"
        onclick={() => selectedLocation = 'comercial'}
      >
        Comercial
      </button>
      <button
        type="button"
        class="join-item btn btn-sm {selectedLocation === 'premium' ? 'btn-primary' : 'btn-outline'}"
        onclick={() => selectedLocation = 'premium'}
      >
        Hotel / Plus
      </button>
    </div>
  </div>

  <!-- Urgency Selection -->
  <div>
    <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">3. Nivel de Urgencia</div>
    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        class="btn btn-sm text-xs {selectedUrgency === 'normal' ? 'btn-neutral' : 'btn-ghost border border-base-300'}"
        onclick={() => selectedUrgency = 'normal'}
      >
        Normal (1.0x)
      </button>
      <button
        type="button"
        class="btn btn-sm text-xs {selectedUrgency === 'mismo_dia' ? 'btn-info' : 'btn-ghost border border-base-300'}"
        onclick={() => selectedUrgency = 'mismo_dia'}
      >
        Mismo Día (1.3x)
      </button>
      <button
        type="button"
        class="btn btn-sm text-xs {selectedUrgency === 'emergencia_24_7' ? 'btn-error' : 'btn-ghost border border-base-300'}"
        onclick={() => selectedUrgency = 'emergencia_24_7'}
      >
        24/7 (1.8x)
      </button>
    </div>
  </div>

  <!-- Pricing Preview -->
  <PriceBreakdown breakdown={currentPricing} />

  <!-- Action CTA Button -->
  <button
    type="button"
    class="btn btn-primary btn-block text-base font-bold shadow-lg shadow-primary/20 rounded-2xl min-h-[56px]"
    onclick={handleBook}
  >
    Pedir Servicio con Garantía
  </button>
</div>
