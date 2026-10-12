<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  children?: Snippet;
  actions?: Snippet;
}

let { open = false, title, subtitle, onClose, children, actions }: Props = $props();

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
  class="modal modal-end"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose?.();
  }}
>
  <div
    class="modal-box bg-base-100 border-l border-base-300 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
  >
    <div>
      <div class="flex items-start justify-between pb-4 border-b border-base-300">
        <div>
          {#if title}
            <h3 class="font-extrabold text-xl text-base-content">{title}</h3>
          {/if}
          {#if subtitle}
            <p class="font-mono text-xs text-base-content/60 mt-0.5">{subtitle}</p>
          {/if}
        </div>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost"
          onclick={onClose}
        >
          ✕
        </button>
      </div>

      <div class="py-6 space-y-4">
        {@render children?.()}
      </div>
    </div>

    {#if actions}
      <div class="pt-4 border-t border-base-300">
        {@render actions()}
      </div>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>



