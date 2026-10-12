<script lang="ts">
  import { goto, beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack, onMount } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import {
    bookingErrors,
    money,
    type Order,
    type Slot,
  } from "../../../core/src/product/contracts.ts";
  import StateNotice from "./StateNotice.svelte";
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let step = $state(1),
    error = $state(""),
    errors = $state<Record<string, string>>({}),
    busy = $state(false),
    dirty = $state(false),
    confirmed = $state(false);
  let slots = $state<Slot[]>([]),
    slotsLoading = $state(false);
  $effect(() => {
    const service_id = r.booking.service_id,
      date = r.booking.date,
      city = r.booking.address.city,
      urgency = r.booking.urgency;
    if (!service_id || !date || !city) {
      slots = [];
      return;
    }
    slotsLoading = true;
    void r
      .read("slots", () =>
        r.client.call("slots", { service_id, date, city, urgency }),
      )
      .then((value) => {
        slots = value;
        untrack(() => {
          if (!value.some((s) => s.id === r.booking.slot && s.available))
            r.booking.slot = value.find((s) => s.available)?.id ?? "";
          r.persistBooking();
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") error = e.message;
      })
      .finally(() => (slotsLoading = false));
  });
  const channel = "booking";
  let clock = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (clock = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const expired = $derived(
    !!r.quote && Date.parse(r.quote.expires_at) <= clock,
  );
  $effect(() => {
    const service = page.url.searchParams.get("service"),
      preferred = page.url.searchParams.get("preferred");
    untrack(() => {
      if (service && !r.booking.service_id) {
        const s = r.services.find((s) => s.id === service);
        if (s) {
          r.booking.service_id = s.id;
          r.booking.category = s.category;
        }
      }
      if (preferred) r.booking.preferred_collaborator = preferred;
    });
  });
  beforeNavigate(({ cancel }) => {
    if (dirty && !confirmed && !confirm(t("unsaved"))) cancel();
  });
  function changed() {
    dirty = true;
    r.clearQuote();
    r.persistBooking();
  }
  function selectService(id: string) {
    const s = r.services.find((s) => s.id === id);
    r.booking.service_id = id;
    r.booking.category = s?.category ?? "";
    if (s && !s.modes.includes(r.booking.mode)) r.booking.mode = s.modes[0];
    changed();
  }
  async function review() {
    errors = bookingErrors(r.booking);
    if (Object.keys(errors).length) {
      step = errors.service_id || errors.description ? 1 : 2;
      error = Object.values(errors)[0];
      return;
    }
    try {
      busy = true;
      error = "";
      await r.preview();
      step = 3;
      dirty = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    } finally {
      busy = false;
    }
  }
  async function submit() {
    if (!r.quote) return;
    try {
      busy = true;
      error = "";
      const o = (await r.command(
        channel,
        "createOrder",
        {
          booking: JSON.parse(JSON.stringify(r.booking)),
          quote_id: r.quote.id,
        },
        r.quote.revision,
      )) as Order;
      confirmed = true;
      dirty = false;
      await goto(`/orders/${encodeURIComponent(o.id)}`);
    } catch (e) {
      error = e instanceof Error ? e.message : "";
      if (!r.quote) step = 2;
    } finally {
      busy = false;
    }
  }
  $effect(() => {
    if (r.commandStates[channel] === "confirmed" && !busy && !confirmed) {
      const o = Object.values(r.orders).at(-1);
      if (o) {
        confirmed = true;
        dirty = false;
        void goto(`/orders/${encodeURIComponent(o.id)}`);
      }
    }
  });
</script>

<svelte:window
  onbeforeunload={(e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }}
/>
<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow">MAIN / {t("book")}</span>
      <h1>{t("reviewRequest")}</h1>
      <p class="muted">{t("savedDraft")}</p>
    </div>
    <a class="button secondary" href="/services">{t("back")}</a>
  </header>
  <ol class="steps" aria-label={t("book")}>
    {#each ["firstStep", "secondStep", "thirdStep"] as label, i}<li
        class:current={step === i + 1}
      >
        <button
          onclick={() => {
            step = i + 1;
          }}
          disabled={i === 2 && !r.quote}
          ><span>{i + 1}</span>{t(label as Text)}</button
        >
      </li>{/each}
  </ol>
  <StateNotice {channel} />{#if error}<div role="alert" class="notice danger">
      {error}
    </div>{/if}
  <div class="booking-grid">
    <section class="panel">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          if (step === 1) step = 2;
          else if (step === 2) void review();
          else void submit();
        }}
        oninput={changed}
      >
        {#if step === 1}<h2>{t("firstStep")}</h2>
          <label
            >{t("services")}<select
              name="service"
              value={r.booking.service_id}
              onchange={(e) => selectService(e.currentTarget.value)}
              required
              ><option value="">{t("choose")}</option
              >{#each r.services as s}<option value={s.id}>{s.name}</option
                >{/each}</select
            ></label
          >
          <div class="form-grid">
            <label
              >{t("mode")}<select bind:value={r.booking.mode}
                >{#each r.services.find((s) => s.id === r.booking.service_id)?.modes ?? [] as mode}<option
                    value={mode}>{t(mode)}</option
                  >{/each}</select
              ></label
            ><label
              >{t("location")}<select bind:value={r.booking.location_type}
                >{#each ["residencial", "comercial", "premium"] as x}<option
                    value={x}>{t(x as Text)}</option
                  >{/each}</select
              ></label
            ><label
              >{t("urgency")}<select bind:value={r.booking.urgency}
                >{#each ["normal", "mismo_dia", "emergencia_24_7"] as x}<option
                    value={x}>{t(x as Text)}</option
                  >{/each}</select
              ></label
            >
          </div>
          <label
            >{t("description")}<textarea
              name="description"
              required
              minlength="10"
              rows="5"
              bind:value={r.booking.description}
              aria-invalid={!!errors.description}></textarea></label
          >{#if r.booking.preferred_collaborator}<p class="notice">
              {t("preferred")}: {r.booking.preferred_collaborator}<small
                >{t("preferenceNote")}</small
              >
            </p>{/if}
        {:else if step === 2}<h2>{t("secondStep")}</h2>
          {#if r.user?.addresses.length}<label
              >{t("addresses")}<select
                onchange={(e) => {
                  const a = r.user?.addresses.find(
                    (a) => a.id === e.currentTarget.value,
                  );
                  if (a) r.booking.address = JSON.parse(JSON.stringify(a));
                  changed();
                }}
                ><option value="">{t("choose")}</option
                >{#each r.user.addresses as a}<option value={a.id}
                    >{a.label}: {a.street}</option
                  >{/each}</select
              ></label
            >{/if}<label
            >{t("address")}<input
              name="street"
              required
              bind:value={r.booking.address.street}
              aria-invalid={!!errors.street}
            /></label
          >
          <div class="form-grid">
            <label
              >{t("city")}<select
                name="city"
                required
                bind:value={r.booking.address.city}
                ><option value="">{t("choose")}</option
                >{#each r.manifest?.areas ?? [] as area}<option>{area}</option
                  >{/each}</select
              ></label
            ><label
              >{t("postal")}<input
                name="postal_code"
                required
                pattern={"[0-9]{5}"}
                inputmode="numeric"
                bind:value={r.booking.address.postal_code}
              /></label
            ><label
              >{t("date")}<input
                name="date"
                type="date"
                required
                bind:value={r.booking.date}
              /></label
            ><label
              >{t("schedule")}<select
                name="slot"
                required
                disabled={slotsLoading}
                bind:value={r.booking.slot}
                >{#each slots as slot}<option
                    value={slot.id}
                    disabled={!slot.available}>{slot.label}</option
                  >{/each}</select
              ></label
            >
          </div>
          <label
            >{t("access")}<textarea
              name="access"
              rows="3"
              bind:value={r.booking.address.access}></textarea></label
          >
          <p class="muted">{r.booking.timezone}</p>
        {:else}<h2>{t("thirdStep")}</h2>
          {#if r.quote}<dl class="definition">
              <dt>{t("scope")}</dt>
              <dd>{r.quote.scope}</dd>
              <dt>{t("mode")}</dt>
              <dd>{t(r.booking.mode)}</dd>
              <dt>{t("address")}</dt>
              <dd>
                {r.booking.address.street}, {r.booking.address.city}, {r.booking
                  .address.postal_code}
              </dd>
              <dt>{t("date")}</dt>
              <dd>
                {r.booking.date} · {r.booking.slot} · {r.booking.timezone}
              </dd>
              <dt>{t("access")}</dt>
              <dd>{r.booking.address.access || "—"}</dd>
              <dt>{t("urgency")}</dt>
              <dd>{t(r.booking.urgency)}</dd>
              <dt>{t("location")}</dt>
              <dd>{t(r.booking.location_type)}</dd>
              <dt>{t("expires")}</dt>
              <dd>{new Date(r.quote.expires_at).toLocaleString(r.locale)}</dd>
            </dl>
            <div class="quote-total">
              <span>{t("total")}</span><strong
                >{money(r.quote.total_cents, r.locale)}</strong
              >
            </div>
            {#if expired}<p class="notice warning">{t("quoteExpired")}</p>
              <button
                type="button"
                class="button secondary"
                onclick={() => void review()}>{t("quote")}</button
              >{/if}{/if}{/if}
        <div class="form-actions">
          {#if step > 1}<button
              type="button"
              class="button secondary"
              onclick={() => step--}>{t("back")}</button
            >{/if}{#if step === 2 && !r.user}<a
              class="button"
              href="/login?return=%2Fbook">{t("login")}</a
            >{:else}<button
              class="button"
              disabled={busy ||
                r.commandStates[channel] === "uncertain" ||
                (step === 3 && expired)}
              >{t(
                busy
                  ? "loading"
                  : step === 1
                    ? "next"
                    : step === 2
                      ? "quote"
                      : "confirm",
              )}</button
            >{/if}
        </div>
      </form>
    </section>
    <aside class="panel booking-summary">
      <span class="eyebrow">YESSYFY</span>
      <h2>
        {r.services.find((s) => s.id === r.booking.service_id)?.name ??
          t("services")}
      </h2>
      <p>{r.booking.description || t("heroBody")}</p>
      <div class="summary-symbol">⌂</div>
      <p>{t("preferenceNote")}</p>
      {#if r.quote}<strong class="price"
          >{money(r.quote.total_cents, r.locale)}</strong
        >{/if}
    </aside>
  </div>
</main>
