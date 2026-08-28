import type { Coordinates } from "./item.ts";
import type { User } from "./user.ts";

export type TradeCategory =
	| "plomeria"
	| "electricidad"
	| "cerrajeria"
	| "jardineria"
	| "mantenimiento_hogar"
	| "albanileria";

export type KycStatus = "unsubmitted" | "submitted" | "verified" | "rejected";
export type OperationalState =
	| "offline"
	| "idle"
	| "dispatched"
	| "on_job"
	| "suspended";

export interface KycDocuments {
	ineFrontUrl?: string;
	ineBackUrl?: string;
	selfieUrl?: string;
	proofAddressUrl?: string;
	taxSituationUrl?: string;
}

export interface TechnicianRecord {
	id: string;
	userId: string;
	user?: User;
	trades: TradeCategory[];
	kycStatus: KycStatus;
	kycDocuments: KycDocuments;
	clabe?: string;
	operationalState: OperationalState;
	currentLocation?: Coordinates;
	ratingAvg: number;
	jobsCompleted: number;
	cancellationRate: number;
	updatedAt: string;
}
