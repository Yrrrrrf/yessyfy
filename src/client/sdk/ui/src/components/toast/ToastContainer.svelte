<script lang="ts">
import { toastStore } from '@sdk/state';
import ToastItem from './ToastItem.svelte';

export type ToastPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

interface Props {
  position?: ToastPosition;
  class?: string;
}

let { position = 'top-end', class: customClass = '' }: Props = $props();

const positionClass = $derived.by(() => {
  switch (position) {
    case 'top-start':
      return 'toast-top toast-start';
    case 'top-center':
      return 'toast-top toast-center';
    case 'bottom-start':
      return 'toast-bottom toast-start';
    case 'bottom-center':
      return 'toast-bottom toast-center';
    case 'bottom-end':
      return 'toast-bottom toast-end';
    default:
      return 'toast-top toast-end';
  }
});
</script>

{#if toastStore.toasts.length > 0}
  <div
    class="toast {positionClass} z-50 pointer-events-none p-3 sm:p-4 max-w-full sm:max-w-md w-full gap-2.5 {customClass}"
    role="region"
    aria-live="polite"
    aria-label="Centro Global de Notificaciones"
  >
    {#each toastStore.toasts as toast (toast.id)}
      <ToastItem {toast} />
    {/each}
  </div>
{/if}



