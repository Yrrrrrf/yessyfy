import type { Coordinates } from "./item.ts";
import type { TradeCategory } from "./technician.ts";
import type { User } from "./user.ts";

export type ServiceCategory = TradeCategory;
export type LocationType = "residencial" | "comercial" | "premium";
export type UrgencyLevel = "normal" | "mismo_dia" | "emergencia_24_7";

export type JobOrderStatus =
	| "draft"
	| "pending_triage"
	| "dispatched"
	| "accepted"
	| "en_camino"
	| "in_progress"
	| "winding_down"
	| "pending_validation"
	| "validated"
	| "completed"
	| "disputed"
	| "cancelled";

export interface JobOrder {
	id: string;
	code: string; // YSF-YYYY-XXXXX
	customerId: string;
	customer?: User;
	collaboratorId?: string;
	collaborator?: User;
	category: ServiceCategory;
	locationType: LocationType;
	urgency: UrgencyLevel;
	status: JobOrderStatus;
	coordinates: Coordinates;
	addressText: string;
	postalCode: string;
	description: string;

	// Financial values in integer centavos (MXN)
	baseBudgetCents: number;
	supplementalCents: number;
	totalCustomerCents: number;
	platformFeeCents: number;
	collaboratorGrossCents: number;
	isrWithheldCents: number;
	ivaWithheldCents: number;
	collaboratorNetCents: number;

	createdAt: string;
	scheduledFor?: string;
	dispatchedAt?: string;
	arrivedAt?: string;
	completedAt?: string;
}
