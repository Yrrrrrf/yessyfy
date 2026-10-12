<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate } from "./i18n.ts";
  let {
    open = $bindable(false),
    title,
    children,
  }: { open?: boolean; title: string; children: Snippet } = $props();
  let el: HTMLDialogElement;
  let returnFocus: HTMLElement | null = null;
  const r = getRuntime();
  $effect(() => {
    if (!el) return;
    if (open && !el.open) {
      returnFocus = document.activeElement as HTMLElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      returnFocus?.focus();
    }
  });
  onDestroy(() => {
    if (el?.open) el.close();
    returnFocus?.focus();
  });
</script>

<dialog
  bind:this={el}
  class="yf-dialog"
  oncancel={() => {
    open = false;
  }}
  onclose={() => {
    open = false;
    returnFocus?.focus();
  }}
>
  <div class="dialog-head">
    <h2>{title}</h2>
    <button
      class="icon-button"
      aria-label={translate(r.locale, "close")}
      onclick={() => {
        open = false;
      }}>✕</button
    >
  </div>
  {@render children()}
</dialog>
