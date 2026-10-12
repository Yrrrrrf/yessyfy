<script lang="ts">
  import ServiceIcon from "./ServiceIcon.svelte";
  import MapView from "./MapView.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import { money, type Status } from "../../../core/src/product/contracts.ts";
  let {
    role,
    view = "orders",
  }: {
    role: "customer" | "field" | "ops";
    view?: "orders" | "overview" | "dispatch" | "qa" | "finance";
  } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let loading = $state(false),
    error = $state(""),
    text = $state(""),
    status = $state(""),
    category = $state(""),
    mode = $state<"list" | "board">("list");
  let loaded = $state(false);
  const statuses: Status[] = [
    "pending_triage",
    "dispatched",
    "accepted",
    "in_transit",
    "in_progress",
    "pending_quote_approval",
    "pending_validation",
    "validated",
    "completed",
    "disputed",
    "cancelled",
  ];
  const base = $derived(
    role === "customer"
      ? "/orders"
      : role === "field"
        ? "/jobs"
        : "/ops/orders",
  );
  $effect(() => {
    const query = page.url.search,
      ready = r.ready,
      user = r.user?.id,
      tick = r.revisionTick,
      v = view;
    untrack(() => {
      if (!ready || !user) return;
      const p = new URLSearchParams(query);
      text = p.get("text") ?? "";
      category = p.get("category") ?? "";
      status =
        p.get("status") ??
        (v === "qa"
          ? "pending_validation"
          : v === "finance"
            ? "validated"
            : "");
      loading = true;
      error = "";
      void r
        .loadOrders({
          view:
            role === "ops" ? "ops" : role === "field" ? "field" : "customer",
          text,
          status,
          category,
          page: Number(p.get("page") ?? 1),
        })
        .catch((e) => {
          error = e.message;
        })
        .finally(() => {
          loading = false;
          loaded = true;
        });
    });
  });
  function filters(paging?: number) {
    const q = new URLSearchParams();
    if (text) q.set("text", text);
    if (status) q.set("status", status);
    if (category) q.set("category", category);
    if (paging) q.set("page", String(paging));
    void goto(`${page.url.pathname}?${q}`, { reset: false });
  }
  const title = $derived(
    view === "overview"
      ? "overview"
      : view === "qa"
        ? "qa"
        : view === "finance"
          ? "finance"
          : view === "dispatch"
            ? "dispatch"
            : role === "field"
              ? "jobs"
              : "orders",
  );
</script>

<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow"
        >{role === "customer" ? "MAIN" : "VISION"} / {t(
          role === "ops" ? "ops" : role === "field" ? "field" : "orders",
        )}</span
      >
      <h1>{t(title)}</h1>
      <p class="muted">{t("timeline")} · {r.rows.total} {t("orders")}</p>
    </div>
    {#if role === "customer"}<a class="button" href="/book">＋ {t("book")}</a
      >{:else}<button class="button secondary" onclick={() => filters()}
        >{t("refresh")}</button
      >{/if}
  </header>
  {#if view === "overview"}<div class="stats-grid">
      {#each [{ label: "pending_triage", value: r.rows.items.filter((o) => o.status === "pending_triage").length }, { label: "pending_quote_approval", value: r.rows.items.filter((o) => o.status === "pending_quote_approval").length }, { label: "pending_validation", value: r.rows.items.filter((o) => o.status === "pending_validation").length }, { label: "disputed", value: r.rows.items.filter((o) => o.status === "disputed").length }] as stat}<a
          class="stat panel"
          href={`/ops/orders?status=${stat.label}`}
          ><span class="muted">{t(stat.label as Text)}</span><strong
            >{loading ? "—" : stat.value}</strong
          ><small>{t("details")} →</small></a
        >{/each}
    </div>
    <p class="muted small">
      {r.locale === "es"
        ? "Resumen de la página cargada; abre cada cola para ver su total."
        : "Summary of the loaded page; open a queue for its total."}
    </p>{/if}
  <form
    class="filterbar"
    onsubmit={(e) => {
      e.preventDefault();
      filters();
    }}
  >
    <input
      aria-label={t("search")}
      bind:value={text}
      placeholder={t("search")}
    /><select
      aria-label="Status filter"
      bind:value={status}
      onchange={() => filters()}
      ><option value="">{t("all")}</option>{#each statuses as s}<option
          value={s}>{t(s)}</option
        >{/each}</select
    ><select
      aria-label={t("services")}
      bind:value={category}
      onchange={() => filters()}
      ><option value="">{t("all")}</option>{#each r.services as s}<option
          value={s.category}>{s.name}</option
        >{/each}</select
    ><button class="button secondary">{t("search")}</button
    >{#if role === "ops"}<div class="segmented">
        <button
          type="button"
          class:active={mode === "list"}
          onclick={() => (mode = "list")}>≡</button
        ><button
          type="button"
          class:active={mode === "board"}
          onclick={() => (mode = "board")}>▥</button
        >
      </div>{/if}
  </form>
  {#if error}<p role="alert" class="notice danger">
      {error}<button class="text-button" onclick={() => filters()}
        >{t("retry")}</button
      >
    </p>{/if}{#if loading && !loaded}<div class="skeleton">
      {t("loading")}
    </div>{:else if mode === "board" && r.rows.items.length}<div
      class="board"
      aria-label={t("orders")}
    >
      {#each statuses.filter( (s) => r.rows.items.some((o) => o.status === s) ) as s}<section
          class="board-column"
        >
          <h2>{t(s)}</h2>
          {#each r.rows.items.filter((o) => o.status === s) as o}<a
              class="panel board-card"
              href={`${base}/${o.id}`}
              ><strong>{o.code}</strong>
              <p>{o.booking.description}</p>
              <small>{o.customer_name}</small><span>{t("details")} →</span></a
            >{/each}
        </section>{/each}
    </div>{:else}{#if view === "dispatch"}<MapView orders={r.rows.items} />{/if}
    <div class="order-grid">
      {#each r.rows.items as o}<article class="panel order-card">
          <div class="record-heading">
            <span class="order-icon"
              ><ServiceIcon category={o.booking.category} /></span
            ><span class="badge" class:success={o.status === "completed"}
              >{t(o.status)}</span
            >
          </div>
          <span class="eyebrow">{o.code}</span>
          <h2>{o.booking.description}</h2>
          <p class="muted">{o.booking.address.city} · {o.booking.date}</p>
          <p>{o.collaborator_name ?? t("pending_triage")}</p>
          <div class="record-footer">
            <strong>{money(o.quote.total_cents, r.locale)}</strong><a
              class="button secondary compact"
              href={`${base}/${o.id}${view === "qa" ? "?tab=evidence" : view === "finance" ? "?tab=finance" : ""}`}
              >{t("details")} →</a
            >
          </div>
        </article>{:else}<section class="panel empty">
          <div class="empty-symbol">▤</div>
          <h2>{t("empty")}</h2>
          {#if role === "customer"}<a class="button" href="/book">{t("book")}</a
            >{/if}
        </section>{/each}
    </div>{/if}
  {#if r.rows.total > r.rows.limit}<nav
      class="pagination"
      aria-label={t("page")}
    >
      <button
        class="button secondary"
        disabled={r.rows.page <= 1}
        onclick={() => filters(r.rows.page - 1)}>{t("previousPage")}</button
      ><span>{t("page")} {r.rows.page}</span><button
        class="button secondary"
        disabled={!r.rows.has_more}
        onclick={() => filters(r.rows.page + 1)}>{t("nextPage")}</button
      >
    </nav>{/if}
</main>
