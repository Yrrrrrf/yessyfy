import { assertEquals } from "jsr:@std/assert@1";
import {
	addCentavos,
	formatMxn,
	fromCentavos,
	multiplyCentavos,
	percentageCentavos,
	subtractCentavos,
	toCentavos,
} from "./currency.ts";

Deno.test("Currency: toCentavos and fromCentavos precision", () => {
	assertEquals(toCentavos(800.0), 80000);
	assertEquals(toCentavos(123.45), 12345);
	assertEquals(toCentavos(0.1 + 0.2), 30); // Eliminates standard 0.30000000000000004 float drift
	assertEquals(fromCentavos(80000), 800.0);
	assertEquals(fromCentavos(12345), 123.45);
});

Deno.test("Currency: formatMxn formats properly", () => {
	const formatted = formatMxn(80000);
	// Contains $800.00
	assertEquals(formatted.includes("800.00"), true);
});

Deno.test("Currency: basic arithmetic operations", () => {
	assertEquals(addCentavos(1000, 2500), 3500);
	assertEquals(subtractCentavos(5000, 1250), 3750);
	assertEquals(multiplyCentavos(1000, 1.3), 1300);
	assertEquals(percentageCentavos(80000, 15), 12000);
});

Deno.test("Currency: zero rounding drift across 10,000 randomized transactions", () => {
	let runningBalance = 10000000; // 100,000.00 MXN initial balance

	for (let i = 0; i < 10000; i++) {
		// Generate pseudorandom amount between $10.00 and $2,000.00
		const rawPesos = ((i * 37.19) % 2000) + 10;
		const cents = toCentavos(rawPesos);

		// Guaranteed integer
		assertEquals(Number.isInteger(cents), true);

		// Add and subtract must cancel out identically with zero floating point decay
		const afterDeposit = addCentavos(runningBalance, cents);
		const afterWithdrawal = subtractCentavos(afterDeposit, cents);

		assertEquals(afterWithdrawal, runningBalance);
		runningBalance = afterWithdrawal;
	}
});
