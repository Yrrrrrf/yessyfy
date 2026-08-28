<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children?: Snippet;
}

let { open = false, title, onClose, children }: Props = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 flex items-end justify-center"
    onclick={onClose}
  >
    <!-- Sheet Content -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-base-100 border-t border-base-300 w-full max-w-lg rounded-t-[2.5rem] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
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
  </div>
{/if}
