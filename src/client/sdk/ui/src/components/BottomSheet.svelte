<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children?: Snippet;
}

let { open = false, title, onClose, children }: Props = $props();

let dialogEl = $state<HTMLDialogElement | null>(null);

$effect(() => {
  if (open) {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
    }
  } else {
    if (dialogEl?.open) {
      dialogEl.close();
    }
  }
});

function handleCancel(e: Event) {
  e.preventDefault();
  onClose?.();
}
</script>

<dialog
  bind:this={dialogEl}
  class="modal modal-bottom"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose?.();
  }}
>
  <div
    class="modal-box bg-base-100 border-t border-base-300 w-full max-w-lg rounded-t-[2.5rem] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
  >
    <!-- Drag Handle Pill -->
    <div class="w-12 h-1.5 bg-base-300 rounded-full mx-auto mb-2"></div>

    {#if title}
      <div class="flex items-center justify-between pb-2 border-b border-base-300">
        <h3 class="font-extrabold text-lg text-base-content">{title}</h3>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost"
          onclick={onClose}
        >
          ✕
        </button>
      </div>
    {/if}

    <div>
      {@render children?.()}
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>
