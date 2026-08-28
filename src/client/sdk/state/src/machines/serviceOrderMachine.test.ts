import { describe, expect, it } from "vite-plus/test";
import { createActor } from "xstate";
import { serviceOrderMachine } from "./serviceOrderMachine.ts";

describe("serviceOrderMachine", () => {
	it("executes full happy path from draft to completion", () => {
		const actor = createActor(serviceOrderMachine);
		actor.start();

		expect(actor.getSnapshot().value).toBe("draft");

		// 1. Submit Request
		actor.send({
			type: "SUBMIT_REQUEST",
			customerId: "usr_cust_1",
			category: "plomeria",
			locationType: "residencial",
			urgency: "normal",
			totalCustomerCents: 45000,
		});
		expect(actor.getSnapshot().value).toBe("pending_triage");

		// 2. Dispatch
		actor.send({ type: "DISPATCH" });
		expect(actor.getSnapshot().value).toBe("dispatched");

		// 3. Collaborator Accepts
		actor.send({ type: "ACCEPT_JOB", collaboratorId: "usr_tech_1" });
		expect(actor.getSnapshot().value).toBe("accepted");
		expect(actor.getSnapshot().context.collaboratorId).toBe("usr_tech_1");

		// 4. Start Transit
		actor.send({ type: "START_TRANSIT", etaMinutes: 15 });
		expect(actor.getSnapshot().value).toBe("en_camino");

		// 5. Arrive On Site
		actor.send({ type: "ARRIVE_ON_SITE" });
		expect(actor.getSnapshot().value).toBe("in_progress");

		// Add diagnostic before photo
		actor.send({
			type: "ADD_PHOTO",
			photo: {
				phase: "diagnostic_before",
				imageUrl: "https://example.com/before.jpg",
				sha256: "sha256_before_hash",
			},
		});

		// 6. Start Wind Down
		actor.send({ type: "START_WIND_DOWN" });
		expect(actor.getSnapshot().value).toBe("winding_down");

		// Add finished proof photo
		actor.send({
			type: "ADD_PHOTO",
			photo: {
				phase: "proof_finished",
				imageUrl: "https://example.com/after.jpg",
				sha256: "sha256_after_hash",
			},
		});

		// 7. Submit QA
		actor.send({ type: "SUBMIT_QA" });
		expect(actor.getSnapshot().value).toBe("pending_validation");

		// 8. Validate OK
		actor.send({ type: "VALIDATE_OK", rating: 5 });
		expect(actor.getSnapshot().value).toBe("validated");
		expect(actor.getSnapshot().context.rating).toBe(5);

		// 9. Settle Payout
		actor.send({
			type: "SETTLE_PAYOUT",
			warrantyCertificateId: "YSF-WAR-0042",
		});
		expect(actor.getSnapshot().value).toBe("completed");
		expect(actor.getSnapshot().status).toBe("done");
	});

	it("blocks payout settlement if required photos are missing (canDisbursePayout guard)", () => {
		const actor = createActor(serviceOrderMachine);
		actor.start();

		actor.send({
			type: "SUBMIT_REQUEST",
			customerId: "usr_cust_2",
			category: "electricidad",
			locationType: "residencial",
			urgency: "normal",
			totalCustomerCents: 50000,
		});
		actor.send({ type: "DISPATCH" });
		actor.send({ type: "ACCEPT_JOB", collaboratorId: "usr_tech_2" });
		actor.send({ type: "START_TRANSIT" });
		actor.send({ type: "ARRIVE_ON_SITE" });
		actor.send({ type: "START_WIND_DOWN" });
		actor.send({ type: "SUBMIT_QA" });
		actor.send({ type: "VALIDATE_OK", rating: 4 });

		expect(actor.getSnapshot().value).toBe("validated");

		// Attempting settlement WITHOUT diagnostic and finished photos must be rejected by the guard
		actor.send({
			type: "SETTLE_PAYOUT",
			warrantyCertificateId: "YSF-WAR-FAIL",
		});
		expect(actor.getSnapshot().value).toBe("validated"); // Remained in validated, blocked from completed!
	});
});
