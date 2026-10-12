<script lang="ts">
interface Props {
  rating: number;
  onRatingChange: (r: number) => void;
}

let { rating, onRatingChange }: Props = $props();

const label = $derived(
  rating === 5 ? '¡Excelente servicio!' : rating === 4 ? 'Muy buen servicio' : rating === 3 ? 'Aceptable' : 'Deficiente'
);
</script>

<div class="card bg-base-200 p-4 rounded-2xl text-center space-y-2">
  <span class="text-xs font-bold uppercase text-base-content/70">¿Cómo calificarías el servicio?</span>
  <div class="flex justify-center gap-2 text-3xl">
    {#each [1, 2, 3, 4, 5] as star}
      <button
        type="button"
        class="cursor-pointer transition-transform hover:scale-125 {star <= rating ? 'text-warning' : 'text-base-content/20'}"
        onclick={() => onRatingChange(star)}
      >
        ★
      </button>
    {/each}
  </div>
  <span class="text-xs font-bold text-primary font-mono">{label}</span>
</div>



