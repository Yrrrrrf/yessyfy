export interface OutboxItem<T = unknown> {
	id: string;
	action: string;
	payload: T;
	idempotencyKey: string;
	attempt: number;
	createdAt: number;
	lastAttemptAt: number | null;
	error: string | null;
}

/**
 * Calculates exponential backoff with full jitter to avoid stampeding herds.
 * Formula: t = min(maxMs, baseMs * 2^attempt) * random(0.5, 1.5)
 */
export function computeJitteredBackoff(
	attempt: number,
	baseMs = 500,
	maxMs = 30000,
): number {
	const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
	const jitterMultiplier = 0.5 + Math.random();
	return Math.round(exponential * jitterMultiplier);
}

export class OfflineOutboxQueue<T = unknown> {
	private queue: OutboxItem<T>[] = [];

	enqueue(action: string, payload: T): OutboxItem<T> {
		const item: OutboxItem<T> = {
			id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			action,
			payload,
			idempotencyKey: crypto.randomUUID(),
			attempt: 0,
			createdAt: Date.now(),
			lastAttemptAt: null,
			error: null,
		};

		this.queue.push(item);
		return item;
	}

	get pendingCount(): number {
		return this.queue.length;
	}

	get items(): readonly OutboxItem<T>[] {
		return this.queue;
	}

	async drain(
		processor: (item: OutboxItem<T>) => Promise<boolean>,
	): Promise<{ processed: number; failed: number }> {
		let processed = 0;
		let failed = 0;

		const remaining: OutboxItem<T>[] = [];

		for (const item of this.queue) {
			item.attempt += 1;
			item.lastAttemptAt = Date.now();

			try {
				const success = await processor(item);
				if (success) {
					processed += 1;
				} else {
					failed += 1;
					remaining.push(item);
				}
			} catch (err: unknown) {
				item.error = err instanceof Error ? err.message : String(err);
				failed += 1;
				remaining.push(item);
			}
		}

		this.queue = remaining;
		return { processed, failed };
	}

	clear(): void {
		this.queue = [];
	}
}
