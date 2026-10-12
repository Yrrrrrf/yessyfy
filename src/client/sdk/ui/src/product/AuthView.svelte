<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import { safePath } from "../../../core/src/product/contracts.ts";
  let { surface }: { surface: "main" | "vision" } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let phone = $state(""),
    code = $state(""),
    challenge = $state(""),
    expires = $state(""),
    error = $state(""),
    busy = $state(false);
  let remaining = $state(0);
  $effect(() => {
    if (!expires) return;
    const timer = setInterval(
      () =>
        (remaining = Math.max(
          0,
          Math.ceil((Date.parse(expires) - Date.now()) / 1000),
        )),
      1000,
    );
    remaining = Math.max(
      0,
      Math.ceil((Date.parse(expires) - Date.now()) / 1000),
    );
    return () => clearInterval(timer);
  });
  async function request() {
    try {
      busy = true;
      error = "";
      const x = await r.requestOtp(phone);
      challenge = x.challenge_id;
      expires = x.expires_at;
      code = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    } finally {
      busy = false;
    }
  }
  async function verify() {
    try {
      busy = true;
      error = "";
      await r.signin(challenge, code);
      const ret = safePath(page.url.searchParams.get("return") ?? "");
      await goto(
        ret ?? (surface === "main" ? "/orders" : r.canOps ? "/ops" : "/radar"),
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    } finally {
      busy = false;
    }
  }
</script>

<main class="page auth-page">
  <aside class="auth-story">
    <span class="eyebrow"
      >YESSYFY / {surface === "main" ? "MAIN" : "VISION"}</span
    >
    <h1>{t(surface === "main" ? "hero" : "work")}</h1>
    <p>{t("heroBody")}</p>
    <div class="story-mark">Y</div>
  </aside>
  <section class="panel auth-card">
    <span class="eyebrow">{t("signedIn")}</span>
    <h2>{t("signin")}</h2>
    {#if error}<p class="notice danger" role="alert">
        {error}
      </p>{/if}{#if !challenge}<form
        onsubmit={(e) => {
          e.preventDefault();
          void request();
        }}
      >
        <label
          >{t("phone")}<input
            name="phone"
            autocomplete="tel"
            type="tel"
            required
            bind:value={phone}
            placeholder="55 1234 5678"
          /></label
        ><button class="button wide" disabled={busy || !r.ready}
          >{t(busy ? "loading" : "sendCode")}</button
        >
      </form>{:else}<form
        onsubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <p>{phone}</p>
        <label
          >{t("code")}<input
            name="otp"
            autocomplete="one-time-code"
            inputmode="numeric"
            required
            minlength="6"
            maxlength="6"
            bind:value={code}
          /></label
        >
        <p class="muted">{t("expires")}: {remaining}s</p>
        <button class="button wide" disabled={busy || remaining === 0}
          >{t(busy ? "loading" : "verify")}</button
        ><button
          type="button"
          class="text-button"
          disabled={busy || !r.ready}
          onclick={() => void request()}>{t("resend")}</button
        ><button
          type="button"
          class="text-button"
          onclick={() => {
            challenge = "";
            error = "";
          }}>{t("back")}</button
        >
      </form>{/if}
  </section>
</main>
