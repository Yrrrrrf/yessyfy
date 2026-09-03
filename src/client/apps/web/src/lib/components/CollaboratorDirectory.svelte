<script lang="ts">
import { TechProfileCard, TRADE_META_REGISTRY } from '@sdk/ui';
import type { ServiceCategory, TechnicianRecord } from '@sdk/core';

interface ProsWithMeta extends TechnicianRecord {
  distanceKm: number;
  etaMin: number;
  priceFromCents: number;
}

interface Props {
  pros: ProsWithMeta[];
  filterTrade?: ServiceCategory | 'todos';
  onQuoteWithPro: (pro: ProsWithMeta) => void;
}

let {
  pros,
  filterTrade = $bindable('todos'),
  onQuoteWithPro,
}: Props = $props();

let searchQuery = $state('');

const filteredPros = $derived(
  pros.filter((p) => {
    const matchesTrade = filterTrade === 'todos' || p.trades.includes(filterTrade as ServiceCategory);
    const matchesQuery = !searchQuery || (p.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesTrade && matchesQuery;
  })
);
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <div>
    <h2 class="text-xl font-black text-base-content tracking-tight">Directorio de Profesionales</h2>
    <p class="text-xs text-base-content/70 mt-0.5">Técnicos certificados con verificación de identidad y antecedentes.</p>
  </div>

  <!-- Search Bar -->
  <div class="relative">
    <input
      type="text"
      placeholder="Buscar por nombre o especialidad..."
      bind:value={searchQuery}
      class="input input-sm w-full rounded-2xl pl-9 text-xs"
    />
    <span class="absolute left-3 top-2 text-xs opacity-60">🔍</span>
  </div>

  <!-- Trade Filter Pills -->
  <div class="flex gap-1.5 overflow-x-auto pb-1">
    <button
      type="button"
      class="btn btn-xs rounded-full font-bold {filterTrade === 'todos' ? 'btn-primary text-white' : 'btn-ghost border border-base-300'}"
      onclick={() => filterTrade = 'todos'}
    >
      Todos
    </button>
    {#each Object.values(TRADE_META_REGISTRY) as trade}
      <button
        type="button"
        class="btn btn-xs rounded-full font-bold whitespace-nowrap {filterTrade === trade.id ? 'btn-primary text-white' : 'btn-ghost border border-base-300'}"
        onclick={() => filterTrade = trade.id}
      >
        {trade.emoji} {trade.name}
      </button>
    {/each}
  </div>

  <!-- Pros List -->
  <div class="space-y-3">
    {#each filteredPros as pro}
      <div class="card bg-base-100 border border-base-300 rounded-3xl p-4 shadow-sm space-y-3 hover:border-primary/50 transition-colors">
        <TechProfileCard technician={pro} />
        <div class="flex items-center justify-between pt-2 border-t border-base-300 text-xs">
          <div class="flex items-center gap-2 font-mono text-base-content/70">
            <span>📍 ~{pro.distanceKm} km</span>
            <span>•</span>
            <span>⏱️ {pro.etaMin} min</span>
          </div>
          <button
            type="button"
            class="btn btn-primary btn-xs font-bold rounded-xl px-3"
            onclick={() => onQuoteWithPro(pro)}
          >
            Cotizar con {pro.user?.fullName?.split(' ')[0]} →
          </button>
        </div>
      </div>
    {/each}

    {#if filteredPros.length === 0}
      <div class="text-center py-10 space-y-2">
        <span class="text-4xl">🔎</span>
        <p class="text-sm font-bold text-base-content">No se encontraron profesionales</p>
        <p class="text-xs text-base-content/60">Intenta con otra búsqueda o categoría</p>
      </div>
    {/if}
  </div>
</div>
