import type * as LeafletType from "leaflet";
import { TRADE_META_REGISTRY, type TradeVisualMeta } from "../../types.ts";
import type { ClientDestination, TechnicianPin } from "./mapTypes.ts";

export function createTechnicianDivIcon(
	leaflet: typeof LeafletType,
	tech: TechnicianPin,
	isSelected: boolean,
) {
	const registry = TRADE_META_REGISTRY as Record<string, TradeVisualMeta>;
	const tradeMeta = registry[tech.trade] ?? { emoji: "🔧", name: "Técnico" };
	const vehicleEmoji =
		tech.vehicle === "moto" ? "🏍️" : tech.vehicle === "auto" ? "🚗" : "🚲";
	const isOnline =
		tech.status === "in_transit" ||
		tech.status === "available" ||
		tech.status === "on_site";

	const html = `
    <div class="relative group cursor-pointer select-none transition-transform duration-200 ${isSelected ? "scale-125 z-50" : "hover:scale-110"}">
      ${isOnline ? '<div class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></div>' : ""}
      <div class="relative flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-base-100/95 backdrop-blur-md border-2 ${isSelected ? "border-primary shadow-xl shadow-primary/30 ring-2 ring-primary/40" : "border-base-300 shadow-lg"} text-base-content text-xs font-bold">
        <span class="text-sm">${vehicleEmoji}</span>
        <span class="truncate max-w-[90px] text-[11px]">${tech.name.split(" ")[0]}</span>
        <span class="badge ${isSelected ? "badge-primary text-primary-content" : "badge-neutral"} badge-xs font-mono px-1 font-black">${tradeMeta.emoji}</span>
      </div>
      <div class="w-2.5 h-2.5 bg-base-100 border-r-2 border-b-2 ${isSelected ? "border-primary" : "border-base-300"} rotate-45 mx-auto -mt-1 shadow-sm"></div>
    </div>
  `;

	return leaflet.divIcon({
		className: "yessyfy-technician-pin",
		html,
		iconSize: [120, 42],
		iconAnchor: [60, 42],
		popupAnchor: [0, -44],
	});
}

export function createClientDestinationDivIcon(
	leaflet: typeof LeafletType,
	dest: ClientDestination,
) {
	const html = `
    <div class="relative flex flex-col items-center select-none animate-bounce duration-1000">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-error text-white font-bold text-xs shadow-xl border-2 border-white">
        <span>📍</span>
        <span class="truncate max-w-[110px] text-[11px]">${dest.name}</span>
      </div>
      <div class="w-3 h-3 bg-error rotate-45 -mt-1.5 border-r border-b border-white"></div>
    </div>
  `;

	return leaflet.divIcon({
		className: "yessyfy-destination-pin",
		html,
		iconSize: [140, 44],
		iconAnchor: [70, 44],
		popupAnchor: [0, -46],
	});
}
