import type { ChatMessage, ChatSenderRole } from "@sdk/core";
import { filterAntiDisintermediation } from "@sdk/api";

const DEFAULT_SEED_MESSAGES: Record<string, ChatMessage[]> = {
	"YSF-2026-0881": [
		{
			id: "m_init_01",
			orderCode: "YSF-2026-0881",
			sender: "collaborator",
			senderName: "Roberto Morales",
			text: "Hola Mariana, soy Roberto Morales de Yessyfy. Ya voy en camino en moto hacia tu domicilio en Polanco con la herramienta.",
			timestamp: "14:05",
			masked: false,
		},
		{
			id: "m_init_02",
			orderCode: "YSF-2026-0881",
			sender: "client",
			senderName: "Mariana Garza",
			text: "Hola Roberto. Perfecto, por favor al llegar con Don Pedro en caseta Torre B dile que vas al departamento 501.",
			timestamp: "14:07",
			masked: false,
		},
	],
	"YSF-2026-0102": [
		{
			id: "m_init_03",
			orderCode: "YSF-2026-0102",
			sender: "collaborator",
			senderName: "Ignacio Fuentes",
			text: "Buenas tardes, acabo de terminar el cambio de pastillas termomagnéticas y subí las fotos de evidencia al protocolo QA.",
			timestamp: "16:20",
			masked: false,
		},
		{
			id: "m_init_04",
			orderCode: "YSF-2026-0102",
			sender: "client",
			senderName: "Carlos Slim H.",
			text: "Excelente Ignacio, ya revisé que quedó funcionando la luz en toda la planta alta. Procedo a firmar la orden.",
			timestamp: "16:22",
			masked: false,
		},
	],
};

const STORAGE_KEY = "yessyfy_chat_store_v1";
const SYNC_CHANNEL_NAME = "yessyfy_chat_broadcast_v1";

class ChatStore {
	// Reactive dictionary of messages keyed by orderCode
	#messagesByOrder = $state<Record<string, ChatMessage[]>>({
		...DEFAULT_SEED_MESSAGES,
	});
	#syncChannel: BroadcastChannel | null = null;

	constructor() {
		this.#initializeStore();
	}

	#initializeStore() {
		if (typeof window === "undefined") return;

		// 1. Load from localStorage if present
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				this.#messagesByOrder = { ...DEFAULT_SEED_MESSAGES, ...parsed };
			}
		} catch (_) {}

		// 2. Setup BroadcastChannel for cross-tab real-time sync
		try {
			if (typeof BroadcastChannel !== "undefined") {
				this.#syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
				this.#syncChannel.onmessage = (event: MessageEvent) => {
					if (event.data?.type === "SYNC_ALL" && event.data?.payload) {
						this.#messagesByOrder = event.data.payload;
					} else if (
						event.data?.type === "NEW_MESSAGE" &&
						event.data?.message
					) {
						const msg: ChatMessage = event.data.message;
						const currentList = this.#messagesByOrder[msg.orderCode] || [];
						if (!currentList.some((m) => m.id === msg.id)) {
							this.#messagesByOrder[msg.orderCode] = [...currentList, msg];
						}
					}
				};
			}
		} catch (_) {}
	}

	#persistAndBroadcast(newMsg?: ChatMessage) {
		if (typeof window === "undefined") return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#messagesByOrder));
		} catch (_) {}

		try {
			if (this.#syncChannel) {
				if (newMsg) {
					this.#syncChannel.postMessage({
						type: "NEW_MESSAGE",
						message: newMsg,
					});
				} else {
					this.#syncChannel.postMessage({
						type: "SYNC_ALL",
						payload: this.#messagesByOrder,
					});
				}
			}
		} catch (_) {}
	}

	getMessages(orderCode: string): ChatMessage[] {
		return this.#messagesByOrder[orderCode] || [];
	}

	sendMessage(
		orderCode: string,
		sender: ChatSenderRole,
		senderName: string,
		rawText: string,
	): { message: ChatMessage; intercepted: boolean; warning?: string } {
		const filterResult = filterAntiDisintermediation(rawText);

		const now = new Date();
		const timestamp = now.toLocaleTimeString("es-MX", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const newMsg: ChatMessage = {
			id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			orderCode,
			sender,
			senderName,
			text: filterResult.sanitizedText,
			timestamp,
			masked: filterResult.intercepted,
		};

		const currentList = this.#messagesByOrder[orderCode] || [];
		this.#messagesByOrder[orderCode] = [...currentList, newMsg];

		this.#persistAndBroadcast(newMsg);

		return {
			message: newMsg,
			intercepted: filterResult.intercepted,
			warning: filterResult.intercepted
				? "🛡️ Aviso de Protección: Números de contacto y cuentas bancarias han sido enmascarados para proteger tu garantía Escrow de 30 días."
				: undefined,
		};
	}

	clearOrderChat(orderCode: string) {
		delete this.#messagesByOrder[orderCode];
		this.#persistAndBroadcast();
	}
}

export const chatStore = new ChatStore();
