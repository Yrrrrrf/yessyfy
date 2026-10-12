import {
	ClientError,
	CONTRACT_VERSION,
	type Booking,
	type Case,
	type ClientPort,
	type Collaborator,
	type Command,
	type Document,
	type Inputs,
	type Manifest,
	type Message,
	type Notice,
	type Offer,
	type Operation,
	type Order,
	type Page,
	type Payout,
	type Profile,
	type Quote,
	type Results,
	type Service,
	type Warranty,
} from "../../../core/src/product/contracts.ts";
import {
	browserStorage,
	photoPersistence,
	type KeyStorage,
	type PendingPhoto,
	type PhotoPersistence,
} from "./persistence.ts";
export type CommandState =
	| "idle"
	| "pending"
	| "confirmed"
	| "uncertain"
	| "conflict"
	| "failed";
export interface Intent {
	operation: Operation;
	command: Command;
	owner: string;
	channel: string;
}
export function blankBooking(): Booking {
	return {
		service_id: "",
		mode: "fixed",
		category: "",
		location_type: "residencial",
		urgency: "normal",
		description: "",
		address: {
			label: "Home",
			street: "",
			city: "",
			postal_code: "",
			access: "",
		},
		date: "",
		slot: "",
		timezone: "America/Mexico_City",
	};
}
export class Runtime {
	user = $state<Profile | null>(null);
	ready = $state(false);
	busy = $state(false);
	error = $state<string | null>(null);
	manifest = $state<Manifest | null>(null);
	services = $state<Service[]>([]);
	collaborators = $state<Collaborator[]>([]);
	rows = $state<Page<Order>>({
		items: [],
		page: 1,
		limit: 12,
		total: 0,
		has_more: false,
	});
	orders = $state<Record<string, Order>>({});
	offers = $state<Offer[]>([]);
	notices = $state<Notice[]>([]);
	cases = $state<Case[]>([]);
	warranties = $state<Warranty[]>([]);
	documents = $state<Record<string, Document[]>>({});
	payouts = $state<Payout[]>([]);
	profiles = $state<Profile[]>([]);
	messages = $state<Record<string, Message[]>>({});
	photos = $state<PendingPhoto[]>([]);
	storageWarning = $state<string | null>(null);
	connection = $state<"connecting" | "live" | "reconnecting" | "offline">(
		"connecting",
	);
	commandStates = $state<Record<string, CommandState>>({});
	commandErrors = $state<Record<string, string>>({});
	intents = $state<Record<string, Intent>>({});
	quote = $state<Quote | null>(null);
	booking = $state<Booking>(blankBooking());
	locale = $state<"es" | "en">("es");
	theme = $state<"light" | "dark">("light");
	revisionTick = $state(0);
	private epochs = new Map<string, number>();
	private flights = new Map<string, Promise<unknown>>();
	private epoch = 0;
	private stopped = false;
	private feed: ReturnType<typeof setTimeout> | null = null;
	private cursor = 0;
	private currentOrder: string | null = null;
	private photoStore: PhotoPersistence;
	private photoFlights = new Map<string, Promise<void>>();
	private controllers = new Set<AbortController>();
	constructor(
		public client: ClientPort,
		public environment: string,
		private storage: KeyStorage = browserStorage(),
		photos?: PhotoPersistence,
	) {
		this.photoStore = photos ?? photoPersistence(environment);
	}
	get canField() {
		return (
			this.user?.roles.some((r) => r === "collaborator" || r === "admin") ??
			false
		);
	}
	get canOps() {
		return (
			this.user?.roles.some((r) => r === "operator" || r === "admin") ?? false
		);
	}
	get unread() {
		return this.notices.filter((n) => !n.read).length;
	}
	private key(name: string) {
		return `yessyfy:${CONTRACT_VERSION}:${this.environment}:${name}`;
	}
	async start() {
		if (this.ready) return;
		try {
			this.locale =
				browserStorage("local").get("yessyfy:locale") === "en" ? "en" : "es";
			this.theme =
				browserStorage("local").get("yessyfy:theme") === "dark"
					? "dark"
					: "light";
			const draft = browserStorage("local").get(this.key("anonymous-booking"));
			if (draft) {
				try {
					this.booking = JSON.parse(draft);
				} catch {}
			}
			this.manifest = await this.client.call("manifest", {});
			this.booking.timezone = this.manifest.timezone;
			this.services = await this.client.call("catalog", {});
			const token = this.storage.get(this.key("token"));
			if (token) {
				this.client.token = token;
				try {
					await this.commitUser(await this.client.call("session", {}));
				} catch (e) {
					if (e instanceof ClientError && e.kind === "unauthenticated") {
						this.storage.remove(this.key("token"));
						this.client.token = null;
					} else throw e;
				}
			}
		} catch (e) {
			this.error = this.message(e);
		} finally {
			this.ready = true;
		}
	}
	setLocale(locale: "es" | "en") {
		this.locale = locale;
		browserStorage("local").set("yessyfy:locale", locale);
	}
	setTheme(theme: "light" | "dark") {
		this.theme = theme;
		browserStorage("local").set("yessyfy:theme", theme);
	}
	persistBooking() {
		try {
			const owner = this.user?.id ?? "anonymous";
			browserStorage("local").set(
				this.key(`${owner}-booking`),
				JSON.stringify(this.booking),
			);
		} catch {
			this.storageWarning = "Draft recovery storage is unavailable";
		}
	}
	clearQuote() {
		this.quote = null;
	}
	async preview() {
		this.persistBooking();
		this.quote = await this.read("quote", () =>
			this.client.call("previewQuote", {
				booking: JSON.parse(JSON.stringify(this.booking)),
			}),
		);
		return this.quote;
	}
	async requestOtp(phone: string) {
		return this.client.call("requestOtp", { phone });
	}
	async signin(challenge_id: string, code: string) {
		this.busy = true;
		try {
			const s = await this.client.call("verifyOtp", { challenge_id, code });
			this.client.token = s.token;
			this.storage.set(this.key("token"), s.token);
			await this.commitUser(s.profile);
			this.error = null;
		} finally {
			this.busy = false;
		}
	}
	private async commitUser(profile: Profile) {
		const previous = this.user?.id;
		const anonymous = previous
			? blankBooking()
			: JSON.parse(JSON.stringify(this.booking));
		this.booking = anonymous;
		this.quote = null;
		this.epoch++;
		this.clearProtected();
		this.user = profile;
		this.locale =
			(browserStorage("local").get("yessyfy:locale") as "es" | "en" | null) ??
			profile.locale;
		this.cursor = 0;
		const draft = browserStorage("local").get(
			this.key(`${profile.id}-booking`),
		);
		if (draft && previous !== profile.id) {
			try {
				this.booking = JSON.parse(draft);
			} catch {}
		}
		const saved = this.storage.get(this.key(`${profile.id}-intents`));
		if (saved) {
			try {
				const v = JSON.parse(saved) as Record<string, Intent>;
				this.intents = Object.fromEntries(
					Object.entries(v).filter(([, i]) => i.owner === profile.id),
				);
				for (const c of Object.keys(this.intents))
					this.commandStates[c] = "uncertain";
			} catch {}
		}
		try {
			this.photos = await this.photoStore.list(profile.id);
			this.photos = this.photos.map((p) => ({
				...p,
				stage: "failed",
				error: "A pending photo can be resumed",
			}));
		} catch {
			this.storageWarning = "Persistent photo storage is unavailable";
		}
		await this.refreshInbox();
		this.poll();
	}
	private clearProtected() {
		if (this.feed) clearTimeout(this.feed);
		this.feed = null;
		for (const c of this.controllers) c.abort();
		this.controllers.clear();
		this.orders = {};
		this.rows = { items: [], page: 1, limit: 12, total: 0, has_more: false };
		this.messages = {};
		this.offers = [];
		this.notices = [];
		this.cases = [];
		this.warranties = [];
		this.documents = {};
		this.payouts = [];
		this.profiles = [];
		this.photos = [];
		this.intents = {};
		this.commandStates = {};
		this.commandErrors = {};
		this.currentOrder = null;
		this.flights.clear();
		this.epochs.clear();
	}
	async logout() {
		this.persistBooking();
		try {
			await this.client.call("logout", {});
		} finally {
			this.epoch++;
			this.clearProtected();
			this.user = null;
			this.client.token = null;
			this.storage.remove(this.key("token"));
			this.booking = blankBooking();
			this.quote = null;
		}
	}
	readDraft<T>(scope: string): T | null {
		if (!this.user) return null;
		try {
			const value = this.storage.get(
				this.key(`${this.user.id}-draft:${scope}`),
			);
			return value ? JSON.parse(value) : null;
		} catch {
			return null;
		}
	}
	saveDraft(scope: string, value: unknown) {
		if (!this.user) return;
		try {
			this.storage.set(
				this.key(`${this.user.id}-draft:${scope}`),
				JSON.stringify(value),
			);
		} catch {
			this.storageWarning = "Draft recovery is unavailable";
		}
	}
	clearDraft(scope: string) {
		if (this.user)
			this.storage.remove(this.key(`${this.user.id}-draft:${scope}`));
	}
	private message(e: unknown) {
		return e instanceof Error ? e.message : "The action could not be completed";
	}
	async read<T>(lane: string, fn: () => Promise<T>): Promise<T> {
		const generation = (this.epochs.get(lane) ?? 0) + 1;
		this.epochs.set(lane, generation);
		const principal = this.epoch;
		let result: T;
		try {
			result = await fn();
		} catch (e) {
			if (principal === this.epoch) this.authenticationError(e);
			throw e;
		}
		if (
			this.stopped ||
			principal !== this.epoch ||
			generation !== this.epochs.get(lane)
		)
			throw new DOMException("Obsolete response", "AbortError");
		return result;
	}
	private authenticationError(e: unknown) {
		if (e instanceof ClientError && e.kind === "unauthenticated" && this.user) {
			this.persistBooking();
			this.epoch++;
			this.clearProtected();
			this.user = null;
			this.client.token = null;
			this.storage.remove(this.key("token"));
			this.quote = null;
			this.error = "Session expired. Sign in to continue.";
			this.booking = blankBooking();
		}
	}
	private persistIntents() {
		if (this.user)
			this.storage.set(
				this.key(`${this.user.id}-intents`),
				JSON.stringify(this.intents),
			);
	}
	async command<K extends Operation>(
		channel: string,
		operation: K,
		payload: Record<string, unknown>,
		expected_revision?: number,
	): Promise<Results[K]> {
		if (!this.user)
			throw new ClientError("unauthenticated", "Sign in to continue");
		const old = this.intents[channel];
		if (old) {
			if (
				old.operation !== operation ||
				JSON.stringify(old.command.payload) !== JSON.stringify(payload)
			)
				throw new ClientError(
					"uncertain",
					"Confirm the previous unchanged action before starting another",
				);
		}
		const intent = old ?? {
			operation,
			command: {
				request_key: crypto.randomUUID(),
				expected_revision,
				payload: JSON.parse(JSON.stringify(payload)),
			},
			owner: this.user.id,
			channel,
		};
		if (this.flights.has(channel))
			return this.flights.get(channel) as Promise<Results[K]>;
		this.intents = { ...this.intents, [channel]: intent };
		this.persistIntents();
		this.commandStates = { ...this.commandStates, [channel]: "pending" };
		this.commandErrors = { ...this.commandErrors, [channel]: "" };
		const principal = this.epoch;
		const flight = (async () => {
			try {
				const result = await this.client.call(
					operation,
					intent.command as Inputs[K],
				);
				if (principal !== this.epoch || intent.owner !== this.user?.id)
					throw new DOMException("Session changed", "AbortError");
				this.commandStates = { ...this.commandStates, [channel]: "confirmed" };
				const next = { ...this.intents };
				delete next[channel];
				this.intents = next;
				this.persistIntents();
				this.applyResult(operation, result);
				return result;
			} catch (e) {
				if (principal === this.epoch) {
					const kind = e instanceof ClientError ? e.kind : "unavailable";
					this.commandStates = {
						...this.commandStates,
						[channel]:
							kind === "uncertain"
								? "uncertain"
								: kind === "conflict"
									? "conflict"
									: "failed",
					};
					this.commandErrors = {
						...this.commandErrors,
						[channel]: this.message(e),
					};
					if (kind !== "uncertain") {
						const next = { ...this.intents };
						delete next[channel];
						this.intents = next;
						this.persistIntents();
					}
					if (kind === "conflict" && operation === "createOrder")
						this.quote = null;
					if (kind === "conflict" && typeof payload.id === "string")
						await this.loadOrder(payload.id).catch(() => {});
					this.authenticationError(e);
				}
				throw e;
			} finally {
				if (principal === this.epoch) this.flights.delete(channel);
			}
		})();
		this.flights.set(channel, flight);
		return flight;
	}
	async recover(channel: string) {
		const i = this.intents[channel];
		if (!i) return;
		const p = this.epoch;
		const receipt = await this.client.call("receipt", {
			request_key: i.command.request_key,
		});
		if (p !== this.epoch) return;
		if (receipt) {
			if (receipt.operation !== i.operation)
				throw new ClientError(
					"configuration",
					"The receipt belongs to a different operation",
				);
			const next = { ...this.intents };
			delete next[channel];
			this.intents = next;
			this.persistIntents();
			this.commandStates = { ...this.commandStates, [channel]: "confirmed" };
			this.applyResult(i.operation, receipt.result);
			return receipt.result;
		}
		return this.command(
			channel,
			i.operation,
			i.command.payload,
			i.command.expected_revision,
		);
	}
	private applyResult(op: Operation, result: unknown) {
		if (result && typeof result === "object" && "booking" in result) {
			const o = result as Order;
			this.upsert(o);
			if (op === "createOrder") {
				this.quote = null;
				this.booking = blankBooking();
				this.persistBooking();
				browserStorage("local").remove(this.key("anonymous-booking"));
			}
		}
		if (
			[
				"updateProfile",
				"submitVerification",
				"duty",
				"attachVerification",
			].includes(op)
		) {
			const p = result as Profile;
			if (p.id === this.user?.id) this.user = p;
			else this.profiles = this.profiles.map((x) => (x.id === p.id ? p : x));
		}
		if (op === "sendMessage") {
			const m = result as Message;
			this.messages = {
				...this.messages,
				[m.order_id]: [
					...(this.messages[m.order_id] ?? []).filter((x) => x.id !== m.id),
					m,
				],
			};
		}
		if (["createCase", "resolveCase"].includes(op)) {
			const c = result as Case;
			this.cases = [c, ...this.cases.filter((x) => x.id !== c.id)];
		}
		if (op === "requestDocument") {
			const d = result as Document;
			this.documents = {
				...this.documents,
				[d.order_id]: [
					d,
					...(this.documents[d.order_id] ?? []).filter((x) => x.id !== d.id),
				],
			};
		}
		this.revisionTick++;
	}
	private upsert(o: Order) {
		if ((this.orders[o.id]?.revision ?? 0) <= o.revision)
			this.orders = { ...this.orders, [o.id]: o };
		this.rows = {
			...this.rows,
			items: this.rows.items.map((x) => (x.id === o.id ? o : x)),
		};
	}
	async loadOrder(id: string) {
		try {
			this.currentOrder = id;
			const o = await this.read("active-order", () =>
				this.client.call("order", { id }),
			);
			this.upsert(o);
			return o;
		} catch (e) {
			if (
				e instanceof ClientError &&
				["forbidden", "not_found"].includes(e.kind)
			) {
				const orders = { ...this.orders },
					messages = { ...this.messages },
					documents = { ...this.documents };
				delete orders[id];
				delete messages[id];
				delete documents[id];
				this.orders = orders;
				this.messages = messages;
				this.documents = documents;
				this.rows = {
					...this.rows,
					items: this.rows.items.filter((o) => o.id !== id),
				};
				if (this.currentOrder === id) this.currentOrder = null;
			}
			throw e;
		}
	}
	async loadOrders(query: Inputs["orders"]) {
		const r = await this.read("orders", () =>
			this.client.call("orders", query),
		);
		this.rows = r;
		for (const o of r.items) this.upsert(o);
		return r;
	}
	async directory(query: Inputs["collaborators"] = {}) {
		this.collaborators = await this.read("directory", () =>
			this.client.call("collaborators", query),
		);
	}
	async loadOffers() {
		this.offers = await this.read("offers", () =>
			this.client.call("offers", {}),
		);
	}
	async refreshInbox() {
		if (!this.user) return;
		const r = await this.read("inbox", () => this.client.call("inbox", {}));
		this.notices = r.items;
		this.cursor = Math.max(this.cursor, r.cursor);
	}
	async loadConversation(id: string) {
		this.messages = {
			...this.messages,
			[id]: await this.read(`chat:${id}`, () =>
				this.client.call("conversation", { order_id: id }),
			),
		};
	}
	async loadCases() {
		this.cases = await this.read("cases", () => this.client.call("cases", {}));
	}
	async loadWarranties() {
		this.warranties = await this.read("warranties", () =>
			this.client.call("warranties", {}),
		);
	}
	async loadDocuments(id: string) {
		this.documents = {
			...this.documents,
			[id]: await this.read(`documents:${id}`, () =>
				this.client.call("documents", { order_id: id }),
			),
		};
	}
	async loadPayouts() {
		this.payouts = await this.read("payouts", () =>
			this.client.call("payouts", {}),
		);
	}
	async loadProfiles() {
		this.profiles = await this.read("profiles", () =>
			this.client.call("profiles", {}),
		);
	}
	private poll() {
		if (this.stopped || !this.user) return;
		const principal = this.epoch;
		this.feed = setTimeout(async () => {
			try {
				const events = await this.client.call("events", {
					cursor: this.cursor,
				});
				if (principal !== this.epoch) return;
				let refresh = false;
				for (const event of events) {
					if (event.kind === "gap" || event.cursor > this.cursor + 1) {
						refresh = true;
						this.cursor = event.cursor;
						break;
					}
					if (event.cursor <= this.cursor) continue;
					this.cursor = event.cursor;
					refresh = true;
				}
				if (refresh) {
					const profile = await this.read("current-profile", () =>
						this.client.call("profile", {}),
					);
					if (profile.id === this.user?.id) this.user = profile;
					await this.refreshInbox();
					if (this.currentOrder) {
						await this.loadOrder(this.currentOrder);
						await this.loadConversation(this.currentOrder);
						await this.loadDocuments(this.currentOrder);
					}
					if (this.canField) await this.loadOffers();
					this.revisionTick++;
				}
				this.connection = "live";
			} catch (e) {
				if (principal === this.epoch) this.authenticationError(e);
				if (principal === this.epoch)
					this.connection =
						typeof navigator !== "undefined" && !navigator.onLine
							? "offline"
							: "reconnecting";
			} finally {
				if (principal === this.epoch) this.poll();
			}
		}, 1500);
	}
	async queuePhoto(
		order_id: string,
		phase: PendingPhoto["phase"],
		file: File,
		source: PendingPhoto["source"] = "file",
		coordinates?: PendingPhoto["coordinates"],
	) {
		if (!this.user) throw new ClientError("unauthenticated", "Sign in");
		if (
			!this.manifest?.mime_types.includes(file.type) ||
			file.size > this.manifest.max_upload_bytes ||
			!file.size
		)
			throw new ClientError(
				"validation",
				"Choose a supported image within the upload limit",
			);
		const p: PendingPhoto = {
			id: crypto.randomUUID(),
			owner: this.user.id,
			order_id,
			phase,
			file,
			name: file.name,
			mime: file.type,
			source,
			coordinates,
			captured_at: source === "camera" ? new Date().toISOString() : undefined,
			stage: "queued",
			begin_key: crypto.randomUUID(),
			complete_key: crypto.randomUUID(),
			attach_key: crypto.randomUUID(),
		};
		try {
			await this.photoStore.put(p);
		} catch {
			this.storageWarning =
				"Photo recovery could not be saved. Keep this page open.";
		}
		this.photos = [...this.photos, p];
		return p;
	}
	async queueVerification(file: File, kind: string) {
		const p = await this.queuePhoto(
			`verification:${this.user?.id}`,
			"work_progress",
			file,
		);
		const next = {
			...p,
			purpose: "verification" as const,
			document_kind: kind,
		};
		await this.photoStore.put(next);
		this.photos = this.photos.map((x) => (x.id === p.id ? next : x));
		return next;
	}
	async uploadPhoto(id: string) {
		if (this.photoFlights.has(id)) return this.photoFlights.get(id);
		const task = this.performUpload(id);
		this.photoFlights.set(id, task);
		try {
			await task;
		} finally {
			this.photoFlights.delete(id);
		}
	}
	private async performUpload(id: string) {
		let photo = this.photos.find((p) => p.id === id);
		if (!photo || photo.owner !== this.user?.id) return;
		const owner = photo.owner,
			principal = this.epoch;
		const controller = new AbortController();
		this.controllers.add(controller);
		const check = () => {
			if (principal !== this.epoch || this.user?.id !== owner)
				throw new DOMException("Session changed", "AbortError");
		};
		const update = async (patch: Partial<PendingPhoto>) => {
			check();
			photo = { ...photo!, ...patch };
			this.photos = this.photos.map((p) => (p.id === id ? photo! : p));
			try {
				await this.photoStore.put(photo);
			} catch {
				this.storageWarning = "Photo recovery could not be saved";
			}
		};
		try {
			if (!photo.asset_id) {
				await update({ stage: "ticket", error: undefined });
				let ticket = await this.client.call("beginUpload", {
					request_key: photo.begin_key,
					payload: {
						order_id: photo.purpose ? undefined : photo.order_id,
						purpose: photo.purpose,
						document_kind: photo.document_kind,
						name: photo.name,
						size: photo.file.size,
						type: photo.mime,
					},
				});
				check();
				await update({ ticket_id: ticket.id, stage: "uploading" });
				if (Date.parse(ticket.expires_at) <= Date.now()) {
					const renew_key = photo.renew_key ?? crypto.randomUUID();
					await update({ renew_key });
					ticket = await this.client.call("renewUpload", {
						request_key: renew_key,
						payload: { upload_id: ticket.id },
					});
					check();
				}
				const url = new URL(ticket.url);
				if (!["http:", "https:"].includes(url.protocol))
					throw new ClientError("configuration", "Invalid upload destination");
				const response = await fetch(ticket.url, {
					method: ticket.method,
					headers: ticket.headers,
					body: photo.file,
					credentials: "omit",
					signal: controller.signal,
				});
				if (!response.ok)
					throw new ClientError("unavailable", "Photo transfer failed");
				check();
				await update({ stage: "confirming" });
				const asset = await this.client.call("completeUpload", {
					request_key: photo.complete_key,
					payload: { upload_id: ticket.id },
				});
				check();
				await update({ asset_id: asset.asset_id });
			}
			await update({ stage: "attaching" });
			const receipt = await this.client.call("receipt", {
				request_key: photo.attach_key,
			});
			check();
			if (
				receipt?.operation ===
				(photo.purpose ? "attachVerification" : "attachEvidence")
			) {
				this.applyResult(
					photo.purpose ? "attachVerification" : "attachEvidence",
					receipt.result,
				);
				await this.photoStore.remove(id);
				this.photos = this.photos.filter((p) => p.id !== id);
				return;
			}
			if (photo.purpose) {
				const result = await this.client.call("attachVerification", {
					request_key: photo.attach_key,
					payload: { asset_id: photo.asset_id, kind: photo.document_kind },
				});
				check();
				this.applyResult("attachVerification", result);
				await this.photoStore.remove(id);
				this.photos = this.photos.filter((p) => p.id !== id);
				return;
			}
			if (!photo.attach_revision) {
				const latest = await this.loadOrder(photo.order_id);
				check();
				await update({ attach_revision: latest.revision });
			}
			const result = await this.client.call("attachEvidence", {
				request_key: photo.attach_key,
				expected_revision: photo.attach_revision,
				payload: {
					id: photo.order_id,
					asset_id: photo.asset_id,
					phase: photo.phase,
					source: photo.source,
					captured_at: photo.captured_at,
					coordinates: photo.coordinates,
				},
			});
			check();
			this.upsert(result);
			await this.photoStore.remove(id);
			check();
			this.photos = this.photos.filter((p) => p.id !== id);
		} catch (e) {
			if (principal === this.epoch) {
				if (e instanceof ClientError && e.kind === "conflict")
					await update({
						attach_revision: undefined,
						attach_key: crypto.randomUUID(),
					});
				await update({ stage: "failed", error: this.message(e) });
			}
			if (principal === this.epoch) this.authenticationError(e);
			throw e;
		} finally {
			this.controllers.delete(controller);
		}
	}
	async removePhoto(id: string) {
		if (this.photoFlights.has(id))
			throw new ClientError("uncertain", "Wait for the upload");
		await this.photoStore.remove(id);
		this.photos = this.photos.filter((p) => p.id !== id);
	}
	dispose() {
		this.stopped = true;
		this.epoch++;
		this.clearProtected();
		this.photoStore.close();
		this.client.dispose();
	}
}
