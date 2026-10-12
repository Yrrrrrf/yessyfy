<script lang="ts">
  import { untrack } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import {
    money,
    type Case,
    type Warranty,
  } from "../../../core/src/product/contracts.ts";
  import StateNotice from "./StateNotice.svelte";
  let {
    view,
    id,
  }: {
    view: "inbox" | "wallet" | "cases" | "case" | "warranties" | "warranty";
    id?: string;
  } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let error = $state(""),
    loading = $state(false),
    unread = $state(false),
    description = $state(""),
    resolution = $state(""),
    selectedCase = $state<Case | null>(null),
    selectedWarranty = $state<Warranty | null>(null);
  async function load() {
    loading = true;
    error = "";
    try {
      if (view === "inbox") await r.refreshInbox();
      if (view === "wallet") await r.loadPayouts();
      if (view === "cases") await r.loadCases();
      if (view === "case" && id)
        selectedCase = await r.client.call("case", { id });
      if (view === "warranties") await r.loadWarranties();
      if (view === "warranty" && id)
        selectedWarranty = await r.client.call("warranty", { id });
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    const ready = r.ready,
      user = r.user?.id,
      v = view,
      resource = id;
    untrack(() => {
      if (ready && user) void load();
    });
  });
  async function resolve() {
    if (!selectedCase) return;
    try {
      selectedCase = await r.command(
        `case:${selectedCase.id}`,
        "resolveCase",
        { id: selectedCase.id, resolved: true, resolution },
        selectedCase.revision,
      );
      resolution = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function claim() {
    if (!selectedWarranty) return;
    try {
      const c = await r.command(`claim:${selectedWarranty.id}`, "createCase", {
        order_id: selectedWarranty.order_id,
        category: "warranty",
        description,
        claim: true,
      });
      description = "";
      error = `${t("caseRegistered")}: ${c.id}`;
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
</script>

<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow">YESSYFY</span>
      <h1>
        {t(
          view === "wallet"
            ? "wallet"
            : view === "inbox"
              ? "inbox"
              : view === "case"
                ? "cases"
                : view === "warranty"
                  ? "warranty"
                  : view,
        )}
      </h1>
    </div>
    <button class="button secondary" onclick={() => void load()}
      >{t("refresh")}</button
    >
  </header>
  {#if error}<p class="notice warning" role="alert">
      {error}
    </p>{/if}{#if loading}<p role="status">{t("loading")}</p>{/if}
  {#if view === "inbox"}<div class="filterbar">
      <label class="check"
        ><input type="checkbox" bind:checked={unread} />{t("unread")} ({r.unread})</label
      ><button
        class="button secondary"
        onclick={() =>
          void r
            .command("inbox", "markRead", {
              ids: r.notices.filter((n) => !n.read).map((n) => n.id),
            })
            .then(() => r.refreshInbox())
            .catch((e) => {
              error = e.message;
            })}>{t("markRead")}</button
      >
    </div>
    <StateNotice
      channel="inbox"
    />{#each r.notices.filter((n) => !unread || !n.read) as n}<article
        class="panel notice-card"
        class:unread={!n.read}
      >
        <div class="notice-icon">◉</div>
        <div>
          <span class="eyebrow"
            >{new Date(n.at).toLocaleDateString(r.locale)}</span
          >
          <h2>{n.title}</h2>
          <p>{n.body}</p>
          <a
            class="button secondary compact"
            href={n.surface === "main"
              ? new URL(
                  n.href,
                  (import.meta as ImportMeta & { env: Record<string, string> })
                    .env.VITE_YESSYFY_MAIN_ORIGIN ?? "http://localhost:5173",
                ).href
              : new URL(
                  n.href,
                  (import.meta as ImportMeta & { env: Record<string, string> })
                    .env.VITE_YESSYFY_VISION_ORIGIN ?? "http://localhost:5174",
                ).href}>{t("details")} →</a
          >
        </div>
        {#if !n.read}<button
            class="icon-button"
            aria-label={t("markRead")}
            onclick={() =>
              void r
                .command("inbox", "markRead", { ids: [n.id] })
                .then(() => r.refreshInbox())}>✓</button
          >{/if}
      </article>{:else}<section class="panel empty">
        <h2>{t("allCaughtUp")}</h2>
      </section>{/each}
  {:else if view === "wallet"}<p class="notice">{t("financialNote")}</p>
    <div class="stats-grid">
      {#each ["pending", "confirmed", "failed"] as status}<section
          class="panel stat"
        >
          <span>{t(status as Text)}</span><strong
            >{money(
              r.payouts
                .filter((p) => p.status === status)
                .reduce((a, p) => a + p.net_cents, 0),
              r.locale,
            )}</strong
          >
        </section>{/each}
    </div>
    {#each r.payouts as p}<article class="panel record-row">
        <div>
          <span class="eyebrow">{p.code}</span>
          <h2>{money(p.net_cents, r.locale)}</h2>
          <small>{new Date(p.at).toLocaleString(r.locale)}</small>
        </div>
        <span class="badge">{t(p.status)}</span>
        <dl class="definition">
          <dt>{t("fee")}</dt>
          <dd>{money(p.fee_cents, r.locale)}</dd>
          <dt>{t("withholding")}</dt>
          <dd>{money(p.withholding_cents, r.locale)}</dd>
          <dt>{t("receipt")}</dt>
          <dd>{p.receipt ?? "—"}</dd>
        </dl>
      </article>{:else}<section class="panel empty">
        {t("empty")}
      </section>{/each}
  {:else if view === "cases"}<div class="order-grid">
      {#each r.cases as c}<a class="panel" href={`/ops/cases/${c.id}`}
          ><span class="badge">{t(c.status)}</span>
          <h2>{c.description}</h2>
          <small>{c.id.slice(0, 8)}</small>
          <p>{t("details")} →</p></a
        >{:else}<section class="panel empty">{t("empty")}</section>{/each}
    </div>
  {:else if view === "case" && selectedCase}<section class="panel">
      <span class="badge">{t(selectedCase.status)}</span>
      <h2>{selectedCase.description}</h2>
      <a class="button secondary" href={`/ops/orders/${selectedCase.order_id}`}
        >{t("inspect")}</a
      >
      <ol class="timeline">
        {#each selectedCase.timeline as entry}<li>
            <div>
              <strong>{entry.text}</strong><time
                >{new Date(entry.at).toLocaleString(r.locale)}</time
              >
            </div>
          </li>{/each}
      </ol>
      <StateNotice channel={`case:${selectedCase.id}`} />
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void resolve();
        }}
      >
        <label
          >{t("resolution")}<textarea required bind:value={resolution}
          ></textarea></label
        ><button class="button" disabled={selectedCase.status === "resolved"}
          >{t("resolve")}</button
        >
      </form>
    </section>
  {:else if view === "warranties"}<div class="order-grid">
      {#each r.warranties as w}<a
          class="panel warranty-card"
          href={`/warranties/${w.id}`}
          ><span class="warranty-symbol">✓</span><span class="eyebrow"
            >{w.code}</span
          >
          <h2>{t("warranty")}</h2>
          <span class="badge">{t(w.status)}</span>
          <p>
            {t("validity")}: {new Date(w.ends_at).toLocaleDateString(r.locale)}
          </p></a
        >{:else}<section class="panel empty">{t("empty")}</section>{/each}
    </div>
  {:else if view === "warranty" && selectedWarranty}<section class="panel">
      <span class="eyebrow">{selectedWarranty.code}</span>
      <h2>{t("warranty")}</h2>
      <p>{selectedWarranty.terms}</p>
      <p>
        {new Date(selectedWarranty.starts_at).toLocaleDateString(r.locale)} → {new Date(
          selectedWarranty.ends_at,
        ).toLocaleDateString(r.locale)}
      </p>
      <a
        class="button secondary"
        href={`/orders/${selectedWarranty.order_id}?tab=documents`}
        >{t("documents")}</a
      ><StateNotice channel={`claim:${selectedWarranty.id}`} />
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void claim();
        }}
      >
        <label
          >{t("caseDescription")}<textarea
            required
            minlength="10"
            bind:value={description}></textarea></label
        ><button class="button" disabled={selectedWarranty.status !== "active"}
          >{t("claim")}</button
        >
      </form>
    </section>{/if}
</main>
