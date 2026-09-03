import { assertEquals } from "jsr:@std/assert@1";
import { calculateJobPricing } from "./sat.ts";

Deno.test("SAT Tax Engine: baseline $800.00 MXN standard job", () => {
	const result = calculateJobPricing(80000, {
		locationType: "residencial",
		urgency: "normal",
	});

	assertEquals(result.baseBudgetCents, 80000);
	assertEquals(result.totalCustomerCents, 80000);
	assertEquals(result.platformFeeCents, 12000); // 15% take-rate ($120.00 MXN)
	assertEquals(result.gatewayFeeCents, 3132); // 3% + $3.00 MXN + 16% IVA = $31.32 MXN
	assertEquals(result.collaboratorGrossCents, 68000); // $680.00 MXN
	assertEquals(result.isrWithheldCents, 690); // 1.0% on subtotal = $6.90 MXN
	assertEquals(result.ivaWithheldCents, 5517); // 50% of IVA in ticket = $55.17 MXN
	assertEquals(result.totalWithholdingsCents, 6207); // $62.07 MXN
	assertEquals(result.collaboratorNetCents, 61793); // $617.93 MXN
	assertEquals(result.platformContributionCents, 8868); // $88.68 MXN
});

Deno.test("SAT Tax Engine: urgency multipliers (1.3x same day, 1.8x emergency)", () => {
	const sameDay = calculateJobPricing(50000, {
		locationType: "residencial",
		urgency: "mismo_dia",
	});
	assertEquals(sameDay.baseBudgetCents, 65000); // 50,000 * 1.3 = 65,000

	const emergency = calculateJobPricing(50000, {
		locationType: "residencial",
		urgency: "emergencia_24_7",
	});
	assertEquals(emergency.baseBudgetCents, 90000); // 50,000 * 1.8 = 90,000
});

Deno.test("SAT Tax Engine: withholding rates when collaborator has no RFC", () => {
	const withoutRfc = calculateJobPricing(
		80000,
		{
			locationType: "residencial",
			urgency: "normal",
		},
		{ hasRfc: false },
	);

	// Without RFC, LISR is 20% and LIVA retention is 100% (16%)
	assertEquals(withoutRfc.isrWithheldCents, 13793); // 20% on $689.66 subtotal
	assertEquals(withoutRfc.ivaWithheldCents, 11034); // 100% of IVA
	assertEquals(withoutRfc.totalWithholdingsCents, 24827); // $248.27 MXN withheld
});
