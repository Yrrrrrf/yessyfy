import { assertEquals } from "jsr:@std/assert@1";
import { filterAntiDisintermediation } from "./antiDisintermediation.ts";

Deno.test("AntiDisintermediation: masks phone numbers, emails and bank CLABEs", () => {
	const input =
		"Escríbeme a mi cel 55 4198 2301 o a roberto@gmail.com o transfiere a 012180001234567890";
	const result = filterAntiDisintermediation(input);

	assertEquals(result.intercepted, true);
	assertEquals(result.sanitizedText.includes("[NUMERO PROTEGIDO]"), true);
	assertEquals(
		result.sanitizedText.includes("[CONTACTO PROTEGIDO POR YESSYFY]"),
		true,
	);
	assertEquals(result.sanitizedText.includes("[CLABE PROTEGIDA]"), true);
	assertEquals(result.violations.length >= 3, true);
});

Deno.test("AntiDisintermediation: masks explicit off-platform negotiation attempts", () => {
	const input =
		"Te sale más barato si arreglamos por fuera con depósito directo";
	const result = filterAntiDisintermediation(input);

	assertEquals(result.intercepted, true);
	assertEquals(result.sanitizedText.includes("[MENSAJE MODERADO]"), true);
});

Deno.test("AntiDisintermediation: preserves legitimate trade part numbers and dimensions", () => {
	const technicalText =
		"Instalación de tubo de cobre de 1/2 pulgada, 3 metros de cable THW calibre 12 y pastilla Square D de 20A modelo QO120.";
	const result = filterAntiDisintermediation(technicalText);

	assertEquals(result.intercepted, false);
	assertEquals(result.sanitizedText, technicalText);
	assertEquals(result.violations.length, 0);
});

Deno.test("AntiDisintermediation: reliably intercepts 10 consecutive circumvention executions without lastIndex drift", () => {
	const attempts = [
		"Hablamos por fuera para evitar la comisión",
		"Pásame tu cel 5512345678",
		"Te hago transferencia directa",
		"Depósito directo a mi cuenta",
		"Sin app es más rápido",
		"Mi whats es 5599887766",
		"Hablamos por fuera",
		"Pásame tu cel 5512345678",
		"Te hago transferencia directa",
		"Depósito directo a mi cuenta",
	];

	for (let i = 0; i < attempts.length; i++) {
		const res = filterAntiDisintermediation(attempts[i]);
		assertEquals(
			res.intercepted,
			true,
			`Failed on iteration ${i}: ${attempts[i]}`,
		);
	}
});
