<script lang="ts">
interface Props {
  previewUrl: string;
  onClear: () => void;
}

let { previewUrl, onClear }: Props = $props();
</script>

<div class="relative rounded-2xl overflow-hidden border border-base-300 shadow-inner group">
  <img src={previewUrl} alt="Evidencia QA con marca de agua" class="w-full h-48 object-cover" />
  <button
    type="button"
    class="btn btn-sm btn-circle btn-neutral absolute top-2 right-2 opacity-80 hover:opacity-100"
    onclick={onClear}
  >
    ✕
  </button>
</div>
