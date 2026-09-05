export type ToastPriority =
	| "info"
	| "success"
	| "warning"
	| "error"
	| "dispatch"
	| "chat";

export interface ToastAction {
	label: string;
	onClick?: () => void;
	href?: string;
	actionKey?: string;
}

export interface ToastNotification {
	id: string;
	priority: ToastPriority;
	title: string;
	description?: string;
	action?: ToastAction;
	duration: number; // in ms, 0 = persistent
	remainingTime: number; // in ms
	progress: number; // 0 to 100 percentage
	paused: boolean;
	sound: boolean;
	tickSound?: boolean;
	createdAt: number;
	sourceApp?: "web" | "colab" | "vision" | "system";
	meta?: Record<string, unknown>;
	dismissible: boolean;
}

export interface CreateToastOptions {
	priority?: ToastPriority;
	title: string;
	description?: string;
	action?: ToastAction;
	duration?: number;
	sound?: boolean;
	tickSound?: boolean;
	sourceApp?: "web" | "colab" | "vision" | "system";
	meta?: Record<string, unknown>;
	dismissible?: boolean;
	broadcast?: boolean;
}

const DEFAULT_DURATIONS: Record<ToastPriority, number> = {
	info: 4500,
	success: 4000,
	warning: 6000,
	error: 7000,
	dispatch: 8500, // Emergency dispatch has extended visibility
	chat: 5500,
};

const TOAST_CHANNEL_NAME = "yessyfy_toast_channel";
const STORAGE_SYNC_KEY = "yessyfy_toast_sync_v1";

export class ToastStore {
	#toasts = $state<ToastNotification[]>([]);
	#isMuted = $state<boolean>(false);
	#syncChannel: BroadcastChannel | null = null;
	#instanceId =
		typeof crypto !== "undefined" && crypto.randomUUID
			? crypto.randomUUID()
			: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	#tickerInterval: number | null = null;
	#lastTickTime = 0;
	#soundCallback: ((priority: ToastPriority) => void) | null = null;
	#tickCallback: (() => void) | null = null;

	constructor() {
		this.#initSync();
	}

	get toasts(): readonly ToastNotification[] {
		return this.#toasts;
	}

	get isMuted(): boolean {
		return this.#isMuted;
	}

	get activeCount(): number {
		return this.#toasts.length;
	}

	registerAudioDelegates(
		playChime: (priority: ToastPriority) => void,
		playTick: () => void,
	) {
		this.#soundCallback = playChime;
		this.#tickCallback = playTick;
	}

	setMuted(muted: boolean) {
		this.#isMuted = muted;
	}

	toggleMute(): boolean {
		this.#isMuted = !this.#isMuted;
		return this.#isMuted;
	}

	#initSync() {
		if (typeof window === "undefined") return;

		// 1. BroadcastChannel API
		try {
			if (typeof BroadcastChannel !== "undefined") {
				this.#syncChannel = new BroadcastChannel(TOAST_CHANNEL_NAME);
				this.#syncChannel.onmessage = (event: MessageEvent) => {
					this.#handleIncomingBroadcast(event.data);
				};
			}
		} catch (_) {}

		// 2. Storage event fallback for cross-tab sync
		try {
			window.addEventListener("storage", (event: StorageEvent) => {
				if (event.key === STORAGE_SYNC_KEY && event.newValue) {
					try {
						const payload = JSON.parse(event.newValue);
						this.#handleIncomingBroadcast(payload);
					} catch (_) {}
				}
			});
		} catch (_) {}
	}

	#handleIncomingBroadcast(data: unknown) {
		if (!data || typeof data !== "object") return;
		const msg = data as {
			type: string;
			originId: string;
			toast: CreateToastOptions & { id?: string };
		};

		if (msg.type === "TOAST_FIRE" && msg.originId !== this.#instanceId) {
			this.add({
				...msg.toast,
				broadcast: false, // Prevent infinite broadcast echo
			});
		}
	}

	#broadcastToast(toast: ToastNotification) {
		if (typeof window === "undefined") return;

		const payload = {
			type: "TOAST_FIRE",
			originId: this.#instanceId,
			toast: {
				priority: toast.priority,
				title: toast.title,
				description: toast.description,
				action: toast.action
					? {
							label: toast.action.label,
							actionKey: toast.action.actionKey,
							href: toast.action.href,
						}
					: undefined,
				duration: toast.duration,
				sound: toast.sound,
				tickSound: toast.tickSound,
				sourceApp: toast.sourceApp,
				meta: toast.meta,
				dismissible: toast.dismissible,
			},
		};

		try {
			this.#syncChannel?.postMessage(payload);
		} catch (_) {}

		try {
			localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(payload));
		} catch (_) {}
	}

	#startTicker() {
		if (this.#tickerInterval !== null || typeof window === "undefined") return;
		this.#lastTickTime = performance.now();

		this.#tickerInterval = window.setInterval(() => {
			const now = performance.now();
			const delta = now - this.#lastTickTime;
			this.#lastTickTime = now;

			let hasActiveTimers = false;
			const toDismiss: string[] = [];

			for (const toast of this.#toasts) {
				if (toast.duration <= 0) continue;
				if (toast.paused) continue;

				hasActiveTimers = true;
				const prevSeconds = Math.ceil(toast.remainingTime / 1000);
				toast.remainingTime = Math.max(0, toast.remainingTime - delta);
				toast.progress = Math.max(
					0,
					Math.min(100, (toast.remainingTime / toast.duration) * 100),
				);

				const currentSeconds = Math.ceil(toast.remainingTime / 1000);
				if (
					toast.tickSound &&
					currentSeconds !== prevSeconds &&
					currentSeconds > 0 &&
					currentSeconds <= 3
				) {
					if (!this.#isMuted && this.#tickCallback) {
						this.#tickCallback();
					}
				}

				if (toast.remainingTime <= 0) {
					toDismiss.push(toast.id);
				}
			}

			for (const id of toDismiss) {
				this.dismiss(id);
			}

			if (!hasActiveTimers && this.#toasts.length === 0) {
				this.#stopTicker();
			}
		}, 33); // ~30fps countdown for smooth UI progress
	}

	#stopTicker() {
		if (this.#tickerInterval !== null && typeof window !== "undefined") {
			clearInterval(this.#tickerInterval);
			this.#tickerInterval = null;
		}
	}

	add(options: CreateToastOptions): string {
		const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const priority = options.priority || "info";
		const duration =
			options.duration !== undefined
				? options.duration
				: DEFAULT_DURATIONS[priority];
		const sound = options.sound !== undefined ? options.sound : true;

		const notification: ToastNotification = {
			id,
			priority,
			title: options.title,
			description: options.description,
			action: options.action,
			duration,
			remainingTime: duration,
			progress: 100,
			paused: false,
			sound,
			tickSound:
				options.tickSound ??
				(priority === "dispatch" || priority === "warning"),
			createdAt: Date.now(),
			sourceApp: options.sourceApp,
			meta: options.meta,
			dismissible:
				options.dismissible !== undefined ? options.dismissible : true,
		};

		// Limit stack depth to 5 items max
		if (this.#toasts.length >= 5) {
			const dropIndex = this.#toasts.findIndex(
				(t) => t.priority !== "dispatch",
			);
			if (dropIndex !== -1) {
				this.#toasts.splice(dropIndex, 1);
			} else {
				this.#toasts.shift();
			}
		}

		this.#toasts.push(notification);

		if (sound && !this.#isMuted && this.#soundCallback) {
			this.#soundCallback(priority);
		}

		if (options.broadcast !== false) {
			this.#broadcastToast(notification);
		}

		if (duration > 0) {
			this.#startTicker();
		}

		return id;
	}

	dismiss(id: string) {
		const index = this.#toasts.findIndex((t) => t.id === id);
		if (index !== -1) {
			this.#toasts.splice(index, 1);
		}
		if (this.#toasts.length === 0) {
			this.#stopTicker();
		}
	}

	clear() {
		this.#toasts = [];
		this.#stopTicker();
	}

	pause(id: string) {
		const toast = this.#toasts.find((t) => t.id === id);
		if (toast) {
			toast.paused = true;
		}
	}

	resume(id: string) {
		const toast = this.#toasts.find((t) => t.id === id);
		if (toast) {
			toast.paused = false;
			this.#lastTickTime = performance.now();
			this.#startTicker();
		}
	}

	info(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({ ...options, priority: "info", title, description });
	}

	success(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({ ...options, priority: "success", title, description });
	}

	warning(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({ ...options, priority: "warning", title, description });
	}

	error(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({ ...options, priority: "error", title, description });
	}

	dispatchAlert(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({
			...options,
			priority: "dispatch",
			title,
			description,
			duration: options?.duration ?? DEFAULT_DURATIONS.dispatch,
			tickSound: options?.tickSound ?? true,
		});
	}

	chatAlert(
		title: string,
		description?: string,
		options?: Partial<CreateToastOptions>,
	): string {
		return this.add({
			...options,
			priority: "chat",
			title,
			description,
			duration: options?.duration ?? DEFAULT_DURATIONS.chat,
		});
	}
}

export const toastStore = new ToastStore();
