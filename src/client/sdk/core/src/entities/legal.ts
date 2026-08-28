import { toCentavos } from "../kernel/currency.ts";

export interface ContractorAgreement {
	id: string;
	collaboratorId: string;
	contractType: "comision_mercantil_mediacion_tecnologica";
	governingLaw: "codigo_de_comercio_mexicano_arts_273_308";
	acceptedAt: string;
	version: string;
	ipAddress?: string;
}

/**
 * Calculates the maximum enforceable liquidated damages under CCF Art. 1840
 * Formula: max(5 * GMV, $5,000.00 MXN) in integer centavos.
 */
export function calculateLiquidatedDamages(gmvCents: number): number {
	const minimumPenaltyCents = toCentavos(5000.0); // $5,000.00 MXN
	const gmvMultiplierCents = gmvCents * 5;
	return Math.max(minimumPenaltyCents, gmvMultiplierCents);
}
