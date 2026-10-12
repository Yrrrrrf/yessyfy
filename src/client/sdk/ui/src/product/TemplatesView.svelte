<script lang="ts">
  import { untrack } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import { goto } from "$app/navigation";
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let order = $state(""),
    draft = $state("");
  const templates = [
    [
      "arrival",
      "Confirma las instrucciones de acceso para el colaborador.",
      "Confirm access instructions for the professional.",
    ],
    [
      "scope",
      "Revisa el alcance indicado en la cotización.",
      "Review the scope in your quotation.",
    ],
    [
      "evidence",
      "Consulta la evidencia adjunta en tu orden.",
      "Review the attached evidence in your order.",
    ],
    [
      "approval",
      "Revisa la propuesta adicional antes de decidir.",
      "Review the extra-work proposal before deciding.",
    ],
    [
      "review",
      "Revisa el resultado y registra tu aceptación o una incidencia.",
      "Review the outcome and record acceptance or an issue.",
    ],
    [
      "support",
      "Comparte los detalles del problema desde la orden.",
      "Share the issue details from your order.",
    ],
    [
      "schedule",
      "Confirma si el horario indicado sigue siendo adecuado.",
      "Confirm that the requested time window still works.",
    ],
    [
      "materials",
      "Revisa los materiales incluidos antes de aprobar cambios.",
      "Review included materials before approving changes.",
    ],
    [
      "delay",
      "Consulta la última actualización de la visita en tu orden.",
      "Check the latest visit update in your order.",
    ],
    [
      "verification",
      "Revisa los comentarios de verificación en tu perfil.",
      "Review the verification feedback in your profile.",
    ],
    [
      "qa",
      "La orden muestra el estado actualizado de calidad.",
      "The order shows the current quality status.",
    ],
    [
      "payment",
      "Consulta el estado informado del pago en la orden.",
      "Check the reported payment status in your order.",
    ],
    [
      "documents",
      "Consulta el estado del documento solicitado.",
      "Check the status of your requested document.",
    ],
    [
      "warranty",
      "Revisa la vigencia y el alcance de tu garantía.",
      "Review your warranty validity and scope.",
    ],
  ];
  $effect(() => {
    const ready = r.ready,
      user = r.user?.id;
    untrack(() => {
      if (ready && user) void r.loadOrders({ view: "ops" }).catch(() => {});
    });
  });
</script>

<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow">VISION / {t("ops")}</span>
      <h1>{t("templates")}</h1>
      <p class="muted">
        {r.locale === "es"
          ? "Selecciona un texto y revísalo antes de enviarlo en la conversación."
          : "Select a draft and review it before sending in the conversation."}
      </p>
    </div>
  </header>
  <div class="two-grid">
    <section class="panel">
      <label
        >{t("orders")}<select bind:value={order}
          ><option value="">{t("choose")}</option
          >{#each r.rows.items as o}<option value={o.id}>{o.code}</option
            >{/each}</select
        ></label
      >{#each templates as [name, es, en]}{@const text =
          r.locale === "es" ? es : en}<button
          class="template-row"
          onclick={() => (draft = text)}
          ><strong>{name}</strong><span>{text}</span></button
        >{/each}
    </section>
    <section class="panel">
      <label>{t("chat")}<textarea rows="8" bind:value={draft}></textarea></label
      ><button
        class="button"
        disabled={!order || !draft.trim()}
        onclick={() =>
          void goto(
            `/ops/orders/${order}?tab=chat&draft=${encodeURIComponent(draft)}`,
          )}>{t("copy")}</button
      >
    </section>
  </div>
</main>
