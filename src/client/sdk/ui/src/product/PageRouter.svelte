<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { getRuntime } from "./context.ts";
  import { translate } from "./i18n.ts";
  import DiscoveryView from "./DiscoveryView.svelte";
  import BookingView from "./BookingView.svelte";
  import AuthView from "./AuthView.svelte";
  import QueueView from "./QueueView.svelte";
  import OrderView from "./OrderView.svelte";
  import RadarView from "./RadarView.svelte";
  import RecordsView from "./RecordsView.svelte";
  import AccountView from "./AccountView.svelte";
  import TemplatesView from "./TemplatesView.svelte";
  let { surface }: { surface: "main" | "vision" } = $props();
  const r = getRuntime();
  const parts = $derived(page.url.pathname.split("/").filter(Boolean));
  const path = $derived(page.url.pathname);
  $effect(() => {
    if (surface === "vision" && path === "/" && r.ready && r.user)
      void goto(r.canOps ? "/ops" : "/radar", { replaceState: true });
  });
</script>

<svelte:head
  ><title
    >{surface === "main"
      ? "Yessyfy · Servicios para tu hogar"
      : "Yessyfy Vision · Trabajo y operaciones"}</title
  ><meta
    name="description"
    content="Solicita y sigue servicios profesionales para tu hogar con Yessyfy."
  /></svelte:head
>
{#if path === "/login"}<AuthView {surface} />
{:else if path === "/privacy" || path === "/terms"}<main class="page narrow">
    <section class="panel">
      <h1>{translate(r.locale, path === "/privacy" ? "privacy" : "terms")}</h1>
      <p>{translate(r.locale, "policyMissing")}</p>
    </section>
  </main>
{:else if path === "/account" || path === "/onboarding"}<AccountView
    view={path === "/onboarding" ? "onboarding" : "account"}
  />
{:else if path === "/inbox"}<RecordsView view="inbox" />
{:else if surface === "main"}
  {#if path === "/"}<DiscoveryView
      view="home"
    />{:else if parts[0] === "services"}<DiscoveryView
      view={parts[1] ? "service" : "services"}
      id={parts[1]}
    />{:else if parts[0] === "collaborators"}<DiscoveryView
      view={parts[1] ? "collaborator" : "collaborators"}
      id={parts[1]}
    />{:else if path === "/book"}<BookingView
    />{:else if parts[0] === "orders" && parts[1]}<OrderView
      id={parts[1]}
      role="customer"
      subview={parts[2] ?? ""}
      proposalId={parts[3]}
    />{:else if path === "/orders"}<QueueView
      role="customer"
    />{:else if parts[0] === "warranties"}<RecordsView
      view={parts[1] ? "warranty" : "warranties"}
      id={parts[1]}
    />{/if}
{:else}
  {#if path === "/radar"}<RadarView
    />{:else if parts[0] === "jobs" && parts[1]}<OrderView
      id={parts[1]}
      role="field"
      subview={parts[2] ?? ""}
    />{:else if path === "/jobs"}<QueueView
      role="field"
    />{:else if path === "/wallet"}<RecordsView
      view="wallet"
    />{:else if parts[0] === "ops"}{#if parts[1] === "orders" && parts[2]}<OrderView
        id={parts[2]}
        role="ops"
      />{:else if parts[1] === "cases"}<RecordsView
        view={parts[2] ? "case" : "cases"}
        id={parts[2]}
      />{:else if parts[1] === "collaborators"}<AccountView
        view="team"
      />{:else if parts[1] === "templates"}<TemplatesView />{:else}<QueueView
        role="ops"
        view={parts[1] === "qa"
          ? "qa"
          : parts[1] === "finance"
            ? "finance"
            : parts[1] === "dispatch"
              ? "dispatch"
              : parts[1] === "orders"
                ? "orders"
                : "overview"}
      />{/if}{:else if path === "/"}<p role="status">
      {translate(r.locale, "loading")}
    </p>{/if}
{/if}
