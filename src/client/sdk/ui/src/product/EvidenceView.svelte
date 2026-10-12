<script lang="ts">
  import { tick, onDestroy } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import type { Order, Phase } from "../../../core/src/product/contracts.ts";
  import Dialog from "./Dialog.svelte";
  import BeforeAfterSlider from "../components/BeforeAfterSlider.svelte";
  let { order, editable = false }: { order: Order; editable?: boolean } =
    $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let comparison = $state(false);
  const before = $derived(
      order.evidence.find((e) => e.phase === "diagnostic_before"),
    ),
    after = $derived(order.evidence.find((e) => e.phase === "proof_finished"));
  let phase = $state<Phase>("diagnostic_before"),
    error = $state(""),
    cameraOpen = $state(false),
    video: HTMLVideoElement,
    stream: MediaStream | null = null,
    urls = $state<Record<string, string>>({});
  $effect(() => {
    const photos = r.photos.filter((p) => p.order_id === order.id);
    const next: Record<string, string> = {};
    for (const p of photos) next[p.id] = URL.createObjectURL(p.file);
    urls = next;
    return () => Object.values(next).forEach(URL.revokeObjectURL);
  });
  async function add(file: File, source: "camera" | "file" = "file") {
    try {
      error = "";
      await r.queuePhoto(order.id, phase, file, source);
    } catch (e) {
      error = e instanceof Error ? e.message : "";
    }
  }
  async function openCamera() {
    try {
      error = "";
      cameraOpen = true;
      await tick();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (!cameraOpen) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
    } catch {
      error = t("cameraDenied");
      cameraOpen = false;
      stop();
    }
  }
  function stop() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  async function capture() {
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      1920 / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (blob)
      await add(
        new File([blob], `${order.code}-${phase}.jpg`, { type: "image/jpeg" }),
        "camera",
      );
    cameraOpen = false;
    stop();
  }
  $effect(() => {
    if (!cameraOpen) stop();
  });
  onDestroy(stop);
</script>

<section class="panel">
  <div class="section-title">
    <div>
      <span class="eyebrow">QA / {order.code}</span>
      <h2>{t("evidence")}</h2>
    </div>
    <span class="badge">{order.evidence.length}</span>
  </div>
  {#if error}<p class="notice danger" role="alert">
      {error}
    </p>{/if}{#if r.storageWarning}<p class="notice warning" role="status">
      {r.storageWarning}
    </p>{/if}
  {#if editable}<div class="capture-controls">
      <label
        >{t("evidence")}<select aria-label="Evidence phase" bind:value={phase}
          ><option value="diagnostic_before">{t("before")}</option><option
            value="work_progress">{t("progress")}</option
          ><option value="proof_finished">{t("after")}</option></select
        ></label
      ><label class="file-label"
        >{t("addPhoto")}<input
          type="file"
          accept={r.manifest?.mime_types.join(",")}
          aria-label={t("addPhoto")}
          onchange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void add(f);
            e.currentTarget.value = "";
          }}
        /></label
      ><button
        class="button secondary field-button"
        onclick={() => void openCamera()}>{t("capture")}</button
      >
    </div>
    <p class="muted small">{t("captureMetadata")}</p>{/if}
  <div class="evidence-grid">
    {#each order.evidence as e}<article class="evidence-card">
        <img
          src={e.url}
          alt={`${t(e.phase === "diagnostic_before" ? "before" : e.phase === "proof_finished" ? "after" : "progress")} · ${e.name}`}
          loading="lazy"
        />
        <div>
          <span class="badge success">{t("confirmed")}</span>
          <h3>
            {t(
              e.phase === "diagnostic_before"
                ? "before"
                : e.phase === "proof_finished"
                  ? "after"
                  : "progress",
            )}
          </h3>
          <small
            >{t("received")}: {new Date(e.received_at).toLocaleString(
              r.locale,
            )}</small
          ><small>{t("source")}: {t(e.source)}</small>
          <details>
            <summary>SHA-256</summary><code class="hash">{e.sha256}</code>
          </details>
        </div>
      </article>{:else}<p class="empty-inline">{t("noPhoto")}</p>{/each}
  </div>
  {#if before && after}<button
      class="button secondary"
      onclick={() => (comparison = !comparison)}
      aria-expanded={comparison}>{t("compare")}</button
    >{#if comparison}<BeforeAfterSlider
        beforeUrl={before.url}
        afterUrl={after.url}
        beforeLabel={t("before")}
        afterLabel={t("after")}
        controlLabel={t("compare")}
      />{/if}{/if}
  {#if r.photos.some((p) => p.order_id === order.id)}<h3>
      {t("photoStorage")}
    </h3>
    <div class="upload-queue">
      {#each r.photos.filter((p) => p.order_id === order.id) as p}<article
          class="upload-row"
        >
          <img src={urls[p.id]} alt={p.name} />
          <div>
            <strong>{p.name}</strong><small
              >{t(p.stage === "failed" ? "failed" : p.stage)} · {(
                p.file.size / 1024
              ).toFixed(0)} KB</small
            >{#if p.error}<span role="alert" class="error-text">{p.error}</span
              >{/if}
          </div>
          <button
            class="button secondary"
            disabled={!["queued", "failed"].includes(p.stage)}
            onclick={() =>
              void r.uploadPhoto(p.id).catch((e) => {
                error = e.message;
              })}>{t("upload")}</button
          ><button
            class="icon-button"
            aria-label={t("remove")}
            disabled={!["queued", "failed"].includes(p.stage)}
            onclick={() => void r.removePhoto(p.id)}>×</button
          >
        </article>{/each}
    </div>{/if}
</section>
<Dialog bind:open={cameraOpen} title={t("capture")}
  ><video
    bind:this={video}
    class="camera-video"
    muted
    playsinline
    aria-label={t("camera")}
  ></video><button
    class="button field-button wide"
    onclick={() => void capture()}>{t("addPhoto")}</button
  ></Dialog
>
