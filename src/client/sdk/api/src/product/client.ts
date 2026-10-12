import {
	ClientError,
	validateResult,
	type ClientPort,
	type Inputs,
	type Operation,
	type Results,
} from "../../../core/src/product/contracts.ts";
export interface Deployment {
	apiOrigin: string;
	mainOrigin: string;
	visionOrigin: string;
	environment: string;
}
const mutations = new Set<Operation>([
	"createOrder",
	"updateProfile",
	"submitVerification",
	"offer",
	"acceptOffer",
	"declineOffer",
	"duty",
	"progress",
	"propose",
	"decideQuote",
	"review",
	"qa",
	"cancelOrder",
	"reconcileFinance",
	"beginUpload",
	"renewUpload",
	"completeUpload",
	"attachEvidence",
	"attachVerification",
	"sendMessage",
	"markRead",
	"createCase",
	"resolveCase",
	"requestDocument",
]);
export function createClient(
	config: Deployment,
	send: typeof fetch = fetch,
): ClientPort {
	let token: string | null = null;
	const active = new Set<AbortController>();
	let disposed = false;
	return {
		get token() {
			return token;
		},
		set token(v) {
			token = v;
		},
		async call<K extends Operation>(
			op: K,
			input: Inputs[K],
			signal?: AbortSignal,
		): Promise<Results[K]> {
			if (disposed) throw new ClientError("unavailable", "Client is closed");
			if (!config.apiOrigin)
				throw new ClientError(
					"configuration",
					"Configure VITE_YESSYFY_API_ORIGIN to connect the service",
				);
			const controller = new AbortController();
			active.add(controller);
			const abort = () => controller.abort();
			signal?.addEventListener("abort", abort, { once: true });
			if (signal?.aborted) controller.abort();
			const timeout = setTimeout(() => controller.abort(), 15_000);
			try {
				const response = await send(
					`${config.apiOrigin.replace(/\/$/, "")}/client/operations/${op}`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
						body: JSON.stringify(input),
						signal: controller.signal,
						credentials: "omit",
					},
				);
				const data: unknown = await response.json();
				if (!response.ok) {
					const r = data as { kind?: string; message?: string };
					const kinds: Record<number, ClientError["kind"]> = {
						400: "validation",
						401: "unauthenticated",
						403: "forbidden",
						404: "not_found",
						409: "conflict",
						413: "validation",
						503: "unavailable",
					};
					throw new ClientError(
						kinds[response.status] ?? "unavailable",
						r.message ?? `Service request failed (${response.status})`,
						data,
					);
				}
				return validateResult(op, data);
			} catch (error) {
				if (error instanceof ClientError) {
					if (mutations.has(op) && error.kind === "unavailable")
						throw new ClientError(
							"uncertain",
							"The action needs confirmation",
							error,
						);
					throw error;
				}
				if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
				throw new ClientError(
					mutations.has(op) ? "uncertain" : "unavailable",
					"Connection interrupted. Your last confirmed data is preserved.",
					error,
				);
			} finally {
				clearTimeout(timeout);
				active.delete(controller);
				signal?.removeEventListener("abort", abort);
			}
		},
		dispose() {
			disposed = true;
			for (const c of active) c.abort();
			active.clear();
			token = null;
		},
	};
}
