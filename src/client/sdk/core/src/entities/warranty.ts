export type WarrantyStatus =
	| "active"
	| "claimed"
	| "serviced"
	| "voided"
	| "expired";

export interface WarrantyCertificate {
	id: string;
	certificateNumber: string; // YSF-WAR-XXXXX
	jobOrderId: string;
	customerId: string;
	collaboratorId: string;
	validFrom: string;
	validUntil: string; // validFrom + 30 days
	status: WarrantyStatus;
	termsHash: string;
	createdAt: string;
}
