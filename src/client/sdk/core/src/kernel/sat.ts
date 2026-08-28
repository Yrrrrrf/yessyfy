import type { LocationType, UrgencyLevel } from "../entities/jobOrder.ts";
import {
	addCentavos,
	type Centavos,
	multiplyCentavos,
	percentageCentavos,
	subtractCentavos,
	toCentavos,
} from "./currency.ts";

export interface PricingModifiers {
	locationType: LocationType;
	urgency: UrgencyLevel;
}

export interface JobFinancialBreakdown {
	baseBudgetCents: Centavos;
	supplementalCents: Centavos;
	totalCustomerCents: Centavos;
	platformFeeCents: Centavos;
	gatewayFeeCents: Centavos;
	collaboratorGrossCents: Centavos;
	isrWithheldCents: Centavos;
	ivaWithheldCents: Centavos;
	totalWithholdingsCents: Centavos;
	collaboratorNetCents: Centavos;
	platformContributionCents: Centavos;
}

export const URGENCY_MULTIPLIERS: Record<UrgencyLevel, number> = {
	normal: 1.0,
	mismo_dia: 1.3,
	emergencia_24_7: 1.8,
};

export const LOCATION_MULTIPLIERS: Record<LocationType, number> = {
	residencial: 1.0,
	comercial: 1.2,
	premium: 1.5,
};

/**
 * Calculates the comprehensive financial breakdown of a Yessyfy service order
 * with cent-exact integer arithmetic under Mexican SAT regulations.
 */
export function calculateJobPricing(
	basePriceCents: number,
	modifiers: PricingModifiers,
	options?: {
		supplementalCents?: number;
		hasRfc?: boolean;
		platformFeePercent?: number;
	},
): JobFinancialBreakdown {
	const urgencyFactor = URGENCY_MULTIPLIERS[modifiers.urgency] ?? 1.0;
	const locationFactor = LOCATION_MULTIPLIERS[modifiers.locationType] ?? 1.0;
	const combinedFactor = urgencyFactor * locationFactor;

	const baseBudgetCents = multiplyCentavos(basePriceCents, combinedFactor);
	const supplementalCents = toCentavos((options?.supplementalCents ?? 0) / 100);
	const totalCustomerCents = addCentavos(baseBudgetCents, supplementalCents);

	const platformFeePercent = options?.platformFeePercent ?? 15; // Standard 15% take-rate
	const platformFeeCents = percentageCentavos(
		totalCustomerCents,
		platformFeePercent,
	);

	// Payment gateway fee: 3% + $3.00 MXN (300 cents) + 16% IVA
	const gatewayVariableCents = percentageCentavos(totalCustomerCents, 3);
	const gatewayFixedCents = toCentavos(3.0);
	const gatewayPreTax = addCentavos(gatewayVariableCents, gatewayFixedCents);
	const gatewayFeeCents = multiplyCentavos(gatewayPreTax, 1.16);

	// Subtotal without 16% IVA
	const subtotalCents = Math.round(totalCustomerCents / 1.16);
	const ivaInTicketCents = subtractCentavos(totalCustomerCents, subtotalCents);

	// SAT Withholdings (LISR 113-A and LIVA 18-J)
	const hasRfc = options?.hasRfc ?? true;
	const isrPercent = hasRfc ? 2.1 : 20.0;
	const ivaRetentionRate = hasRfc ? 0.5 : 1.0; // 50% of IVA or 100% of IVA

	const isrWithheldCents = percentageCentavos(subtotalCents, isrPercent);
	const ivaWithheldCents = multiplyCentavos(ivaInTicketCents, ivaRetentionRate);
	const totalWithholdingsCents = addCentavos(
		isrWithheldCents,
		ivaWithheldCents,
	);

	const collaboratorGrossCents = subtractCentavos(
		totalCustomerCents,
		platformFeeCents,
	);
	const collaboratorNetCents = subtractCentavos(
		collaboratorGrossCents,
		totalWithholdingsCents,
	);
	const platformContributionCents = subtractCentavos(
		platformFeeCents,
		gatewayFeeCents,
	);

	return {
		baseBudgetCents,
		supplementalCents,
		totalCustomerCents,
		platformFeeCents,
		gatewayFeeCents,
		collaboratorGrossCents,
		isrWithheldCents,
		ivaWithheldCents,
		totalWithholdingsCents,
		collaboratorNetCents,
		platformContributionCents,
	};
}
