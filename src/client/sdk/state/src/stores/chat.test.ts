import { describe, expect, it } from "vite-plus/test";
import { chatStore, registerChatSanitizer } from "./chat.svelte.ts";

// Register mock test sanitizer
registerChatSanitizer((text) => {
	const hasPhone = /\d{10}/.test(text);
	const hasCircumvention = /por\s+fuera/i.test(text);
	const intercepted = hasPhone || hasCircumvention;

	let sanitized = text;
	if (hasPhone) sanitized = sanitized.replace(/\d{10}/g, "[NUMERO PROTEGIDO]");
	if (hasCircumvention) {
		sanitized = sanitized.replace(/por\s+fuera/gi, "[MENSAJE MODERADO]");
	}

	return {
		sanitizedText: sanitized,
		intercepted,
		warning: intercepted
			? "🛡️ Aviso de Protección: Números de contacto y cuentas bancarias han sido enmascarados para proteger tu garantía Escrow de 30 días."
			: undefined,
	};
});

describe("chatStore Real-Time Messaging", () => {
	it("initializes with default seed conversations", () => {
		const msgs = chatStore.getMessages("YSF-2026-0881");
		expect(msgs.length).toBeGreaterThanOrEqual(2);
		expect(msgs[0].sender).toBe("collaborator");
		expect(msgs[1].sender).toBe("client");
	});

	it("sends clean message and stores it under orderCode", () => {
		const res = chatStore.sendMessage(
			"YSF-2026-0881",
			"client",
			"Mariana Garza",
			"El timbre ya funciona perfectamente, muchas gracias.",
		);

		expect(res.intercepted).toBe(false);
		expect(res.message.text).toBe(
			"El timbre ya funciona perfectamente, muchas gracias.",
		);
		expect(res.message.masked).toBe(false);

		const updated = chatStore.getMessages("YSF-2026-0881");
		expect(updated.some((m) => m.id === res.message.id)).toBe(true);
	});

	it("intercepts and masks contact information", () => {
		const res = chatStore.sendMessage(
			"YSF-2026-0881",
			"collaborator",
			"Roberto Morales",
			"Pásame tu cel 5541982301 para arreglar por fuera",
		);

		expect(res.intercepted).toBe(true);
		expect(res.message.masked).toBe(true);
		expect(res.message.text).toContain("[NUMERO PROTEGIDO]");
		expect(res.message.text).toContain("[MENSAJE MODERADO]");
		expect(res.warning).toBeDefined();
	});

	it("handles typing indicator lifecycle", () => {
		chatStore.broadcastTyping("YSF-2026-0881", "collaborator", "Roberto");
		const typing = chatStore.getTyping("YSF-2026-0881");
		expect(typing === null || typing.sender === "collaborator").toBe(true);
	});
});
