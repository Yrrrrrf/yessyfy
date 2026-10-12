<script lang="ts">
interface Props {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

let { selectedTags, onToggleTag }: Props = $props();

const AVAILABLE_TAGS = [
  'Limpieza Impecable',
  'Puntualidad Excelente',
  'Refacciones Originales',
  'Trato Respetuoso',
  'Explicación Técnica Clara',
  'Cuidado del Inmueble',
];
</script>

<div class="space-y-2">
  <span class="text-xs font-bold uppercase text-base-content/70 block">Aspectos Destacados:</span>
  <div class="flex flex-wrap gap-1.5">
    {#each AVAILABLE_TAGS as tag}
      <button
        type="button"
        class="btn btn-xs rounded-full text-[11px] {selectedTags.includes(tag) ? 'btn-primary' : 'btn-ghost border border-base-300'}"
        onclick={() => onToggleTag(tag)}
      >
        {tag}
      </button>
    {/each}
  </div>
</div>



