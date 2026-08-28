import { describe, expect, it } from "vite-plus/test";
import { computeJitteredBackoff, OfflineOutboxQueue } from "./outbox.ts";

describe("OfflineOutboxQueue", () => {
	it("enqueues actions with distinct idempotency keys", () => {
		const outbox = new OfflineOutboxQueue();
		const item1 = outbox.enqueue("CHECKIN_ARRIVAL", { orderId: "ord_1" });
		const item2 = outbox.enqueue("UPLOAD_PHOTO", {
			orderId: "ord_1",
			photoUrl: "test.jpg",
		});

		expect(outbox.pendingCount).toBe(2);
		expect(item1.idempotencyKey).toBeTruthy();
		expect(item2.idempotencyKey).toBeTruthy();
		expect(item1.idempotencyKey).not.toBe(item2.idempotencyKey);
	});

	it("drains queued items and retains failed ones for retry", async () => {
		const outbox = new OfflineOutboxQueue<{ val: number }>();
		outbox.enqueue("TASK", { val: 1 });
		outbox.enqueue("TASK", { val: 2 });
		outbox.enqueue("TASK", { val: 3 });

		// Processor succeeds on odd numbers, fails on even
		const result = await outbox.drain(async (item) => {
			return item.payload.val % 2 !== 0;
		});

		expect(result.processed).toBe(2); // 1 and 3 succeeded
		expect(result.failed).toBe(1); // 2 failed
		expect(outbox.pendingCount).toBe(1); // 2 remains in queue
		expect(outbox.items[0].attempt).toBe(1);
	});

	it("computes jittered backoff within expected bounds", () => {
		for (let attempt = 0; attempt < 5; attempt++) {
			const delay = computeJitteredBackoff(attempt, 500, 30000);
			const minExpected = 500 * 2 ** attempt * 0.5;
			const maxExpected = 500 * 2 ** attempt * 1.5;

			expect(delay).toBeGreaterThanOrEqual(Math.round(minExpected));
			expect(delay).toBeLessThanOrEqual(Math.round(maxExpected));
		}
	});
});
