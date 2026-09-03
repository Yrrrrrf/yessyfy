export interface ContentFilterResult {
	sanitizedText: string;
	intercepted: boolean;
	violations: string[];
}

// Standard email address pattern
const EMAIL_TEST_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EMAIL_REPLACE_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Mexican 18-digit CLABE bank interbank transfer accounts
const CLABE_TEST_REGEX = /\b\d{18}\b/;
const CLABE_REPLACE_REGEX = /\b\d{18}\b/g;

// Mexican phone numbers
const PHONE_REPLACE_REGEX =
	/(?:(?:\+?52\s*)?(?:\(?\d{2,3}\)?[\s.-]*)?\d{3,4}[\s.-]*\d{4})/g;

// Direct platform circumvention keywords in Mexican Spanish (stateless patterns)
const CIRCUMVENTION_PATTERNS: { test: RegExp; replace: RegExp }[] = [
	{ test: /\b(?:por\s+fuera)\b/i, replace: /\b(?:por\s+fuera)\b/gi },
	{
		test: /\b(?:dep[oó]sito\s+directo)\b/i,
		replace: /\b(?:dep[oó]sito\s+directo)\b/gi,
	},
	{
		test: /\b(?:transferencia\s+directa)\b/i,
		replace: /\b(?:transferencia\s+directa)\b/gi,
	},
	{
		test: /\b(?:efectivo\s+(?:directo|sin\s+app))\b/i,
		replace: /\b(?:efectivo\s+(?:directo|sin\s+app))\b/gi,
	},
	{ test: /\b(?:te\s+deposito)\b/i, replace: /\b(?:te\s+deposito)\b/gi },
	{ test: /\b(?:sin\s+app)\b/i, replace: /\b(?:sin\s+app)\b/gi },
	{
		test: /\b(?:mi\s+cel(?:ular)?)\b/i,
		replace: /\b(?:mi\s+cel(?:ular)?)\b/gi,
	},
	{
		test: /\b(?:mi\s+whats(?:app)?)\b/i,
		replace: /\b(?:mi\s+whats(?:app)?)\b/gi,
	},
	{ test: /\b(?:mi\s+n[uú]mero)\b/i, replace: /\b(?:mi\s+n[uú]mero)\b/gi },
	{
		test: /\b(?:h[aá]blame\s+directo)\b/i,
		replace: /\b(?:h[aá]blame\s+directo)\b/gi,
	},
	{
		test: /\b(?:sin\s+comisi[oó]n)\b/i,
		replace: /\b(?:sin\s+comisi[oó]n)\b/gi,
	},
	{
		test: /\b(?:te\s+cobro\s+menos\s+en\s+persona)\b/i,
		replace: /\b(?:te\s+cobro\s+menos\s+en\s+persona)\b/gi,
	},
];

/**
 * Screens chat and job descriptions to prevent disintermediation while preserving
 * technical part descriptions, pipe diameters, and serial codes.
 */
export function filterAntiDisintermediation(
	rawText: string,
): ContentFilterResult {
	const violations: string[] = [];
	let sanitized = rawText;

	// 1. Screen Email addresses
	if (EMAIL_TEST_REGEX.test(sanitized)) {
		violations.push("DIRECCION_EMAIL_DETECTADA");
		sanitized = sanitized.replace(
			EMAIL_REPLACE_REGEX,
			"[CONTACTO PROTEGIDO POR YESSYFY]",
		);
	}

	// 2. Screen CLABE numbers
	if (CLABE_TEST_REGEX.test(sanitized)) {
		violations.push("CLABE_BANCARIA_DETECTADA");
		sanitized = sanitized.replace(CLABE_REPLACE_REGEX, "[CLABE PROTEGIDA]");
	}

	// 3. Screen Mexican Phone Numbers (only matching continuous digits >= 10)
	const phoneMatches = sanitized.match(PHONE_REPLACE_REGEX);
	if (phoneMatches) {
		for (const match of phoneMatches) {
			const digitsOnly = match.replace(/\D/g, "");
			if (digitsOnly.length >= 10) {
				violations.push("TELEFONO_EXTERNO_DETECTADO");
				sanitized = sanitized.replace(match, "[NUMERO PROTEGIDO]");
			}
		}
	}

	// 4. Screen circumvention intent keywords
	for (const pattern of CIRCUMVENTION_PATTERNS) {
		if (pattern.test.test(sanitized)) {
			violations.push("INTENTO_DESINTERMEDIACION_DETECTADO");
			sanitized = sanitized.replace(pattern.replace, "[MENSAJE MODERADO]");
		}
	}

	return {
		sanitizedText: sanitized,
		intercepted: violations.length > 0,
		violations,
	};
}
