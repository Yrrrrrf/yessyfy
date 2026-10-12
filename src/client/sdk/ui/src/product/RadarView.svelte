<script lang="ts">
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import { money } from "../../../core/src/product/contracts.ts";
  import StateNotice from "./StateNotice.svelte";
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let error = $state(""),
    clock = $state(Date.now()),
    sound = $state(false);
  let audio: AudioContext | null = null;
  $effect(() => {
    const timer = setInterval(() => (clock = Date.now()), 1000);
    return () => {
      clearInterval(timer);
      void audio?.close();
    };
  });
  $effect(() => {
    const ready = r.ready,
      user = r.user?.id;
    untrack(() => {
      if (ready && user)
        void r.loadOffers().catch((e) => {
          error = e.message;
        });
    });
  });
  let seen = new Set<string>();
  async function enableSound() {
    if (!sound) return;
    try {
      audio ??= new AudioContext();
      await audio.resume();
    } catch {
      sound = false;
      error =
        r.locale === "es"
          ? "El sonido no está disponible; las ofertas siguen visibles."
          : "Sound is unavailable; offers remain visible.";
    }
  }
  $effect(() => {
    const offers = r.offers
        .filter((o) => o.status === "pending")
        .map((o) => o.id),
      enabled = sound;
    untrack(() => {
      const fresh = offers.some((id) => !seen.has(id));
      seen = new Set(offers);
      if (fresh && enabled && audio?.state === "running") {
        const oscillator = audio.createOscillator(),
          gain = audio.createGain();
        oscillator.frequency.value = 660;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.15);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      }
    });
  });
  async function duty() {
    try {
      await r.command("duty", "duty", { desired: !r.user?.duty });
      if (r.user?.duty && sound) {
        audio ??= new AudioContext();
        await audio.resume();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function accept(id: string, revision: number) {
    try {
      const o = await r.command(`offer:${id}`, "acceptOffer", { id }, revision);
      await goto(`/jobs/${o.id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : "";
      await r.loadOffers();
    }
  }
</script>

<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow">VISION / {t("field")}</span>
      <h1>{t("radar")}</h1>
      <p class="muted">{t("preferenceNote")}</p>
    </div>
    <button
      class="button field-button"
      class:secondary={!r.user?.duty}
      disabled={r.user?.eligibility !== "verified" ||
        r.commandStates.duty === "pending"}
      onclick={() => void duty()}
      aria-pressed={r.user?.duty}
      >{r.user?.duty ? "● " : "○ "}{t("duty")}</button
    >
  </header>
  <StateNotice channel="duty" />{#if error}<p
      class="notice danger"
      role="alert"
    >
      {error}
    </p>{/if}{#if r.user?.eligibility !== "verified"}<section
      class="notice warning"
    >
      <p>{t("verification")}: {t(r.user?.eligibility ?? "unsubmitted")}</p>
      <a class="button secondary" href="/onboarding">{t("onboarding")}</a>
    </section>{/if}<label class="check"
    ><input
      type="checkbox"
      bind:checked={sound}
      onchange={() => void enableSound()}
    />{r.locale === "es"
      ? "Sonido opcional para ofertas"
      : "Optional offer sound"}</label
  >
  <div class="two-grid">
    {#each r.offers as o}{@const remaining = Math.max(
        0,
        Math.ceil((Date.parse(o.expires_at) - clock) / 1000),
      )}
      <article class="panel offer-card">
        <div class="record-heading">
          <span class="service-icon">⌖</span><span
            class="badge"
            class:success={o.status === "pending" && remaining > 0}
            >{o.status === "pending" && remaining > 0
              ? `${remaining}s`
              : t("offerExpired")}</span
          >
        </div>
        <span class="eyebrow">{o.order_code}</span>
        <h2>{o.description}</h2>
        <p class="muted">{o.area}</p>
        <div class="quote-total">
          <span>{t("net")}</span><strong>{money(o.net_cents, r.locale)}</strong>
        </div>
        <StateNotice channel={`offer:${o.id}`} />
        <div class="action-buttons">
          <button
            class="button field-button"
            disabled={remaining === 0 ||
              !o.allowed_actions.includes("offer.accept") ||
              r.commandStates[`offer:${o.id}`] === "pending" ||
              r.commandStates[`offer:${o.id}`] === "uncertain"}
            onclick={() => void accept(o.id, o.revision)}>{t("accept")}</button
          ><button
            class="button secondary field-button"
            disabled={remaining === 0 ||
              !o.allowed_actions.includes("offer.decline")}
            onclick={() =>
              void r
                .command(
                  `offer:${o.id}`,
                  "declineOffer",
                  { id: o.id },
                  o.revision,
                )
                .then(() => r.loadOffers())
                .catch((e) => {
                  error = e.message;
                })}>{t("decline")}</button
          >
        </div>
      </article>{:else}<section class="panel empty">
        <div class="radar-art"><span>⌖</span></div>
        <h2>{t("empty")}</h2>
        <p>{t(r.user?.duty ? "duty" : "notAvailable")}</p>
        <button class="button secondary" onclick={() => void r.loadOffers()}
          >{t("refresh")}</button
        >
      </section>{/each}
  </div>
</main>
