<script lang="ts">
  import { untrack, onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import {
    money,
    integerInput,
    type Action,
    type Collaborator,
    type Order,
  } from "../../../core/src/product/contracts.ts";
  import EvidenceView from "./EvidenceView.svelte";
  import StateNotice from "./StateNotice.svelte";
  import Dialog from "./Dialog.svelte";
  let {
    id,
    role,
    subview = "",
    proposalId,
  }: {
    id: string;
    role: "customer" | "field" | "ops";
    subview?: string;
    proposalId?: string;
  } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let loading = $state(true),
    error = $state(""),
    tab = $state("timeline"),
    text = $state(""),
    reason = $state(""),
    qaReason = $state(""),
    labor = $state(""),
    parts = $state(""),
    rating = $state(5),
    reviewText = $state(""),
    candidates = $state<Collaborator[]>([]),
    candidate = $state(""),
    cancelOpen = $state(false),
    cancelFee = $state(0),
    cancelReason = $state("customer_request"),
    cancelRevision = $state(0),
    caseCategory = $state("quality"),
    caseText = $state("");
  let clock = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (clock = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  $effect(() => {
    const actor = r.user?.id,
      resource = id;
    untrack(() => {
      const draft = r.readDraft<{
        text: string;
        reason: string;
        labor: string;
        parts: string;
        reviewText: string;
        caseText: string;
      }>(`order:${resource}`);
      text = draft?.text ?? "";
      reason = draft?.reason ?? "";
      labor = draft?.labor ?? "";
      parts = draft?.parts ?? "";
      reviewText = draft?.reviewText ?? "";
      caseText = draft?.caseText ?? "";
    });
  });
  $effect(() => {
    const actor = r.user?.id,
      resource = id,
      draft = { text, reason, labor, parts, reviewText, caseText };
    untrack(() => r.saveDraft(`order:${resource}`, draft));
  });
  const order = $derived(r.orders[id]);
  const channel = $derived(`order:${id}`);
  const busy = $derived(
    r.commandStates[channel] === "pending" ||
      r.commandStates[channel] === "uncertain",
  );
  $effect(() => {
    const resource = id,
      ready = r.ready,
      user = r.user?.id;
    untrack(() => {
      if (!ready || !user) return;
      loading = true;
      error = "";
      void r
        .loadOrder(resource)
        .catch((e) => {
          error = e.message;
        })
        .finally(() => (loading = false));
      void r.loadConversation(resource).catch(() => {});
      void r.loadDocuments(resource).catch(() => {});
    });
  });
  $effect(() => {
    const v = subview,
      query = page.url.searchParams.get("tab");
    untrack(() => {
      tab =
        v === "review"
          ? "review"
          : v === "help"
            ? "help"
            : v === "proposal"
              ? "proposal"
              : v === "approvals"
                ? "approvals"
                : (query ?? "timeline");
      const draft = page.url.searchParams.get("draft");
      if (draft && !text) text = draft;
    });
  });
  async function action(
    op: "progress" | "decideQuote" | "review" | "qa" | "reconcileFinance",
    payload: Record<string, unknown>,
  ) {
    if (!order) return;
    try {
      error = "";
      await r.command(
        channel,
        op,
        { id: order.id, ...payload },
        order.revision,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function loadCandidates() {
    try {
      candidates = await r.client.call("candidates", { order_id: id });
      candidate = candidates[0]?.id ?? "";
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function dispatch() {
    if (!order || !candidate) return;
    try {
      await r.command(
        channel,
        "offer",
        { id, collaborator_id: candidate },
        order.revision,
      );
      await r.loadOrder(id);
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function propose() {
    if (!order) return;
    try {
      await r.command(
        channel,
        "propose",
        {
          id,
          reason,
          labor_cents: integerInput(labor || "0"),
          parts_cents: integerInput(parts || "0"),
        },
        order.revision,
      );
      reason = "";
      labor = "";
      parts = "";
      tab = "timeline";
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function send() {
    if (!text.trim()) return;
    try {
      await r.command(`chat:${id}`, "sendMessage", { order_id: id, text });
      text = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function previewCancel(noShow = false) {
    try {
      cancelReason = noShow ? "no_show" : "customer_request";
      const p = await r.client.call("cancelPreview", {
        id,
        reason: cancelReason,
      });
      cancelFee = p.fee_cents;
      cancelRevision = p.revision;
      cancelOpen = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function cancelOrder() {
    try {
      await r.command(
        channel,
        "cancelOrder",
        { id, reason: cancelReason },
        cancelRevision,
      );
      cancelOpen = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function createCase() {
    try {
      const c = await r.command(`case:${id}`, "createCase", {
        order_id: id,
        category: caseCategory,
        description: caseText,
      });
      caseText = "";
      await r.loadOrder(id);
      error = "";
      tab = "help";
      if (c.id) await r.loadCases();
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  function switchTab(value: string) {
    tab = value;
    void goto(
      `${role === "customer" ? "/orders" : role === "field" ? "/jobs" : "/ops/orders"}/${id}?tab=${value}`,
      { reset: false },
    );
  }
  const tabs = $derived([
    "timeline",
    "evidence",
    "chat",
    "documents",
    "finance",
    ...(role === "customer" ? ["help"] : []),
  ]);
</script>

<main class="page">
  <a
    class="text-button"
    href={role === "customer"
      ? "/orders"
      : role === "field"
        ? "/jobs"
        : "/ops/orders"}>← {t("back")}</a
  >{#if error}<p role="alert" class="notice danger">
      {error}<button
        class="text-button"
        onclick={() =>
          void r.loadOrder(id).catch((e) => {
            error = e.message;
          })}>{t("retry")}</button
      >
    </p>{/if}<StateNotice {channel} />
  {#if loading && !order}<div class="skeleton">
      {t("loading")}
    </div>{:else if order}<header class="page-head">
      <div>
        <span class="eyebrow"
          >{role === "customer"
            ? "MAIN"
            : `VISION / ${role.toUpperCase()}`}</span
        >
        <h1>{order.code}</h1>
        <p class="muted">
          {r.services.find((s) => s.id === order.booking.service_id)?.name ??
            order.booking.category} · {new Date(
            order.updated_at,
          ).toLocaleString(r.locale)}
        </p>
      </div>
      <span class="status-badge" class:success={order.status === "completed"}
        >{t(order.status)}</span
      >
    </header>
    <div class="order-layout">
      <div class="order-main">
        <section class="next-action panel">
          <div>
            <span class="eyebrow">{t("scope")}</span>
            <h2>{order.booking.description}</h2>
            <p>
              {order.booking.address.street}, {order.booking.address.city} · {order
                .booking.date}
              {order.booking.slot}
            </p>
            {#if order.booking.address.access}<p class="muted">
                {order.booking.address.access}
              </p>{/if}
          </div>
          <div class="action-buttons">
            {#if order.allowed_actions.includes("order.start_transit")}<button
                class="button field-button"
                disabled={busy}
                onclick={() =>
                  void action("progress", { action: "order.start_transit" })}
                >{t("startTransit")}</button
              >{/if}
            {#if order.allowed_actions.includes("order.arrive")}<button
                class="button field-button"
                disabled={busy}
                onclick={() =>
                  void action("progress", { action: "order.arrive" })}
                >{t("arrive")}</button
              >{/if}
            {#if order.allowed_actions.includes("order.propose")}<a
                class="button secondary field-button"
                href={`/jobs/${id}/proposal`}>{t("proposal")}</a
              >{/if}
            {#if order.allowed_actions.includes("order.request_review")}<button
                class="button field-button"
                disabled={busy || r.photos.some((p) => p.order_id === id)}
                onclick={() =>
                  void action("progress", { action: "order.request_review" })}
                >{t("requestReview")}</button
              >{:else if role === "field" && order.status === "in_progress"}<p
                class="notice warning"
              >
                {t("missingEvidence")}
              </p>{/if}
            {#if order.allowed_actions.includes("order.review")}<a
                class="button"
                href={`/orders/${id}/review`}>{t("reviewOutcome")}</a
              >{/if}
            {#if order.allowed_actions.includes("quote.approve") && order.proposal}<a
                class="button"
                href={`/orders/${id}/approvals/${order.proposal.id}`}
                >{t("approve")}</a
              >{/if}
            {#if order.allowed_actions.includes("qa.accept")}<button
                class="button"
                disabled={busy}
                onclick={() => void action("qa", { decision: "accept" })}
                >{t("qaAccept")}</button
              ><label>{t("reason")}<input bind:value={qaReason} maxlength="5000" /></label><button
                class="button danger"
                disabled={busy || qaReason.trim().length < 5}
                onclick={() => void action("qa", { decision: "reject", reason: qaReason })}
                >{t("qaReject")}</button
              >{/if}
            {#if order.allowed_actions.includes("finance.reconcile")}<button
                class="button"
                disabled={busy}
                onclick={() => void action("reconcileFinance", {})}
                >{t("reconcile")}</button
              >{/if}
          </div>
        </section>
        {#if order.allowed_actions.includes("dispatch.offer")}<section
            class="panel"
          >
            <h2>{t("dispatch")}</h2>
            <button
              class="button secondary"
              onclick={() => void loadCandidates()}
              >{t("selectCollaborator")}</button
            >{#if candidates.length}<label
                >{t("professionals")}<select bind:value={candidate}
                  >{#each candidates as c}<option value={c.id}
                      >{c.name} · {c.area}</option
                    >{/each}</select
                ></label
              ><button
                class="button"
                disabled={busy}
                onclick={() => void dispatch()}>{t("sendOffer")}</button
              >{/if}
          </section>{/if}
        <nav class="tabbar" aria-label={t("details")}>
          {#each tabs as value}<button
              class:active={tab === value}
              onclick={() => switchTab(value)}
              >{t(
                value === "timeline"
                  ? "timeline"
                  : value === "evidence"
                    ? "evidence"
                    : value === "chat"
                      ? "chat"
                      : value === "documents"
                        ? "documents"
                        : value === "finance"
                          ? "finance"
                          : "help",
              )}</button
            >{/each}
        </nav>
        {#if tab === "evidence"}<EvidenceView
            {order}
            editable={role === "field" &&
              order.collaborator_id === r.user?.id &&
              [
                "in_progress",
                "pending_quote_approval",
                "pending_validation",
              ].includes(order.status)}
          />
        {:else if tab === "chat"}<section class="panel">
            <h2>{t("chat")}</h2>
            <div class="messages" aria-live="polite">
              {#each r.messages[id] ?? [] as m}<article
                  class="message"
                  class:mine={m.sender_id === r.user?.id}
                >
                  <strong>{m.sender_name}</strong>
                  <p>{m.text}</p>
                  <time>{new Date(m.at).toLocaleTimeString(r.locale)}</time>
                </article>{:else}<p class="empty-inline">{t("empty")}</p>{/each}
            </div>
            <StateNotice channel={`chat:${id}`} />
            <form
              class="message-form"
              onsubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label class="sr-only" for="message">{t("chat")}</label><textarea
                id="message"
                aria-label={t("chat")}
                bind:value={text}
                required
                rows="2"></textarea><button
                class="button"
                disabled={r.commandStates[`chat:${id}`] === "pending" ||
                  r.commandStates[`chat:${id}`] === "uncertain"}
                >{t("send")}</button
              >
            </form>
          </section>
        {:else if tab === "documents"}<section class="panel">
            <h2>{t("documents")}</h2>
            <p class="muted">{t("documentNote")}</p>
            <div class="action-buttons">
              {#each ["report", "warranty", "invoice"] as kind}<button
                  class="button secondary"
                  onclick={() =>
                    void r
                      .command(`document:${id}:${kind}`, "requestDocument", {
                        order_id: id,
                        kind,
                      })
                      .catch((e) => {
                        error = e.message;
                      })}>{t("requestDocument")} · {t(kind as Text)}</button
                ><StateNotice channel={`document:${id}:${kind}`} />{/each}
            </div>
            {#each r.documents[id] ?? [] as d}<article class="record-row">
                <div>
                  <strong>{t(d.kind)}</strong>
                  <p>{t(d.status)}</p>
                  {#if d.error}<p role="alert">{d.error}</p>{/if}
                </div>
                {#if d.status === "ready" && d.url}<a
                    class="button secondary"
                    href={d.url}
                    download={d.filename}>{t("download")}</a
                  >{:else}<button
                    class="button secondary"
                    onclick={async () => {
                      try {
                        await r.client.call("document", { id: d.id });
                        await r.loadDocuments(id);
                      } catch (e) {
                        error = e instanceof Error ? e.message : "";
                      }
                    }}>{t("refresh")}</button
                  >{/if}
              </article>{/each}
          </section>
        {:else if tab === "finance"}<section class="panel">
            <h2>{t("finance")}</h2>
            <p class="muted">{t("financialNote")}</p>
            <dl class="definition">
              <dt>{t("total")}</dt>
              <dd>{money(order.finance.total_cents, r.locale)}</dd>
              <dt>{t("payment")}</dt>
              <dd>{t(order.finance.payment)}</dd>
              <dt>{t("payout")}</dt>
              <dd>{t(order.finance.payout)}</dd>
              {#if role !== "customer"}<dt>{t("fee")}</dt>
                <dd>{money(order.finance.fee_cents, r.locale)}</dd>
                <dt>{t("withholding")}</dt>
                <dd>{money(order.finance.withholding_cents, r.locale)}</dd>
                <dt>{t("net")}</dt>
                <dd>
                  {money(order.finance.net_cents, r.locale)}
                </dd>{/if}{#if order.finance.receipt}<dt>{t("receipt")}</dt>
                <dd>{order.finance.receipt}</dd>{/if}
            </dl>
          </section>
        {:else if tab === "proposal"}<section class="panel">
            <h2>{t("proposal")}</h2>
            <form
              onsubmit={(e) => {
                e.preventDefault();
                void propose();
              }}
            >
              <label
                >{t("reason")}<textarea required bind:value={reason} rows="4"
                ></textarea></label
              >
              <div class="form-grid">
                <label
                  >{t("labor")} · MXN<input
                    required
                    inputmode="decimal"
                    bind:value={labor}
                  /></label
                ><label
                  >{t("parts")} · MXN<input
                    required
                    inputmode="decimal"
                    bind:value={parts}
                  /></label
                >
              </div>
              <p class="muted">{t("quotePending")}</p>
              <button
                class="button"
                disabled={busy ||
                  !order.allowed_actions.includes("order.propose")}
                >{t("proposal")}</button
              >
            </form>
          </section>
        {:else if tab === "approvals" && order.proposal && proposalId && proposalId !== order.proposal.id}<section
            class="panel notice warning"
          >
            <h2>{t("unavailable")}</h2>
            <p>{t("conflict")}</p>
            <a class="button secondary" href={`/orders/${id}`}>{t("details")}</a
            >
          </section>{:else if tab === "approvals" && order.proposal}<section
            class="panel"
          >
            <h2>{t("approve")}</h2>
            <p>{order.proposal.reason}</p>
            <dl class="definition">
              <dt>{t("previousTotal")}</dt>
              <dd>{money(order.proposal.previous_total_cents, r.locale)}</dd>
              <dt>{t("labor")}</dt>
              <dd>{money(order.proposal.labor_cents, r.locale)}</dd>
              <dt>{t("parts")}</dt>
              <dd>{money(order.proposal.parts_cents, r.locale)}</dd>
              <dt>{t("newTotal")}</dt>
              <dd class="price">
                {money(order.proposal.total_cents, r.locale)}
              </dd>
            </dl>
            <p>
              {t("expires")}: {new Date(
                order.proposal.expires_at,
              ).toLocaleString(r.locale)}
            </p>
            <div class="action-buttons">
              <button
                class="button"
                disabled={busy ||
                  !order.allowed_actions.includes("quote.approve") ||
                  Date.parse(order.proposal.expires_at) <= clock}
                onclick={() =>
                  void action("decideQuote", {
                    decision: "approve",
                    quote_id: order.proposal!.id,
                    quote_revision: order.proposal!.revision,
                  })}>{t("approve")}</button
              ><button
                class="button secondary"
                disabled={busy ||
                  !order.allowed_actions.includes("quote.reject") ||
                  Date.parse(order.proposal.expires_at) <= clock}
                onclick={() =>
                  void action("decideQuote", {
                    decision: "reject",
                    quote_id: order.proposal!.id,
                    quote_revision: order.proposal!.revision,
                  })}>{t("reject")}</button
              ><a class="text-button" href={`/orders/${id}`}>{t("close")}</a>
            </div>
          </section>
        {:else if tab === "review"}<section class="panel">
            <h2>{t("reviewOutcome")}</h2>
            <EvidenceView {order} />
            <form
              onsubmit={(e) => {
                e.preventDefault();
                void action("review", { rating, text: reviewText });
              }}
            >
              <label
                >{t("rating")}<select
                  aria-label={t("rating")}
                  bind:value={rating}
                  >{#each [5, 4, 3, 2, 1] as star}<option value={star}
                      >{"★".repeat(star)}</option
                    >{/each}</select
                ></label
              ><label
                >{t("notes")}<textarea rows="3" bind:value={reviewText}
                ></textarea></label
              ><button
                class="button"
                disabled={busy ||
                  !order.allowed_actions.includes("order.review")}
                >{t("sendReview")}</button
              ><a class="button secondary" href={`/orders/${id}/help`}
                >{t("help")}</a
              >
            </form>
          </section>
        {:else if tab === "help"}<section class="panel">
            <h2>{t("help")}</h2>
            <StateNotice channel={`case:${id}`} />
            <form
              onsubmit={(e) => {
                e.preventDefault();
                void createCase();
              }}
            >
              <label
                >{t("cases")}<select bind:value={caseCategory}
                  ><option value="quality">{t("qa")}</option><option
                    value="schedule">{t("schedule")}</option
                  ><option value="payment">{t("payment")}</option></select
                ></label
              ><label
                >{t("caseDescription")}<textarea
                  required
                  minlength="10"
                  bind:value={caseText}
                  rows="5"></textarea></label
              ><button
                class="button"
                disabled={r.commandStates[`case:${id}`] === "pending" ||
                  r.commandStates[`case:${id}`] === "uncertain"}
                >{t("submitCase")}</button
              >
            </form>
            {#each r.cases.filter((c) => c.order_id === id) as c}<article
                class="record-row"
              >
                <strong>{c.id.slice(0, 8)}</strong><span class="badge"
                  >{t(c.status)}</span
                >
                <p>{c.description}</p>
              </article>{/each}
          </section>
        {:else}<section class="panel">
            <h2>{t("timeline")}</h2>
            <ol class="timeline">
              {#each order.timeline as e}<li>
                  <span class="timeline-dot"></span>
                  <div>
                    <strong>{e.text}</strong>
                    <p>{e.actor}</p>
                    <time>{new Date(e.at).toLocaleString(r.locale)}</time>
                  </div>
                </li>{/each}
            </ol>
          </section>{/if}
      </div>
      <aside class="order-aside">
        <section class="panel">
          <span class="eyebrow">{t("total")}</span><strong class="price"
            >{money(order.quote.total_cents, r.locale)}</strong
          >
          <hr />
          <h3>{order.collaborator_name ?? t("pending_triage")}</h3>
          <p>
            {t("customerReview")}: {t(
              order.customer_review === "issue"
                ? "disputed"
                : order.customer_review === "accepted"
                  ? "confirmed"
                  : order.customer_review,
            )}
          </p>
          <p>
            QA: {t(
              order.qa === "accepted"
                ? "confirmed"
                : order.qa === "not_ready"
                  ? "qaNotReady"
                  : order.qa,
            )}
          </p>
          {#if role === "field" && order.booking.address.coordinates}<a
              class="button secondary wide"
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.booking.address.coordinates.lat},${order.booking.address.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer">{t("navigation")}</a
            >{:else if role === "field"}<a
              class="button secondary wide"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.booking.address.street + " " + order.booking.address.city)}`}
              target="_blank"
              rel="noopener noreferrer">{t("navigation")}</a
            >{/if}{#if order.pass}<details>
              <summary>{t("securityPass")}</summary>
              <p>{order.collaborator_name} · {order.pass.vehicle}</p>
              <strong>{order.pass.code}</strong>
              <p>
                {t("expires")}: {new Date(order.pass.expires_at).toLocaleString(
                  r.locale,
                )}
              </p>
            </details>{/if}{#if order.allowed_actions.includes("order.cancel")}<button
              class="text-button"
              disabled={busy}
              onclick={() => void previewCancel()}>{t("cancelPreview")}</button
            >{/if}{#if order.allowed_actions.includes("order.report_no_show")}<button
              class="text-button"
              disabled={busy}
              onclick={() => void previewCancel(true)}>{t("noShow")}</button
            >{/if}
        </section>
        <div class="notice small">{t("financialNote")}</div>
      </aside>
    </div>
  {:else}<section class="panel empty"><h1>{t("unavailable")}</h1></section>{/if}
</main>
<Dialog bind:open={cancelOpen} title={t("cancelPreview")}
  ><p>{t("cancelFee")}: <strong>{money(cancelFee, r.locale)}</strong></p>
  <p>{t("scope")}: {cancelReason}</p>
  <button
    class="button danger"
    disabled={busy}
    onclick={() => void cancelOrder()}>{t("confirmCancel")}</button
  ></Dialog
>
