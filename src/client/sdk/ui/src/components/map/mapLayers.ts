import type * as LeafletType from "leaflet";
import {
	createClientDestinationDivIcon,
	createTechnicianDivIcon,
} from "./mapIcons.ts";
import type { ClientDestination, TechnicianPin } from "./mapTypes.ts";

export function renderGeofenceLayer(
	leaflet: typeof LeafletType,
	layerGroup: LeafletType.LayerGroup,
	dest: ClientDestination | null,
) {
	layerGroup.clearLayers();
	if (!dest) return;

	const radiusMeters = dest.geofenceRadiusMeters ?? 150;
	const circle = leaflet.circle(dest.coords, {
		radius: radiusMeters,
		color: "#00C97A",
		fillColor: "#00C97A",
		fillOpacity: 0.12,
		weight: 2,
		dashArray: "6, 6",
	});
	circle.bindTooltip(`Geocerca de Arribo (${radiusMeters}m)`, {
		permanent: false,
		direction: "top",
	});
	layerGroup.addLayer(circle);
}

export function renderRoutePolyline(
	leaflet: typeof LeafletType,
	layerGroup: LeafletType.LayerGroup,
	activeRoute: Array<[number, number]> | null,
	clientDestination: ClientDestination | null,
	activeTechCoords: [number, number] | null,
) {
	layerGroup.clearLayers();

	if (activeRoute && activeRoute.length > 1) {
		const routeLine = leaflet.polyline(activeRoute, {
			color: "#00C97A",
			weight: 4,
			dashArray: "8, 8",
			lineCap: "round",
			lineJoin: "round",
			opacity: 0.85,
		});
		layerGroup.addLayer(routeLine);
	} else if (clientDestination && activeTechCoords) {
		const line = leaflet.polyline(
			[activeTechCoords, clientDestination.coords],
			{
				color: "#1AB8CC",
				weight: 3,
				dashArray: "6, 8",
				opacity: 0.75,
			},
		);
		layerGroup.addLayer(line);
	}
}

export function renderTechnicianAndClientMarkers(
	leaflet: typeof LeafletType,
	layerGroup: LeafletType.LayerGroup,
	technicians: TechnicianPin[],
	clientDestination: ClientDestination | null,
	selectedTechnicianId: string | null,
	onTechnicianClick?: (techId: string) => void,
) {
	layerGroup.clearLayers();

	if (clientDestination) {
		const destIcon = createClientDestinationDivIcon(leaflet, clientDestination);
		const destMarker = leaflet.marker(clientDestination.coords, {
			icon: destIcon,
		});
		destMarker.bindPopup(`
      <div class="p-2 space-y-1 text-xs">
        <span class="badge badge-error badge-xs font-bold text-white">Domicilio de Servicio</span>
        <h4 class="font-bold text-sm text-base-content mt-0.5">${clientDestination.name}</h4>
        <p class="text-base-content/70">${clientDestination.address}</p>
      </div>
    `);
		layerGroup.addLayer(destMarker);
	}

	for (const tech of technicians) {
		const isSelected = tech.id === selectedTechnicianId;
		const icon = createTechnicianDivIcon(leaflet, tech, isSelected);
		const marker = leaflet.marker(tech.coords, {
			icon,
			zIndexOffset: isSelected ? 1000 : 0,
		});

		marker.on("click", () => {
			onTechnicianClick?.(tech.id);
		});

		marker.bindPopup(`
      <div class="p-2.5 space-y-2 min-w-[200px]">
        <div class="flex items-center justify-between border-b border-base-300 pb-1.5">
          <span class="badge badge-primary badge-xs font-bold text-primary-content uppercase">${tech.trade}</span>
          <span class="font-bold text-warning text-xs">★ ${tech.rating?.toFixed(1) ?? "4.9"}</span>
        </div>
        <h4 class="font-black text-sm text-base-content">${tech.name}</h4>
        <div class="flex items-center justify-between text-xs font-mono text-base-content/70">
          <span>Tiempo estimado:</span>
          <span class="font-bold text-primary">~${tech.etaMin ?? 15} min</span>
        </div>
        <div class="pt-1">
          <span class="badge ${tech.status === "in_transit" ? "badge-info" : tech.status === "on_site" ? "badge-success" : "badge-ghost"} badge-xs font-bold">
            ${tech.status === "in_transit" ? "En Camino 🏍️" : tech.status === "on_site" ? "En Domicilio 🔧" : "Disponible 🟢"}
          </span>
        </div>
      </div>
    `);

		layerGroup.addLayer(marker);
	}
}
