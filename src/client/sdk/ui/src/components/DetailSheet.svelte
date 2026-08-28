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
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity flex justify-end"
    onclick={onClose}
  >
    <!-- Slide-over Drawer -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-base-100 border-l border-base-300 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
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
  </div>
{/if}
