import type {
	BindingContext,
	ClientConfig,
	OperationBinding,
} from "../sdk/api/src/surreal/client.ts";
import {
	SDKError,
	type SDKErrorKind,
} from "../sdk/core/src/contracts/errors.ts";
import type { InboxEvent } from "../sdk/core/src/contracts/operations.ts";

export function createDeployment(
	overrides: {
		apiOrigin?: string;
		databaseEndpoint?: string;
		namespace?: string;
		database?: string;
		mainOrigin?: string;
		visionOrigin?: string;
	} = {},
): ClientConfig {
	const env =
		(import.meta as ImportMeta & { env?: Record<string, string | boolean> })
			.env ?? {};
	const setting = (name: string, fallback: string) =>
		typeof env[name] === "string" && env[name] ? String(env[name]) : fallback;
	const origin = (
		overrides.apiOrigin ??
		setting("VITE_OPENHAUS_API_ORIGIN", "http://127.0.0.1:8080")
	).replace(/\/$/, "");
	const namespace =
		overrides.namespace ?? setting("VITE_OPENHAUS_NAMESPACE", "openhaus");
	const database =
		overrides.database ?? setting("VITE_OPENHAUS_DATABASE", "main");
	const mainOrigin =
		overrides.mainOrigin ??
		setting("VITE_OPENHAUS_MAIN_ORIGIN", "http://localhost:5173");
	const visionOrigin =
		overrides.visionOrigin ??
		setting("VITE_OPENHAUS_VISION_ORIGIN", "http://localhost:5174");
	const manifest = {
		version: "OH-2",
		hash: "fbecbe8a35002bc66a0c557ce12858c29dc70d83a745d0ac8a9a63e065116279",
	};
	let contract: Promise<void> | null = null;
	function ensureContract(context: BindingContext): Promise<void> {
		if (!contract) {
			contract = context.http
				.request("/v1/contract", {
					method: "GET",
					signal: context.signal,
					retry: { attempts: 0 },
				})
				.then((value) => {
					const server = value as Record<string, unknown> | null;
					if (
						!server ||
						server.version !== manifest.version ||
						server.hash !== manifest.hash ||
						server.namespace !== namespace ||
						server.database !== database
					) {
						throw SDKError.configuration(
							"The client and server contracts do not match",
						);
					}
				})
				.catch((error) => {
					contract = null;
					throw classifyError(error);
				});
		}
		return contract;
	}
	function classifyError(error: unknown): SDKError {
		if (SDKError.isSDKError(error)) return error;
		const row = error as {
			status?: number;
			statusCode?: number;
			data?: { code?: string; message?: string };
			message?: string;
			name?: string;
		};
		const status = row?.status ?? row?.statusCode;
		const kinds: Record<number, SDKErrorKind> = {
			400: "validation",
			401: "unauthenticated",
			403: "forbidden",
			404: "not_found",
			409: "conflict",
			413: "validation",
			429: "unavailable",
			503: "unavailable",
			504: "timeout",
		};
		if (status) {
			return new SDKError(
				kinds[status] ?? "unavailable",
				row.data?.message ?? row.message ?? "Service request failed",
				{ status, cause: error },
			);
		}
		if (row?.name === "AbortError") return SDKError.cancelled();
		if (row?.name === "TimeoutError") return SDKError.timeout();
		if (
			/authentication|unauthenticated|signin|credentials|token|permission/i.test(
				row?.message ?? "",
			)
		)
			return SDKError.unauthenticated("Session is invalid or expired");
		return SDKError.transport("Connected service is unavailable", error);
	}
	async function request(
		context: BindingContext,
		name: string,
		input: unknown,
		token = context.token,
	) {
		try {
			await ensureContract(context);
			return await context.http.request(`/v1/operations/${name}`, {
				method: "POST",
				body: input,
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				signal: context.signal,
				retry: { attempts: 0 },
			});
		} catch (error) {
			throw classifyError(error);
		}
	}
	const guest = new Set([
		"searchCatalog",
		"getPropertyDetail",
		"getMapMarkers",
		"resolveProperties",
		"submitInquiry",
		"lookupInquiry",
		"requestPasswordReset",
		"completePasswordReset",
		"verifyEmail",
	]);
	const names = [
		"updateProfile",
		"changePassword",
		"requestPasswordReset",
		"completePasswordReset",
		"verifyEmail",
		"searchCatalog",
		"getPropertyDetail",
		"getMapMarkers",
		"resolveProperties",
		"listFavoriteIds",
		"setFavorite",
		"mergeFavorites",
		"submitInquiry",
		"lookupInquiry",
		"getMyListings",
		"getPropertyForEdit",
		"createProperty",
		"updateProperty",
		"transitionProperty",
		"beginUpload",
		"completeUpload",
		"attachMedia",
		"updateMedia",
		"getLeads",
		"getLead",
		"createLead",
		"updateLeadStage",
		"addLeadNote",
		"getMetrics",
		"getInbox",
		"markNotifications",
		"getActivities",
	] as const;
	const operations: Record<string, OperationBinding> = Object.fromEntries(
		names.map((name) => [
			name,
			{
				public: guest.has(name),
				prepare: (input: unknown) => input,
				execute: (context: BindingContext, input: unknown) =>
					request(context, name, input),
			},
		]),
	);
	for (const mode of ["signin", "signup"] as const) {
		operations[mode] = {
			public: true,
			prepare: (input) => input,
			async execute(context, input) {
				await ensureContract(context);
				const variables = input as Record<string, unknown>;
				const credentials = {
					namespace,
					database,
					access: "user_auth",
					variables,
				};
				const tokens =
					mode === "signin"
						? await context.db.signin(credentials)
						: await context.db.signup(credentials);
				const token = tokens.access;
				const profile = await request(context, "getSessionProfile", {}, token);
				if (mode === "signup") {
					await request(
						context,
						"requestEmailVerification",
						{
							request_key: crypto.randomUUID(),
							payload: {},
						},
						token,
					);
				}
				return { token, profile };
			},
		};
	}
	operations.authenticate = {
		public: true,
		prepare: (input) => input,
		async execute(context, input) {
			await ensureContract(context);
			const token = (input as { token: string }).token;
			await context.db.authenticate(token);
			return request(context, "getSessionProfile", {}, token);
		},
	};
	async function subscribeInbox(
		context: BindingContext,
		initialCursor: string,
		listener: (event: InboxEvent) => void,
	): Promise<() => void> {
		if (!context.token) throw SDKError.unauthenticated();
		await ensureContract(context);
		let cursor = initialCursor,
			stopped = false,
			socket: WebSocket | null = null,
			timer: ReturnType<typeof setTimeout> | null = null;
		let connected = false;
		let resolveFirst: (() => void) | undefined,
			rejectFirst: ((error: unknown) => void) | undefined;
		const first = new Promise<void>((resolve, reject) => {
			resolveFirst = resolve;
			rejectFirst = reject;
		});
		const url = origin.replace(/^http/, "ws") + "/ws";
		const stop = () => {
			stopped = true;
			if (timer) clearTimeout(timer);
			socket?.close();
			context.signal.removeEventListener("abort", stop);
		};
		const connect = () => {
			if (stopped) return;
			socket = new WebSocket(url);
			const active = socket;
			const deadline = setTimeout(() => {
				active.close();
				if (!connected) {
					rejectFirst?.(SDKError.timeout("Inbox subscription timed out"));
					stop();
				}
			}, 10000);
			active.onopen = () =>
				active.send(JSON.stringify({ auth: context.token }));
			active.onmessage = (event) => {
				try {
					const message = JSON.parse(String(event.data));
					if (message.authenticated) {
						active.send(JSON.stringify({ method: "inbox.subscribe", cursor }));
						return;
					}
					if (message.subscribed) {
						clearTimeout(deadline);
						connected = true;
						resolveFirst?.();
						return;
					}
					if (message.action === "gap") {
						listener({ action: "gap", id: "", revision: 0 });
						stop();
						return;
					}
					if (
						!["upsert", "delete"].includes(message.action) ||
						!Number.isSafeInteger(message.sequence) ||
						message.sequence !== Number(cursor) + 1
					)
						throw new Error("Invalid inbox sequence");
					cursor = String(message.sequence);
					listener({
						action: message.action,
						id: message.id,
						revision: message.revision,
						...(message.item ? { item: message.item } : {}),
					});
				} catch {
					listener({ action: "gap", id: "", revision: 0 });
					stop();
				}
			};
			active.onclose = (event) => {
				clearTimeout(deadline);
				if (stopped) return;
				if (event.code === 1008) {
					rejectFirst?.(SDKError.unauthenticated());
					listener({ action: "gap", id: "", revision: 0 });
					stop();
					return;
				}
				if (!connected) {
					rejectFirst?.(SDKError.unavailable("Inbox connection unavailable"));
					stop();
					return;
				}
				timer = setTimeout(connect, 1000);
			};
			active.onerror = () => active.close();
		};
		context.signal.addEventListener("abort", stop, { once: true });
		if (context.signal.aborted) {
			stop();
			throw SDKError.cancelled();
		}
		connect();
		await first;
		return stop;
	}
	return {
		manifest,
		endpoint:
			overrides.databaseEndpoint ??
			setting("VITE_OPENHAUS_DATABASE_ENDPOINT", "ws://127.0.0.1:8000/rpc"),
		namespace,
		database,
		mainOrigin,
		visionOrigin,
		http: {
			environments: [{ id: "openhaus", label: "OpenHaus", baseUrl: origin }],
			initialEnvironment: "openhaus",
			persist: false,
			monitoring: false,
			timeoutMs: 15000,
			health: { path: "/ready" },
		},
		maxPageSize: 100,
		publicStatuses: ["published"],
		currencies: { MXN: 2, USD: 2, EUR: 2, GBP: 2, CAD: 2 },
		restoreTokenOnOutage: true,
		inquiryKeyPersistence: true,
		operations,
		mapAccepted: true,
		uploadOrigins: [origin],
		maxUploadBytes: 25000000,
		mediaTypes: ["image/jpeg", "image/png", "image/webp"],
		createRequestKey: () => crypto.randomUUID(),
		classifyError,
		subscribeInbox,
	};
}
export const deployment = createDeployment();
