<script lang="ts">
  import { onMount } from "svelte";
  import { getRuntime } from "./context.ts";
  import { translate, type Text } from "./i18n.ts";
  import type { Order } from "../../../core/src/product/contracts.ts";
  let { orders }: { orders: Order[] } = $props();
  const r = getRuntime(),
    t = (k: Text) => translate(r.locale, k);
  let container: HTMLDivElement,
    map: import("leaflet").Map | undefined,
    leaflet: typeof import("leaflet") | undefined,
    layer: import("leaflet").LayerGroup | undefined,
    error = $state(""),
    ready = $state(false);
  const records = $derived(
    orders.flatMap((o) => {
      const point = o.telemetry ?? o.booking.address.coordinates;
      return point ? [{ order: o, point }] : [];
    }),
  );
  onMount(() => {
    let cancelled = false;
    void import("leaflet")
      .then(async (L) => {
        await import("leaflet/dist/leaflet.css");
        if (cancelled) return;
        leaflet = L;
        map = L.map(container, { zoomControl: true });
        layer = L.layerGroup().addTo(map);
        const template = (
          import.meta as ImportMeta & { env: Record<string, string> }
        ).env.VITE_YESSYFY_MAP_TILE_URL;
        if (template) {
          L.tileLayer(template, {
            attribution:
              (import.meta as ImportMeta & { env: Record<string, string> }).env
                .VITE_YESSYFY_MAP_ATTRIBUTION ?? "",
          }).addTo(map);
        }
        ready = true;
      })
      .catch((e) => {
        error = e.message;
      });
    return () => {
      cancelled = true;
      map?.remove();
    };
  });
  $effect(() => {
    const points = records,
      loaded = ready;
    if (!loaded || !map || !leaflet || !layer) return;
    layer.clearLayers();
    if (!points.length) return;
    for (const p of points) {
      const node = document.createElement("a");
      node.href = `/ops/orders/${p.order.id}`;
      node.textContent = `${p.order.code} · ${p.order.booking.description}`;
      leaflet
        .circleMarker([p.point.lat, p.point.lng], {
          radius: 9,
          color: "#167864",
          fillOpacity: 0.8,
        })
        .bindPopup(node)
        .addTo(layer);
    }
    map.fitBounds(
      leaflet.latLngBounds(points.map((p) => [p.point.lat, p.point.lng])),
      { padding: [30, 30], maxZoom: 14 },
    );
    map.invalidateSize();
  });
</script>

<section class="panel">
  <div class="section-title">
    <h2>{t("dispatch")}</h2>
    <span class="badge">{records.length} / {orders.length}</span>
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
  <div
    class="dispatch-map"
    bind:this={container}
    aria-label={t("dispatch")}
  ></div>
  <p class="muted">{t("locationUnknown")}: {orders.length - records.length}</p>
  {#each records as p}<a class="record-row" href={`/ops/orders/${p.order.id}`}
      ><strong>{p.order.code}</strong><span
        >{p.point.lat.toFixed(5)}, {p.point.lng.toFixed(5)}</span
      >{#if p.point.observed_at}<time
          >{new Date(p.point.observed_at).toLocaleString(r.locale)}</time
        >{#if Date.now() - Date.parse(p.point.observed_at) > 120000}<span
            >{t("staleLocation")}</span
          >{/if}{/if}</a
    >{/each}
</section>
