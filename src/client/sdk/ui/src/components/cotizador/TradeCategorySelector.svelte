<script lang="ts">
import type { ServiceCategory } from '@sdk/core';
import { TRADE_META_REGISTRY } from '../../types.ts';

interface Props {
  selectedCategory: ServiceCategory;
  onSelect: (cat: ServiceCategory) => void;
}

let { selectedCategory, onSelect }: Props = $props();
</script>

<div>
  <div class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">1. Selecciona el Oficio</div>
  <div class="grid grid-cols-3 gap-2">
    {#each Object.values(TRADE_META_REGISTRY) as trade}
      <button
        type="button"
        class="flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center {selectedCategory === trade.id ? 'border-primary bg-primary/10 font-bold shadow-sm' : 'border-base-300 hover:bg-base-200/60'}"
        onclick={() => onSelect(trade.id)}
      >
        <span class="text-2xl mb-1">{trade.emoji}</span>
        <span class="text-xs leading-tight">{trade.name}</span>
      </button>
    {/each}
  </div>
</div>



