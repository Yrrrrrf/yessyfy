export interface ContentFilterResult {
	sanitizedText: string;
	intercepted: boolean;
	violations: string[];
}

// Mexican 10-digit phone numbers with various delimiters (+52, spaces, hyphens, parentheses)
const PHONE_REGEX =
	/(?:(?:\+?52\s*)?(?:\(?\d{2,3}\)?[\s.-]*)?\d{3,4}[\s.-]*\d{4})/g;

// Mexican 18-digit CLABE bank interbank transfer accounts
const CLABE_REGEX = /\b\d{18}\b/g;

// Standard email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Direct platform circumvention keywords in Mexican Spanish
const CIRCUMVENTION_PATTERNS = [
	/\b(?:por\s+fuera)\b/gi,
	/\b(?:dep[oó]sito\s+directo)\b/gi,
	/\b(?:efectivo\s+sin\s+app)\b/gi,
	/\b(?:mi\s+cel(?:ular)?)\b/gi,
	/\b(?:h[aá]blame\s+directo)\b/gi,
	/\b(?:sin\s+comisi[oó]n)\b/gi,
	/\b(?:te\s+cobro\s+menos\s+en\s+persona)\b/gi,
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
	if (EMAIL_REGEX.test(sanitized)) {
		violations.push("DIRECCION_EMAIL_DETECTADA");
		sanitized = sanitized.replace(
			EMAIL_REGEX,
			"[CONTACTO PROTEGIDO POR YESSYFY]",
		);
	}

	// 2. Screen CLABE numbers
	if (CLABE_REGEX.test(sanitized)) {
		violations.push("CLABE_BANCARIA_DETECTADA");
		sanitized = sanitized.replace(CLABE_REGEX, "[CLABE PROTEGIDA]");
	}

	// 3. Screen Mexican Phone Numbers (only matching continuous digits >= 10)
	const phoneMatches = sanitized.match(PHONE_REGEX);
	if (phoneMatches) {
		for (const match of phoneMatches) {
			// Exclude trivial small numbers like "1/2", "3/4" or standard part codes
			const digitsOnly = match.replace(/\D/g, "");
			if (digitsOnly.length >= 10) {
				violations.push("TELEFONO_EXTERNO_DETECTADO");
				sanitized = sanitized.replace(match, "[NUMERO PROTEGIDO]");
			}
		}
	}

	// 4. Screen circumvention intent keywords
	for (const pattern of CIRCUMVENTION_PATTERNS) {
		if (pattern.test(sanitized)) {
			violations.push("INTENTO_DESINTERMEDIACION_DETECTADO");
			sanitized = sanitized.replace(pattern, "[MENSAJE MODERADO]");
		}
	}

	return {
		sanitizedText: sanitized,
		intercepted: violations.length > 0,
		violations,
	};
}
