import type { ServiceCategory } from "@sdk/core";

export interface TechnicianPin {
	id: string;
	name: string;
	trade: ServiceCategory | string;
	coords: [number, number]; // [lat, lng]
	status: "available" | "in_transit" | "on_site" | "offline";
	etaMin?: number;
	vehicle?: "moto" | "auto" | "bici";
	rating?: number;
}

export interface ClientDestination {
	name: string;
	address: string;
	coords: [number, number]; // [lat, lng]
	geofenceRadiusMeters?: number; // default 150m
}
