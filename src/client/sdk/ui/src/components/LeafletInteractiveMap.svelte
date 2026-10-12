<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type * as LeafletType from 'leaflet';
import type { ClientDestination, TechnicianPin } from './map/mapTypes.ts';
import {
  renderGeofenceLayer,
  renderRoutePolyline,
  renderTechnicianAndClientMarkers,
  renderTrimmedRoutePolylines,
} from './map/mapLayers.ts';
import {
  createClientDestinationDivIcon,
  createMovingTechnicianDivIcon,
  createTechnicianDivIcon,
} from './map/mapIcons.ts';

export type { ClientDestination, TechnicianPin };

interface Props {
  center?: [number, number];
  zoom?: number;
  technicians?: TechnicianPin[];
  clientDestination?: ClientDestination | null;
  activeRoute?: Array<[number, number]> | null;
  traveledRoute?: Array<[number, number]> | null;
  remainingRoute?: Array<[number, number]> | null;
  technicianHeading?: number;
  isInsideGeofence?: boolean;
  selectedTechnicianId?: string | null;
  heightClass?: string;
  mapTheme?: 'positron' | 'dark_matter' | 'osm';
  showControls?: boolean;
  onTechnicianClick?: (techId: string) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

let {
  center = [19.4326, -99.1332],
  zoom = 13,
  technicians = [],
  clientDestination = null,
  activeRoute = null,
  traveledRoute = null,
  remainingRoute = null,
  technicianHeading = 0,
  isInsideGeofence = false,
  selectedTechnicianId = null,
  heightClass = 'h-[400px]',
  mapTheme = 'positron',
  showControls = true,
  onTechnicianClick,
  onMapClick,
}: Props = $props();

let mapContainer: HTMLDivElement | null = $state(null);
let L: typeof LeafletType | null = $state(null);
let mapInstance: LeafletType.Map | null = $state(null);
let tileLayer: LeafletType.TileLayer | null = $state(null);
let markersLayerGroup: LeafletType.LayerGroup | null = $state(null);
let geofenceLayerGroup: LeafletType.LayerGroup | null = $state(null);
let routeLayerGroup: LeafletType.LayerGroup | null = $state(null);
let techMarkers = new Map<string, LeafletType.Marker>();
let clientMarker: LeafletType.Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
let currentTheme = $state<'positron' | 'dark_matter' | 'osm'>('positron');

const CDMX_ZONES: Array<{ name: string; coords: [number, number]; zoom: number; alcaldia: string }> = [
  { name: 'Polanco', coords: [19.4338, -99.1912], zoom: 14, alcaldia: 'Miguel Hidalgo' },
  { name: 'Condesa / Roma', coords: [19.4147, -99.1678], zoom: 14, alcaldia: 'Cuauhtémoc' },
  { name: 'Del Valle', coords: [19.3804, -99.1648], zoom: 14, alcaldia: 'Benito Juárez' },
  { name: 'Coyoacán Centro', coords: [19.3498, -99.1617], zoom: 14, alcaldia: 'Coyoacán' },
  { name: 'Santa Fe', coords: [19.3598, -99.2612], zoom: 13, alcaldia: 'Cuajimalpa' },
  { name: 'Vista CDMX', coords: [19.4000, -99.1600], zoom: 12, alcaldia: 'Metropolitana' },
];

const TILE_SERVERS: Record<'positron' | 'dark_matter' | 'osm', { url: string; attribution: string; maxZoom: number }> = {
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> Positron',
    maxZoom: 19,
  },
  dark_matter: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> Dark Matter',
    maxZoom: 19,
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
};

function switchTheme(newTheme: 'positron' | 'dark_matter' | 'osm') {
  if (!mapInstance || !L) return;
  currentTheme = newTheme;
  const cfg = TILE_SERVERS[newTheme];

  if (tileLayer) {
    mapInstance.removeLayer(tileLayer);
  }

  tileLayer = L.tileLayer(cfg.url, {
    maxZoom: cfg.maxZoom,
    attribution: cfg.attribution,
    subdomains: 'abcd',
  }).addTo(mapInstance);
}

function flyToZone(coords: [number, number], targetZoom: number) {
  if (!mapInstance) return;
  mapInstance.flyTo(coords, targetZoom, { duration: 1.2, easeLinearity: 0.25 });
}

function fitAllBounds() {
  if (!mapInstance || !L) return;
  const group = L.featureGroup();

  for (const tech of technicians) {
    group.addLayer(L.marker(tech.coords));
  }
  if (clientDestination) {
    group.addLayer(L.marker(clientDestination.coords));
  }

  const bounds = group.getBounds();
  if (bounds.isValid()) {
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

function updateMarkers() {
  if (!mapInstance || !L) return;
  if (!markersLayerGroup) markersLayerGroup = L.layerGroup().addTo(mapInstance);

  // 1. Fluid Client Destination Marker
  if (clientDestination) {
    if (clientMarker) {
      clientMarker.setLatLng(clientDestination.coords);
    } else {
      const destIcon = createClientDestinationDivIcon(L, clientDestination);
      clientMarker = L.marker(clientDestination.coords, { icon: destIcon });
      clientMarker.bindPopup(`
        <div class="p-2 space-y-1 text-xs">
          <span class="badge badge-error badge-xs font-bold text-white">Domicilio de Servicio</span>
          <h4 class="font-bold text-sm text-base-content mt-0.5">${clientDestination.name}</h4>
          <p class="text-base-content/70">${clientDestination.address}</p>
        </div>
      `);
      clientMarker.addTo(markersLayerGroup);
    }
  } else if (clientMarker) {
    markersLayerGroup.removeLayer(clientMarker);
    clientMarker = null;
  }

  // 2. Fluid Technician Markers with setLatLng
  const currentTechIds = new Set(technicians.map((t) => t.id));

  for (const tech of technicians) {
    const isSelected = tech.id === selectedTechnicianId;
    const isMoving =
      (traveledRoute !== null || remainingRoute !== null || technicianHeading !== 0) &&
      (isSelected || technicians.length === 1);
    const icon = isMoving
      ? createMovingTechnicianDivIcon(L, tech, technicianHeading, isInsideGeofence)
      : createTechnicianDivIcon(L, tech, isSelected);

    const existingMarker = techMarkers.get(tech.id);
    if (existingMarker) {
      existingMarker.setLatLng(tech.coords);
      existingMarker.setIcon(icon);
      existingMarker.setZIndexOffset(isSelected ? 1000 : 0);
    } else {
      const marker = L.marker(tech.coords, {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      });
      marker.on('click', () => {
        onTechnicianClick?.(tech.id);
      });
      marker.bindPopup(`
        <div class="p-2.5 space-y-2 min-w-[200px]">
          <div class="flex items-center justify-between border-b border-base-300 pb-1.5">
            <span class="badge badge-primary badge-xs font-bold text-primary-content uppercase">${tech.trade}</span>
            <span class="font-bold text-warning text-xs">★ ${tech.rating?.toFixed(1) ?? '4.9'}</span>
          </div>
          <h4 class="font-black text-sm text-base-content">${tech.name}</h4>
          <div class="flex items-center justify-between text-xs font-mono text-base-content/70">
            <span>Tiempo estimado:</span>
            <span class="font-bold text-primary">~${tech.etaMin ?? 15} min</span>
          </div>
          <div class="pt-1">
            <span class="badge ${tech.status === 'in_transit' ? 'badge-info' : tech.status === 'on_site' ? 'badge-success' : 'badge-ghost'} badge-xs font-bold">
              ${tech.status === 'in_transit' ? 'En Camino 🏍️' : tech.status === 'on_site' ? 'En Domicilio 🔧' : 'Disponible 🟢'}
            </span>
          </div>
        </div>
      `);
      marker.addTo(markersLayerGroup);
      techMarkers.set(tech.id, marker);
    }
  }

  // Remove stale markers
  for (const [id, marker] of techMarkers.entries()) {
    if (!currentTechIds.has(id)) {
      markersLayerGroup.removeLayer(marker);
      techMarkers.delete(id);
    }
  }
}

function updateAllLayers() {
  if (!mapInstance || !L) return;

  if (!geofenceLayerGroup) geofenceLayerGroup = L.layerGroup().addTo(mapInstance);
  renderGeofenceLayer(L, geofenceLayerGroup, clientDestination, isInsideGeofence);

  if (!routeLayerGroup) routeLayerGroup = L.layerGroup().addTo(mapInstance);
  if (traveledRoute && remainingRoute) {
    renderTrimmedRoutePolylines(L, routeLayerGroup, traveledRoute, remainingRoute);
  } else {
    const activeTech = selectedTechnicianId
      ? technicians.find((t) => t.id === selectedTechnicianId)
      : technicians[0];
    renderRoutePolyline(L, routeLayerGroup, activeRoute, clientDestination, activeTech?.coords ?? null);
  }

  updateMarkers();
}

onMount(async () => {
  if (typeof window === 'undefined' || !mapContainer) return;

  try {
    const leafletModule = await import('leaflet');
    L = leafletModule.default || leafletModule;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    mapInstance = L.map(mapContainer, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

    const initialConfig = TILE_SERVERS[currentTheme];
    tileLayer = L.tileLayer(initialConfig.url, {
      maxZoom: initialConfig.maxZoom,
      attribution: initialConfig.attribution,
      subdomains: 'abcd',
    }).addTo(mapInstance);

    mapInstance.on('click', (e) => {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    updateAllLayers();

    resizeObserver = new ResizeObserver(() => {
      mapInstance?.invalidateSize();
    });
    resizeObserver.observe(mapContainer);
  } catch (err) {
    console.error('Failed to initialize Leaflet Map:', err);
  }
});

$effect(() => {
  if (mapInstance && L) {
    updateAllLayers();
  }
});

$effect(() => {
  if (selectedTechnicianId && mapInstance && L) {
    const sel = technicians.find((t) => t.id === selectedTechnicianId);
    if (sel) {
      mapInstance.panTo(sel.coords, { animate: true, duration: 0.8 });
    }
  }
});

onDestroy(() => {
  resizeObserver?.disconnect();
  techMarkers.clear();
  clientMarker = null;
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<div class="relative w-full rounded-3xl overflow-hidden border border-base-300 shadow-md bg-base-200">
  <!-- 1. The Map DOM Canvas (Requires explicit height per Invariant 7) -->
  <div bind:this={mapContainer} class="w-full {heightClass} z-0"></div>

  <!-- 2. Overlay Tactical HUD Controls -->
  {#if showControls}
    <!-- Top-Left CDMX Quick Zone Switcher -->
    <div class="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-120px)]">
      {#each CDMX_ZONES as zone}
        <button
          type="button"
          class="btn btn-xs rounded-xl bg-base-100/90 hover:bg-base-100 backdrop-blur-md border border-base-300 text-base-content font-bold shadow-sm transition-all"
          onclick={() => flyToZone(zone.coords, zone.zoom)}
        >
          📍 {zone.name}
        </button>
      {/each}
    </div>

    <!-- Top-Right Theme & Fit Actions -->
    <div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">
      <button
        type="button"
        class="btn btn-xs rounded-xl bg-base-100/90 hover:bg-base-100 backdrop-blur-md border border-base-300 text-base-content font-bold shadow-sm"
        title="Centrar todos los técnicos"
        onclick={fitAllBounds}
      >
        🎯 Centrar
      </button>

      <div class="dropdown dropdown-end">
        <button
          tabindex="0"
          type="button"
          class="btn btn-xs rounded-xl bg-base-100/90 hover:bg-base-100 backdrop-blur-md border border-base-300 text-base-content font-bold shadow-sm"
        >
          🗺️ Capas
        </button>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <ul tabindex="0" class="dropdown-content menu p-2 shadow-2xl bg-base-100 rounded-2xl w-44 text-xs font-bold border border-base-300 z-50 mt-1">
          <li>
            <button type="button" class="{currentTheme === 'positron' ? 'active font-black' : ''}" onclick={() => switchTheme('positron')}>
              ☀️ Positron (Claro)
            </button>
          </li>
          <li>
            <button type="button" class="{currentTheme === 'dark_matter' ? 'active font-black' : ''}" onclick={() => switchTheme('dark_matter')}>
              🌙 Dark Matter (Oscuro)
            </button>
          </li>
          <li>
            <button type="button" class="{currentTheme === 'osm' ? 'active font-black' : ''}" onclick={() => switchTheme('osm')}>
              🧭 OpenStreetMap
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom-Left Telemetry Legend -->
    <div class="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-base-100/90 backdrop-blur-md border border-base-300 text-[11px] font-mono shadow-sm pointer-events-none">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <strong class="text-base-content font-bold">{technicians.length}</strong> técnicos
      </span>
      <span class="text-base-content/40">•</span>
      <span class="text-base-content/70">Geocerca: <strong>150m</strong></span>
    </div>
  {/if}
</div>

<style>
  :global(.leaflet-container .yessyfy-technician-pin),
  :global(.leaflet-container .yessyfy-destination-pin) {
    background: transparent;
    border: none;
  }
  :global(.leaflet-container .leaflet-popup-content-wrapper) {
    border-radius: 1.25rem;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    padding: 0.25rem;
  }
  :global(.leaflet-container .leaflet-popup-tip) {
    background: white;
  }
</style>



