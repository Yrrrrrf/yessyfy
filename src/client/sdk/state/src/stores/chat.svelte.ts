import type { ChatMessage, ChatSenderRole } from "@sdk/core";

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

export interface TypingState {
	sender: ChatSenderRole;
	senderName: string;
	timestamp: number;
}

export type ChatSanitizer = (text: string) => {
	sanitizedText: string;
	intercepted: boolean;
	warning?: string;
};

let activeSanitizer: ChatSanitizer | null = null;

export function registerChatSanitizer(sanitizer: ChatSanitizer) {
	activeSanitizer = sanitizer;
}

function playNotificationChime(isIncoming: boolean) {
	if (typeof window === "undefined") return;
	try {
		const AudioCtx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		const ctx = new AudioCtx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		const freq1 = isIncoming ? 587.33 : 440;
		const freq2 = isIncoming ? 880 : 659.25;
		osc.frequency.setValueAtTime(freq1, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + 0.12);
		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.2);
	} catch (_) {}
}

class ChatStore {
	// Reactive dictionary of messages keyed by orderCode
	#messagesByOrder = $state<Record<string, ChatMessage[]>>({
		...DEFAULT_SEED_MESSAGES,
	});

	// Reactive typing indicator map
	#typingByOrder = $state<Record<string, TypingState | null>>({});

	#syncChannel: BroadcastChannel | null = null;
	#typingTimeouts: Map<string, number> = new Map();

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
					this.#handleIncomingSyncMessage(event.data);
				};
			}
		} catch (_) {}

		// 3. Fallback Storage Event listener for cross-tab sync
		try {
			window.addEventListener("storage", (event: StorageEvent) => {
				if (event.key === STORAGE_KEY && event.newValue) {
					try {
						const parsed = JSON.parse(event.newValue);
						this.#messagesByOrder = { ...DEFAULT_SEED_MESSAGES, ...parsed };
					} catch (_) {}
				}
			});
		} catch (_) {}
	}

	#handleIncomingSyncMessage(data: unknown) {
		if (!data || typeof data !== "object") return;
		const payload = data as Record<string, unknown>;

		if (payload.type === "SYNC_ALL" && payload.payload) {
			this.#messagesByOrder = payload.payload as Record<string, ChatMessage[]>;
		} else if (payload.type === "NEW_MESSAGE" && payload.message) {
			const msg = payload.message as ChatMessage;
			const currentList = this.#messagesByOrder[msg.orderCode] || [];
			if (!currentList.some((m) => m.id === msg.id)) {
				this.#messagesByOrder[msg.orderCode] = [...currentList, msg];
				playNotificationChime(true);
			}
		} else if (payload.type === "TYPING_STATUS") {
			const { orderCode, sender, senderName, isTyping } = payload as {
				orderCode: string;
				sender: ChatSenderRole;
				senderName: string;
				isTyping: boolean;
			};

			if (isTyping) {
				this.#typingByOrder[orderCode] = {
					sender,
					senderName,
					timestamp: Date.now(),
				};

				const existing = this.#typingTimeouts.get(orderCode);
				if (existing) clearTimeout(existing);

				const timer = setTimeout(() => {
					this.#typingByOrder[orderCode] = null;
				}, 3000) as unknown as number;
				this.#typingTimeouts.set(orderCode, timer);
			} else {
				this.#typingByOrder[orderCode] = null;
			}
		}
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

	getTyping(orderCode: string): TypingState | null {
		return this.#typingByOrder[orderCode] || null;
	}

	broadcastTyping(
		orderCode: string,
		sender: ChatSenderRole,
		senderName: string,
	) {
		if (typeof window === "undefined") return;

		try {
			if (this.#syncChannel) {
				this.#syncChannel.postMessage({
					type: "TYPING_STATUS",
					orderCode,
					sender,
					senderName,
					isTyping: true,
				});
			}
		} catch (_) {}
	}

	sendMessage(
		orderCode: string,
		sender: ChatSenderRole,
		senderName: string,
		rawText: string,
	): { message: ChatMessage; intercepted: boolean; warning?: string } {
		let sanitizedText = rawText;
		let intercepted = false;
		let warning: string | undefined;

		if (activeSanitizer) {
			const res = activeSanitizer(rawText);
			sanitizedText = res.sanitizedText;
			intercepted = res.intercepted;
			warning = res.warning;
		}

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
			text: sanitizedText,
			timestamp,
			masked: intercepted,
		};

		const currentList = this.#messagesByOrder[orderCode] || [];
		this.#messagesByOrder[orderCode] = [...currentList, newMsg];

		playNotificationChime(false);
		this.#persistAndBroadcast(newMsg);

		return {
			message: newMsg,
			intercepted,
			warning,
		};
	}

	clearOrderChat(orderCode: string) {
		delete this.#messagesByOrder[orderCode];
		this.#persistAndBroadcast();
	}
}

export const chatStore = new ChatStore();
