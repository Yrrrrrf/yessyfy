import type { ServiceCategory } from "@sdk/core";

export interface TradeVisualMeta {
	id: ServiceCategory;
	name: string;
	emoji: string;
	gradientClass: string;
	badgeClass: string;
}

export const TRADE_META_REGISTRY: Record<ServiceCategory, TradeVisualMeta> = {
	plomeria: {
		id: "plomeria",
		name: "Plomería",
		emoji: "🔧",
		gradientClass: "from-cyan-500 to-blue-600",
		badgeClass: "badge-info",
	},
	electricidad: {
		id: "electricidad",
		name: "Electricidad",
		emoji: "⚡",
		gradientClass: "from-amber-400 to-orange-500",
		badgeClass: "badge-warning",
	},
	cerrajeria: {
		id: "cerrajeria",
		name: "Cerrajería",
		emoji: "🔑",
		gradientClass: "from-emerald-400 to-teal-600",
		badgeClass: "badge-accent",
	},
	albanileria: {
		id: "albanileria",
		name: "Albañilería",
		emoji: "🧱",
		gradientClass: "from-orange-400 to-rose-600",
		badgeClass: "badge-error",
	},
	mantenimiento_hogar: {
		id: "mantenimiento_hogar",
		name: "Mantenimiento",
		emoji: "🏠",
		gradientClass: "from-blue-500 to-indigo-600",
		badgeClass: "badge-primary",
	},
	jardineria: {
		id: "jardineria",
		name: "Jardinería",
		emoji: "🌿",
		gradientClass: "from-green-500 to-emerald-700",
		badgeClass: "badge-success",
	},
};
