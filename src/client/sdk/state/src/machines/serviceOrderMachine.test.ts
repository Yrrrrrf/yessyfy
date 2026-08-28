import { describe, expect, it } from "vite-plus/test";
import { createActor } from "xstate";
import { serviceOrderMachine } from "./serviceOrderMachine.ts";

describe("serviceOrderMachine", () => {
	it("executes full happy path from draft to completion with normalized in_transit", () => {
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

		// 4. Start Transit (normalized to in_transit)
		actor.send({ type: "START_TRANSIT", etaMinutes: 15 });
		expect(actor.getSnapshot().value).toBe("in_transit");

		// 5. Arrive On Site
		actor.send({ type: "ARRIVE_ON_SITE", distanceMeters: 50 });
		expect(actor.getSnapshot().value).toBe("in_progress");

		// Add diagnostic before photo
		actor.send({
			type: "ADD_PHOTO",
			photo: {
				phase: "diagnostic_before",
				imageUrl: "https://example.com/before.jpg",
				sha256: "sha256_before_hash",
				latitude: 19.4326,
				longitude: -99.1332,
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
				latitude: 19.4326,
				longitude: -99.1332,
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

	it("handles on-site damage discovery and supplemental quote approval", () => {
		const actor = createActor(serviceOrderMachine);
		actor.start();

		actor.send({
			type: "SUBMIT_REQUEST",
			customerId: "usr_c1",
			category: "plomeria",
			locationType: "residencial",
			urgency: "normal",
			totalCustomerCents: 45000,
		});
		actor.send({ type: "DISPATCH" });
		actor.send({ type: "ACCEPT_JOB", collaboratorId: "usr_t1" });
		actor.send({ type: "START_TRANSIT" });
		actor.send({ type: "ARRIVE_ON_SITE" });
		expect(actor.getSnapshot().value).toBe("in_progress");

		// Discover concealed pipe burst
		actor.send({
			type: "PROPOSE_SUPPLEMENTAL_QUOTE",
			supplementalCents: 20000, // $200.00 MXN extra
			reason: "Tubería de cobre reventada oculta dentro del muro",
		});
		expect(actor.getSnapshot().value).toBe("pending_quote_approval");
		expect(actor.getSnapshot().context.supplementalCents).toBe(20000);

		// Customer approves supplemental cost
		actor.send({ type: "APPROVE_SUPPLEMENTAL_QUOTE" });
		expect(actor.getSnapshot().value).toBe("in_progress");
		expect(actor.getSnapshot().context.totalCustomerCents).toBe(65000); // 45,000 + 20,000
	});

	it("enforces cancellation compensation penalty when client cancels in transit", () => {
		const actor = createActor(serviceOrderMachine);
		actor.start();

		actor.send({
			type: "SUBMIT_REQUEST",
			customerId: "usr_c2",
			category: "cerrajeria",
			locationType: "residencial",
			urgency: "emergencia_24_7",
			totalCustomerCents: 72000,
		});
		actor.send({ type: "DISPATCH" });
		actor.send({ type: "ACCEPT_JOB", collaboratorId: "usr_t2" });
		actor.send({ type: "START_TRANSIT" });
		expect(actor.getSnapshot().value).toBe("in_transit");

		// Customer cancels after technician traveled
		actor.send({ type: "CANCEL_IN_TRANSIT" });
		expect(actor.getSnapshot().value).toBe("cancelled");
		expect(actor.getSnapshot().context.cancellationFeeCents).toBe(15000); // $150 MXN
	});
});
