<script lang="ts">
  import ServiceIcon from "./ServiceIcon.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import { money } from "../../../core/src/product/contracts.ts";
  let {
    view,
    id,
  }: {
    view: "home" | "services" | "service" | "collaborators" | "collaborator";
    id?: string;
  } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let text = $state(""),
    category = $state(""),
    error = $state(""),
    loading = $state(false),
    available = $state(false);
  const service = $derived(r.services.find((s) => s.id === id));
  const person = $derived(r.collaborators.find((c) => c.id === id));
  const filtered = $derived(
    r.services.filter(
      (s) =>
        (!category || s.category === category) &&
        `${s.name} ${s.description}`.toLowerCase().includes(text.toLowerCase()),
    ),
  );
  $effect(() => {
    const query = page.url.search,
      ready = r.ready,
      v = view;
    untrack(() => {
      if (!ready) return;
      const p = new URLSearchParams(query);
      text = p.get("text") ?? "";
      category = p.get("category") ?? "";
      available = p.get("available") === "true";
      if (v === "collaborators" || v === "collaborator") {
        loading = true;
        void r
          .directory({ text, category, available })
          .catch((e) => {
            error = e.message;
          })
          .finally(() => (loading = false));
      }
      if (v === "home" && r.user)
        void r.loadOrders({ view: "customer" }).catch(() => {});
    });
  });
  function search() {
    const q = new URLSearchParams();
    if (text) q.set("text", text);
    if (category) q.set("category", category);
    if (available) q.set("available", "true");
    void goto(
      `/${view === "collaborators" ? "collaborators" : "services"}?${q}`,
    );
  }
</script>

<main class="page">
  {#if view === "home"}<section class="home-hero">
      <div>
        <span class="eyebrow"
          >YESSYFY · {r.manifest?.areas.join(" / ") ?? ""}</span
        >
        <h1>{t("hero")}</h1>
        <p>{t("heroBody")}</p>
        <div class="hero-actions">
          <a class="button" href="/services">{t("start")} <span>↗</span></a><a
            class="button secondary"
            href="/collaborators">{t("professionals")}</a
          >
        </div>
        <div class="hero-trust">
          <span>✓ {t("scope")}</span><span>◈ {t("quote")}</span><span
            >◎ {t("evidence")}</span
          >
        </div>
      </div>
      <div class="hero-illustration" aria-hidden="true">
        <div class="house-roof"></div>
        <div class="house-body">
          <div class="house-window"></div>
          <div class="house-door"></div>
        </div>
        <div class="floating-check">✓</div>
        <div class="floating-label">Yessyfy <span>●</span></div>
        <span class="illustration-tool">✧</span>
      </div>
    </section>
    {#if r.rows.items.some((o) => !["completed", "cancelled"].includes(o.status))}{@const active =
        r.rows.items.find(
          (o) => !["completed", "cancelled"].includes(o.status),
        )!}<a class="active-banner" href={`/orders/${active.id}`}
        ><div>
          <span class="eyebrow">{t("activeService")}</span>
          <h3>{active.code} · {t(active.status)}</h3>
        </div>
        <span>→</span></a
      >{/if}
    <div class="section-title">
      <div>
        <span class="eyebrow">{t("start")}</span>
        <h2>{t("services")}</h2>
      </div>
      <a href="/services">{t("all")} →</a>
    </div>
    <div class="service-grid">
      {#each r.services as s}<a class="service-card" href={`/services/${s.id}`}
          ><span class="service-icon"
            ><ServiceIcon category={s.category} /></span
          >
          <h3>{s.name}</h3>
          <p>{s.description}</p>
          <span class="muted"
            >{t("estimate")} · {money(s.estimate_cents, r.locale)}</span
          ><span class="card-arrow">↗</span></a
        >{/each}
    </div>
    <section class="how-it-works">
      <h2>{t("heroBody")}</h2>
      <div class="three-grid">
        {#each ["firstStep", "secondStep", "thirdStep"] as k, i}<div
            class="panel"
          >
            <span class="step-number">0{i + 1}</span>
            <h3>{t(k as Text)}</h3>
            <p>
              {t(
                i === 0 ? "scope" : i === 1 ? "savedDraft" : "requestConfirmed",
              )}
            </p>
          </div>{/each}
      </div>
    </section>
  {:else if view === "service"}{#if service}<a
        class="text-button"
        href="/services">← {t("back")}</a
      >
      <div class="detail-hero">
        <span class="service-icon large"
          ><ServiceIcon category={service.category} size={44} /></span
        >
        <div>
          <span class="eyebrow">{service.area}</span>
          <h1>{service.name}</h1>
          <p>{service.description}</p>
        </div>
      </div>
      <div class="two-grid">
        <section class="panel">
          <h2>{t("included")}</h2>
          {#each service.included as x}<p>✓ {x}</p>{/each}
          <h2>{t("excluded")}</h2>
          {#each service.excluded as x}<p class="muted">— {x}</p>{/each}
        </section>
        <aside class="panel">
          <span class="eyebrow">{t("estimate")}</span>
          <p class="price">{money(service.estimate_cents, r.locale)}</p>
          <p>{t("scope")}</p>
          <a class="button wide" href={`/book?service=${service.id}`}
            >{t("book")}</a
          >
        </aside>
      </div>{:else}<div class="panel empty">
        {t(r.ready ? "unavailable" : "loading")}
      </div>{/if}
  {:else if view === "collaborator"}{#if person}<a
        class="text-button"
        href="/collaborators">← {t("back")}</a
      >
      <section class="panel profile-hero">
        <div class="avatar large">{person.name.charAt(0)}</div>
        <div>
          <span class="eyebrow">{t("professionals")}</span>
          <h1>{person.name}</h1>
          <p>{person.bio}</p>
          <p>
            {person.verified ? "✓ " + t("verified") : t("verification")} · {person.area}
          </p>
          <p>★ {person.rating} · {person.completed} {t("completedJobs")}</p>
          <div class="chips">
            {#each person.trades as trade}<span class="chip"
                >{r.services.find((s) => s.category === trade)?.name ??
                  trade}</span
              >{/each}
          </div>
          <a class="button" href={`/book?preferred=${person.id}`}>{t("book")}</a
          >
          <p class="muted">{t("preferenceNote")}</p>
        </div>
      </section>{:else}<div class="panel empty">
        {t(loading ? "loading" : "unavailable")}
      </div>{/if}
  {:else}<header class="page-head">
      <div>
        <span class="eyebrow">YESSYFY / MAIN</span>
        <h1>{t(view === "collaborators" ? "professionals" : "services")}</h1>
        <p class="muted">{t("heroBody")}</p>
      </div>
      <a href="/book" class="button">{t("book")}</a>
    </header>
    <form
      class="filterbar"
      onsubmit={(e) => {
        e.preventDefault();
        search();
      }}
    >
      <label class="search-field"
        ><span class="sr-only">{t("search")}</span><input
          aria-label={t("search")}
          bind:value={text}
          placeholder={t("search")}
        /></label
      ><label
        ><span class="sr-only">{t("trade")}</span><select
          aria-label={t("trade")}
          bind:value={category}
          onchange={search}
          ><option value="">{t("all")}</option>{#each r.services as s}<option
              value={s.category}>{s.name}</option
            >{/each}</select
        ></label
      >{#if view === "collaborators"}<label class="check"
          ><input
            type="checkbox"
            bind:checked={available}
            onchange={search}
          />{t("available")}</label
        >{/if}<button class="button secondary">{t("search")}</button>
    </form>
    {#if error}<p role="alert" class="notice danger">
        {error}
      </p>{/if}{#if loading}<div class="skeleton">
        {t("loading")}
      </div>{:else if view === "services"}<div class="service-grid">
        {#each filtered as s}<a class="service-card" href={`/services/${s.id}`}
            ><span class="service-icon"
              ><ServiceIcon category={s.category} /></span
            >
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <strong>{money(s.estimate_cents, r.locale)}</strong><small
              >{t("estimate")}</small
            ></a
          >{:else}<div class="panel empty">{t("empty")}</div>{/each}
      </div>{:else}<div class="three-grid">
        {#each r.collaborators as c}<article class="panel person-card">
            <div class="person-heading">
              <div class="avatar">{c.name.charAt(0)}</div>
              <span class="badge" class:success={c.verified}
                >{c.verified ? "✓ " + t("verified") : t("verification")}</span
              >
            </div>
            <h2>{c.name}</h2>
            <p class="muted">{c.area}</p>
            <div class="chips">
              {#each c.trades as trade}<span class="chip"
                  >{r.services.find((s) => s.category === trade)?.name ??
                    trade}</span
                >{/each}
            </div>
            <p>★ {c.rating} · {c.completed} {t("completedJobs")}</p>
            <small
              >{t(c.available ? "available" : "notAvailable")} · {new Date(
                c.updated_at,
              ).toLocaleTimeString(r.locale)}</small
            ><a class="button secondary wide" href={`/collaborators/${c.id}`}
              >{t("profile")} →</a
            >
          </article>{:else}<div class="panel empty">{t("empty")}</div>{/each}
      </div>{/if}{/if}
</main>
