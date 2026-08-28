/**
 * Branded integer type representing monetary values in Mexican Centavos.
 * Floating-point arithmetic on currency is strictly forbidden.
 */
export type Centavos = number & { readonly __brand: unique symbol };

/**
 * Converts a floating-point peso value to integer centavos.
 * Uses Math.round to eliminate binary IEEE-754 floating-point inaccuracies.
 */
export function toCentavos(pesos: number): Centavos {
	return Math.round(pesos * 100) as Centavos;
}

/**
 * Converts integer centavos to a floating-point peso representation for display.
 */
export function fromCentavos(cents: number): number {
	return cents / 100;
}

/**
 * Formats integer centavos as Mexican Pesos (MXN) currency string.
 */
export function formatMxn(cents: number): string {
	const pesos = fromCentavos(cents);
	return new Intl.NumberFormat("es-MX", {
		style: "currency",
		currency: "MXN",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(pesos);
}

/**
 * Pure integer addition of centavos.
 */
export function addCentavos(a: number, b: number): Centavos {
	return Math.round(a + b) as Centavos;
}

/**
 * Pure integer subtraction of centavos.
 */
export function subtractCentavos(a: number, b: number): Centavos {
	return Math.round(a - b) as Centavos;
}

/**
 * Multiplies centavos by a numeric multiplier, strictly rounding to nearest cent.
 */
export function multiplyCentavos(cents: number, factor: number): Centavos {
	return Math.round(cents * factor) as Centavos;
}

/**
 * Computes a percentage of centavos, strictly rounding to nearest cent.
 */
export function percentageCentavos(
	cents: number,
	percentage: number,
): Centavos {
	return Math.round((cents * percentage) / 100) as Centavos;
}
