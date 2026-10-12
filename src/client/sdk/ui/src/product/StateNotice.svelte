<script lang="ts">
  import { getRuntime } from "./context.ts";
  import { translate } from "./i18n.ts";
  let { channel }: { channel: string } = $props();
  const r = getRuntime();
  const t = (k: Parameters<typeof translate>[1]) => translate(r.locale, k);
  let error = $state("");
</script>

{#if r.commandStates[channel] === "uncertain"}<section
    class="notice warning"
    role="status"
  >
    <p>{t("uncertain")}</p>
    <button
      class="button secondary"
      onclick={async () => {
        try {
          error = "";
          await r.recover(channel);
        } catch (e) {
          error = e instanceof Error ? e.message : "";
        }
      }}>{t("recover")}</button
    >{#if error}<p role="alert">{error}</p>{/if}
  </section>
{:else if r.commandStates[channel] === "conflict"}<div
    class="notice warning"
    role="alert"
  >
    {t("conflict")}
  </div>
{:else if r.commandErrors[channel]}<div class="notice danger" role="alert">
    {r.commandErrors[channel]}
  </div>{/if}
