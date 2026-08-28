import { isResponseError, isResponseValidationError, up } from "up-fetch";

export interface ApiClientConfig {
	baseUrl?: string;
	getAuthToken?: () => string | null | undefined;
	timeout?: number;
}

/**
 * Creates a configured, resilient up-fetch API client with Bearer auth injection,
 * automatic retries with exponential backoff, and ArkType schema validation support.
 */
export function createApiClient(config: ApiClientConfig = {}) {
	const baseUrl = config.baseUrl ?? "/api";
	const timeout = config.timeout ?? 10000;

	return up(globalThis.fetch, () => {
		const token = config.getAuthToken?.();
		const headers: Record<string, string | undefined> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		return {
			baseUrl,
			timeout,
			headers,
			retry: {
				attempts: 3,
				delay: ({ attempt }) => Math.min(400 * 2 ** attempt, 4000),
			},
		};
	});
}

/**
 * Default global API client instance.
 */
let currentToken: string | null = null;

export function setApiAuthToken(token: string | null) {
	currentToken = token;
}

export const api = createApiClient({
	getAuthToken: () => currentToken,
});

export { isResponseError, isResponseValidationError };
