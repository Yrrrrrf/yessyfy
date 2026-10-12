<script lang="ts">
  import { setContext, onMount, onDestroy, type Snippet } from "svelte";
  import { RuneProvider } from "rune-lab";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Runtime } from "../../../state/src/product/runtime.svelte.ts";
  import { createClient } from "../../../api/src/product/client.ts";
  import { deployment } from "../../../../config/deployment.ts";
  import { RUNTIME } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  let { surface, children }: { surface: "main" | "vision"; children: Snippet } =
    $props();
  const config = deployment();
  const r = new Runtime(
    createClient(config),
    `${config.environment}:${config.apiOrigin}`,
  );
  setContext(RUNTIME, r);
  const t = (k: Text) => translate(r.locale, k);
  let started = $state(false);
  let area = $state<"field" | "ops">("field");
  onMount(() => {
    started = true;
    void r.start();
  });
  onDestroy(() => r.dispose());
  $effect(() => {
    if (started) {
      document.documentElement.dataset.theme =
        r.theme === "dark" ? "vision-dark" : "yessyfy-light";
      document.documentElement.lang = r.locale;
    }
  });
  const path = $derived(page.url.pathname);
  const publicRoute = $derived(
    (surface === "main" &&
      [
        "/",
        "/services",
        "/collaborators",
        "/book",
        "/login",
        "/privacy",
        "/terms",
      ].some(
        (x) =>
          path === x ||
          ((x === "/services" || x === "/collaborators") &&
            path.startsWith(`${x}/`)),
      )) ||
      path === "/login" ||
      path === "/privacy" ||
      path === "/terms",
  );
  const denied = $derived(
    surface === "vision" &&
      !publicRoute &&
      (!r.user ||
        (path.startsWith("/ops")
          ? !r.canOps
          : /^\/(radar|jobs|wallet|onboarding)(\/|$)/.test(path)
            ? !r.canField
            : !r.canField && !r.canOps)),
  );
  const workArea = $derived(
    path.startsWith("/ops") || (r.canOps && !r.canField) ? "ops" : area,
  );
  const links = $derived(
    surface === "main"
      ? [
          ["/", "home", "⌂"],
          ["/services", "services", "◈"],
          ["/orders", "orders", "▤"],
          ["/inbox", "inbox", "◉"],
          ["/account", "account", "◎"],
        ]
      : workArea === "ops"
        ? [
            ["/ops", "overview", "⌂"],
            ["/ops/orders", "orders", "▤"],
            ["/ops/dispatch", "dispatch", "⌖"],
            ["/ops/qa", "qa", "✓"],
            ["/ops/cases", "cases", "⚑"],
            ["/ops/finance", "finance", "◈"],
            ["/ops/collaborators", "team", "◎"],
            ["/ops/templates", "templates", "✉"],
            ["/inbox", "inbox", "◉"],
            ["/account", "account", "⚙"],
          ]
        : [
            ["/radar", "radar", "⌖"],
            ["/jobs", "jobs", "▤"],
            ["/wallet", "wallet", "◈"],
            ["/inbox", "inbox", "◉"],
            ["/account", "account", "◎"],
          ],
  );
  function loginLink() {
    return `/login?return=${encodeURIComponent(path + page.url.search)}`;
  }
</script>

<RuneProvider
  config={{
    app: {
      name: surface === "main" ? "Yessyfy" : "Yessyfy Vision",
      version: "0.1.0",
    },
  }}
>
  <div class:work-shell={surface === "vision"} class="product-shell">
    {#if surface === "vision"}<aside class="work-nav">
        <a class="brand" href="/"
          ><span class="brand-mark">Y</span><span
            >Yessyfy<small
              >VISION · {t(workArea === "ops" ? "ops" : "field")}</small
            ></span
          ></a
        >{#if r.canField && r.canOps}<div class="segmented">
            <button
              onclick={() => {
                area = "field";
                void goto("/radar");
              }}>{t("field")}</button
            ><button
              onclick={() => {
                area = "ops";
                void goto("/ops");
              }}>{t("ops")}</button
            >
          </div>{/if}
        <nav aria-label={t("work")}>
          {#each links as [href, label, icon]}<a
              {href}
              class:active={path === href ||
                (href !== "/" &&
                  href !== "/ops" &&
                  path.startsWith(`${href}/`))}
              ><span>{icon}</span>{t(label as Text)}</a
            >{/each}
        </nav>
        <div class="sidebar-bottom">
          <span class="connection-dot" class:online={r.connection === "live"}
          ></span>{t(
            r.connection === "live"
              ? "live"
              : r.connection === "offline"
                ? "offline"
                : "reconnecting",
          )}
        </div>
      </aside>{/if}
    <div class="surface-body">
      <header class="topbar">
        {#if surface === "main"}<a class="brand" href="/"
            ><span class="brand-mark">Y</span><span
              >Yessyfy<small>SERVICIOS PARA TU HOGAR</small></span
            ></a
          >
          <nav class="desktop-nav" aria-label={t("services")}>
            <a href="/services" class:active={path.startsWith("/services")}
              >{t("services")}</a
            ><a
              href="/collaborators"
              class:active={path.startsWith("/collaborators")}
              >{t("professionals")}</a
            ><a href="/orders" class:active={path.startsWith("/orders")}
              >{t("orders")}</a
            >
          </nav>{:else}<div>
            <span class="eyebrow">{t("work")}</span><strong
              >{r.user?.name ?? "Yessyfy Vision"}</strong
            >
          </div>{/if}
        <div class="top-actions">
          <label class="sr-only" for="language">Language</label><select
            id="language"
            aria-label="Language"
            value={r.locale}
            onchange={(e) => r.setLocale(e.currentTarget.value as "es" | "en")}
            ><option value="es">ES</option><option value="en">EN</option
            ></select
          ><button
            class="icon-button"
            aria-label={t("preferences")}
            onclick={() => r.setTheme(r.theme === "light" ? "dark" : "light")}
            >{r.theme === "light" ? "◐" : "☀"}</button
          >{#if r.user}<a
              class="icon-button"
              href="/inbox"
              aria-label={t("inbox")}
              >◉{#if r.unread}<span class="count">{r.unread}</span>{/if}</a
            ><a class="user-pill" href="/account">{r.user.name.split(" ")[0]}</a
            ><button
              class="text-button"
              onclick={() => void r.logout().then(() => goto("/"))}
              >{t("logout")}</button
            >{:else}<a class="button compact" href={loginLink()}>{t("login")}</a
            >{/if}
        </div>
      </header>
      {#if surface === "vision"}<details class="mobile-work-menu">
          <summary>{t("work")}</summary>
          <nav>
            {#each links as [href, label]}<a {href}>{t(label as Text)}</a
              >{/each}
          </nav>
        </details>{/if}
      {#if r.error}<div class="notice danger global-notice" role="alert">
          {r.error}<button
            class="text-button"
            onclick={() => {
              r.ready = false;
              r.error = null;
              void r.start();
            }}>{t("retry")}</button
          >
        </div>{/if}
      {#if !r.ready && !publicRoute}<main class="page">
          <div class="skeleton" role="status">{t("loading")}</div>
        </main>{:else if !publicRoute && (!r.user || denied)}<main
          class="page narrow"
        >
          <section class="panel empty">
            <div class="empty-symbol">◎</div>
            <h1>{t(r.user ? "protected" : "signin")}</h1>
            {#if !r.user}<a class="button" href={loginLink()}>{t("login")}</a
              >{:else}<a
                class="button secondary"
                href={r.canOps
                  ? "/ops"
                  : r.canField
                    ? "/radar"
                    : config.mainOrigin}>{t("home")}</a
              >{/if}
          </section>
        </main>{:else}{@render children()}{/if}
      <footer>
        <span>© 2026 Yessyfy</span><a href="/privacy">{t("privacy")}</a><a
          href="/terms">{t("terms")}</a
        >{#if r.user}<span class="footer-feed"
            >{t(
              r.connection === "live"
                ? "live"
                : r.connection === "offline"
                  ? "offline"
                  : "reconnecting",
            )}</span
          >{/if}
      </footer>
    </div>
    <nav
      class="mobile-dock"
      aria-label={surface === "main" ? t("home") : t("work")}
    >
      {#each links.slice(0, 5) as [href, label, icon]}<a
          {href}
          class:active={path === href ||
            (href !== "/" && href !== "/ops" && path.startsWith(`${href}/`))}
          ><span>{icon}</span><small>{t(label as Text)}</small></a
        >{/each}
    </nav>
  </div>
</RuneProvider>
