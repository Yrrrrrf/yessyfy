<script lang="ts">
  import { untrack } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import type {
    Profile,
    Address,
  } from "../../../core/src/product/contracts.ts";
  import StateNotice from "./StateNotice.svelte";
  let { view = "account" }: { view?: "account" | "onboarding" | "team" } =
    $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let name = $state(""),
    area = $state(""),
    vehicle = $state(""),
    trades = $state<string[]>([]),
    fiscal = $state({
      rfc: "",
      name: "",
      postal_code: "",
      regime: "",
      use: "",
    }),
    addresses = $state<Address[]>([]),
    error = $state(""),
    success = $state(false),
    reason = $state(""),
    documentKind = $state("identity");
  let loadedId = "";
  $effect(() => {
    const user = r.user;
    if (!user || user.id === loadedId) return;
    untrack(() => {
      loadedId = user.id;
      name = user.name;
      area = user.area;
      vehicle = user.vehicle;
      trades = [...user.trades];
      fiscal = { ...user.fiscal };
      addresses = structuredClone($state.snapshot(user.addresses));
      const draft = r.readDraft<{
        name: string;
        area: string;
        vehicle: string;
        trades: string[];
        fiscal: Profile["fiscal"];
        addresses: Address[];
      }>("profile");
      if (draft) {
        name = draft.name;
        area = draft.area;
        vehicle = draft.vehicle;
        trades = draft.trades;
        fiscal = draft.fiscal;
        addresses = draft.addresses;
      }
    });
  });
  $effect(() => {
    const ready = r.ready,
      v = view;
    untrack(() => {
      if (ready && v === "team")
        void r.loadProfiles().catch((e) => {
          error = e.message;
        });
    });
  });
  $effect(() => {
    const actor = r.user?.id,
      draft = JSON.parse(
        JSON.stringify({ name, area, vehicle, trades, fiscal, addresses }),
      );
    untrack(() => r.saveDraft("profile", draft));
  });
  async function save() {
    try {
      error = "";
      success = false;
      await r.command("profile", "updateProfile", {
        name,
        locale: r.locale,
        area,
        vehicle,
        trades,
        fiscal,
        addresses,
      });
      r.clearDraft("profile");
      success = true;
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : "";
      return false;
    }
  }
  async function submit() {
    try {
      error = "";
      if (!(await save())) return;
      await r.command("verification", "submitVerification", {});
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function decide(p: Profile, decision: string) {
    try {
      await r.command(`verification:${p.id}`, "submitVerification", {
        id: p.id,
        decision,
        reason,
      });
      await r.loadProfiles();
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  function addAddress() {
    addresses = [
      ...addresses,
      {
        id: crypto.randomUUID(),
        label: "",
        street: "",
        city: "",
        postal_code: "",
        access: "",
      },
    ];
  }
</script>

<main class="page">
  <header class="page-head">
    <div>
      <span class="eyebrow">YESSYFY / {t("profile")}</span>
      <h1>
        {t(
          view === "team"
            ? "team"
            : view === "onboarding"
              ? "onboarding"
              : "account",
        )}
      </h1>
      <p class="muted">{r.user?.name} · {r.user?.phone}</p>
    </div>
    <span class="badge" class:success={r.user?.eligibility === "verified"}
      >{t(r.user?.eligibility ?? "unsubmitted")}</span
    >
  </header>
  {#if error}<p class="notice danger" role="alert">
      {error}
    </p>{/if}{#if success}<p class="notice success" role="status">
      {t("success")}
    </p>{/if}<StateNotice channel="profile" />
  {#if view === "team"}<label>{t("reason")}<input bind:value={reason} /></label>
    <div class="three-grid">
      {#each r.profiles as p}<article class="panel">
          <div class="avatar">{p.name.charAt(0)}</div>
          <h2>{p.name}</h2>
          <p>{p.phone} · {p.area}</p>
          <span class="badge">{t(p.eligibility)}</span>
          <p>{p.review_reason ?? ""}</p>
          {#each p.verification_documents ?? [] as d}<a
              class="button secondary compact"
              href={d.url}
              target="_blank"
              rel="noopener noreferrer">{d.kind} · {d.name}</a
            >{/each}<StateNotice channel={`verification:${p.id}`} />
          <div class="action-buttons">
            <button
              class="button secondary"
              onclick={() => void decide(p, "verify")}
              >{t("verifyProfile")}</button
            ><button
              class="button secondary"
              onclick={() => void decide(p, "reject")}
              >{t("rejectProfile")}</button
            >
          </div>
        </article>{/each}
    </div>
  {:else}<div class="account-grid">
      <form
        class="panel"
        onsubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2>{t("profile")}</h2>
        <label
          >{t("name")}<input name="name" required bind:value={name} /></label
        >{#if r.canField}<label
            >{t("coverage")}<select bind:value={area}
              ><option value="">{t("choose")}</option
              >{#each r.manifest?.areas ?? [] as a}<option>{a}</option
                >{/each}</select
            ></label
          >
          <fieldset>
            <legend>{t("trade")}</legend>
            <div class="chips">
              {#each r.services as s}<label class="check"
                  ><input
                    type="checkbox"
                    checked={trades.includes(s.category)}
                    onchange={(e) => {
                      trades = e.currentTarget.checked
                        ? [...trades, s.category]
                        : trades.filter((x) => x !== s.category);
                    }}
                  />{s.name}</label
                >{/each}
            </div>
          </fieldset>
          <label>{t("vehicle")}<input bind:value={vehicle} /></label
          >{/if}<button
          class="button"
          disabled={r.commandStates.profile === "pending" ||
            r.commandStates.profile === "uncertain"}>{t("save")}</button
        >
      </form>
      <section class="panel">
        <h2>{t("preferences")}</h2>
        <label
          >Language<select
            value={r.locale}
            onchange={(e) => r.setLocale(e.currentTarget.value as "es" | "en")}
            ><option value="es">Español</option><option value="en"
              >English</option
            ></select
          ></label
        ><label
          >{t("preferences")}<select
            value={r.theme}
            onchange={(e) =>
              r.setTheme(e.currentTarget.value as "light" | "dark")}
            ><option value="light">{t("light")}</option><option value="dark"
              >{t("dark")}</option
            ></select
          ></label
        >
        <h3>{t("membership")}</h3>
        <p>
          {r.user?.membership.active
            ? r.user.membership.name
            : t("noMembership")}
        </p>
        {#if r.canField}<h3>{t("verification")}</h3>
          <p>{t(r.user?.eligibility ?? "unsubmitted")}</p>
          <p>{r.user?.review_reason ?? ""}</p>
          <StateNotice channel="verification" /><label
            >{t("documents")}<select bind:value={documentKind}
              ><option value="identity"
                >{r.locale === "es" ? "Identificación" : "Identity"}</option
              ><option value="address">{t("address")}</option><option
                value="credential">{t("trade")}</option
              ></select
            ><input
              aria-label={t("documents")}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onchange={async (e) => {
                const f = e.currentTarget.files?.[0];
                if (f) {
                  try {
                    const p = await r.queueVerification(f, documentKind);
                    await r.uploadPhoto(p.id);
                  } catch (e) {
                    error = e instanceof Error ? e.message : "";
                  }
                }
              }}
            /></label
          >{#each r.user?.verification_documents ?? [] as d}<p>
              ✓ {d.kind} · {d.name}
            </p>{/each}{#each r.photos.filter((p) => p.purpose === "verification") as p}<p
            >
              {p.name} · {p.stage}
            </p>
            {#if p.stage === "failed"}<p role="alert">{p.error}</p>
              <button
                class="button secondary"
                onclick={() =>
                  void r.uploadPhoto(p.id).catch((e) => {
                    error = e.message;
                  })}>{t("retry")}</button
              >{/if}{/each}<button
            class="button secondary"
            disabled={r.commandStates.verification === "pending" ||
              r.user?.eligibility === "submitted"}
            onclick={() => void submit()}>{t("submitVerification")}</button
          >{/if}
      </section>
      <form
        class="panel"
        onsubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2>{t("fiscal")}</h2>
        <label>{t("rfc")}<input bind:value={fiscal.rfc} /></label><label
          >{t("businessName")}<input bind:value={fiscal.name} /></label
        >
        <div class="form-grid">
          <label
            >{t("postal")}<input
              inputmode="numeric"
              bind:value={fiscal.postal_code}
            /></label
          ><label>{t("regime")}<input bind:value={fiscal.regime} /></label
          ><label>{t("fiscalUse")}<input bind:value={fiscal.use} /></label>
        </div>
        <button
          class="button secondary"
          disabled={r.commandStates.profile === "pending" ||
            r.commandStates.profile === "uncertain"}>{t("save")}</button
        >
      </form>
      <section class="panel">
        <div class="section-title">
          <h2>{t("addresses")}</h2>
          <button class="button secondary compact" onclick={addAddress}
            >＋</button
          >
        </div>
        {#each addresses as a, i}<fieldset class="address-record">
            <label>{t("name")}<input bind:value={a.label} /></label><label
              >{t("address")}<input bind:value={a.street} /></label
            >
            <div class="form-grid">
              <label>{t("city")}<input bind:value={a.city} /></label><label
                >{t("postal")}<input bind:value={a.postal_code} /></label
              >
            </div>
            <label>{t("access")}<input bind:value={a.access} /></label><button
              class="text-button"
              onclick={() => (addresses = addresses.filter((_, x) => x !== i))}
              >{t("remove")}</button
            >
          </fieldset>{/each}<button
          class="button secondary"
          onclick={() => void save()}>{t("save")}</button
        >
      </section>
    </div>{/if}
</main>
