import type {
	LocationType,
	PhotoQAPhase,
	ServiceCategory,
	UrgencyLevel,
} from "@sdk";
import { assign, setup } from "xstate";

export interface ServiceOrderPhoto {
	phase: PhotoQAPhase;
	imageUrl: string;
	sha256: string;
	latitude?: number;
	longitude?: number;
}

export interface ServiceOrderContext {
	orderId: string;
	code: string;
	customerId: string;
	collaboratorId: string | null;
	category: ServiceCategory;
	locationType: LocationType;
	urgency: UrgencyLevel;
	baseBudgetCents: number;
	supplementalCents: number;
	supplementalReason: string | null;
	totalCustomerCents: number;
	collaboratorNetCents: number;
	cancellationFeeCents: number;
	photos: ServiceOrderPhoto[];
	rating: number | null;
	disputeReason: string | null;
	warrantyCertificateId: string | null;
}

export type ServiceOrderEvent =
	| {
			type: "SUBMIT_REQUEST";
			customerId: string;
			category: ServiceCategory;
			locationType: LocationType;
			urgency: UrgencyLevel;
			totalCustomerCents: number;
	  }
	| { type: "DISPATCH" }
	| { type: "ACCEPT_JOB"; collaboratorId: string }
	| { type: "START_TRANSIT"; etaMinutes?: number }
	| { type: "ARRIVE_ON_SITE"; distanceMeters?: number }
	| {
			type: "PROPOSE_SUPPLEMENTAL_QUOTE";
			supplementalCents: number;
			reason: string;
	  }
	| { type: "APPROVE_SUPPLEMENTAL_QUOTE" }
	| { type: "REJECT_SUPPLEMENTAL_QUOTE" }
	| { type: "START_WIND_DOWN" }
	| {
			type: "ADD_PHOTO";
			photo: ServiceOrderPhoto;
	  }
	| { type: "SUBMIT_QA" }
	| { type: "VALIDATE_OK"; rating: number }
	| { type: "REPORT_ISSUE"; reason: string }
	| { type: "RESOLVE_DISPUTE" }
	| { type: "SETTLE_PAYOUT"; warrantyCertificateId: string }
	| { type: "CANCEL"; reason?: string }
	| { type: "CANCEL_IN_TRANSIT" }
	| { type: "CUSTOMER_NO_SHOW" };

export const serviceOrderMachine = setup({
	types: {
		context: {} as ServiceOrderContext,
		events: {} as ServiceOrderEvent,
	},
	guards: {
		hasDiagnosticPhoto: ({ context }) =>
			context.photos.some((p) => p.phase === "diagnostic_before"),
		hasProofFinishedPhoto: ({ context }) =>
			context.photos.some((p) => p.phase === "proof_finished"),
		canDisbursePayout: ({ context }) =>
			context.photos.length >= 2 &&
			context.photos.some((p) => p.phase === "diagnostic_before") &&
			context.photos.some((p) => p.phase === "proof_finished"),
	},
	actions: {
		assignRequest: assign({
			customerId: ({ event }) =>
				event.type === "SUBMIT_REQUEST" ? event.customerId : "",
			category: ({ event, context }) =>
				event.type === "SUBMIT_REQUEST" ? event.category : context.category,
			locationType: ({ event, context }) =>
				event.type === "SUBMIT_REQUEST"
					? event.locationType
					: context.locationType,
			urgency: ({ event, context }) =>
				event.type === "SUBMIT_REQUEST" ? event.urgency : context.urgency,
			totalCustomerCents: ({ event, context }) =>
				event.type === "SUBMIT_REQUEST"
					? event.totalCustomerCents
					: context.totalCustomerCents,
		}),
		assignCollaborator: assign({
			collaboratorId: ({ event }) =>
				event.type === "ACCEPT_JOB" ? event.collaboratorId : null,
		}),
		setSupplementalProposal: assign({
			supplementalCents: ({ event }) =>
				event.type === "PROPOSE_SUPPLEMENTAL_QUOTE"
					? event.supplementalCents
					: 0,
			supplementalReason: ({ event }) =>
				event.type === "PROPOSE_SUPPLEMENTAL_QUOTE" ? event.reason : null,
		}),
		approveSupplemental: assign({
			totalCustomerCents: ({ context }) =>
				context.totalCustomerCents + context.supplementalCents,
		}),
		rejectSupplemental: assign({
			supplementalCents: 0,
			supplementalReason: null,
		}),
		appendPhoto: assign({
			photos: ({ context, event }) =>
				event.type === "ADD_PHOTO"
					? [...context.photos, event.photo]
					: context.photos,
		}),
		setRating: assign({
			rating: ({ event }) =>
				event.type === "VALIDATE_OK" ? event.rating : null,
		}),
		setDispute: assign({
			disputeReason: ({ event }) =>
				event.type === "REPORT_ISSUE" ? event.reason : null,
		}),
		setWarranty: assign({
			warrantyCertificateId: ({ event }) =>
				event.type === "SETTLE_PAYOUT" ? event.warrantyCertificateId : null,
		}),
		setTransitCancelPenalty: assign({
			cancellationFeeCents: 15000, // $150.00 MXN displacement compensation
		}),
		setNoShowPenalty: assign({
			cancellationFeeCents: 25000, // $250.00 MXN customer no-show penalty
		}),
	},
}).createMachine({
	id: "serviceOrder",
	initial: "draft",
	context: {
		orderId: "YSF-ORD-001",
		code: "YSF-2026-0001",
		customerId: "",
		collaboratorId: null,
		category: "plomeria",
		locationType: "residencial",
		urgency: "normal",
		baseBudgetCents: 45000,
		supplementalCents: 0,
		supplementalReason: null,
		totalCustomerCents: 45000,
		collaboratorNetCents: 34335,
		cancellationFeeCents: 0,
		photos: [],
		rating: null,
		disputeReason: null,
		warrantyCertificateId: null,
	},
	states: {
		draft: {
			on: {
				SUBMIT_REQUEST: {
					target: "pending_triage",
					actions: "assignRequest",
				},
			},
		},
		pending_triage: {
			on: {
				DISPATCH: { target: "dispatched" },
				CANCEL: { target: "cancelled" },
			},
		},
		dispatched: {
			on: {
				ACCEPT_JOB: {
					target: "accepted",
					actions: "assignCollaborator",
				},
				CANCEL: { target: "cancelled" },
			},
		},
		accepted: {
			on: {
				START_TRANSIT: { target: "in_transit" },
				CANCEL: { target: "cancelled" },
			},
		},
		in_transit: {
			on: {
				ARRIVE_ON_SITE: { target: "in_progress" },
				CANCEL_IN_TRANSIT: {
					target: "cancelled",
					actions: "setTransitCancelPenalty",
				},
				CUSTOMER_NO_SHOW: {
					target: "cancelled",
					actions: "setNoShowPenalty",
				},
				CANCEL: { target: "cancelled" },
			},
		},
		in_progress: {
			on: {
				ADD_PHOTO: { actions: "appendPhoto" },
				PROPOSE_SUPPLEMENTAL_QUOTE: {
					target: "pending_quote_approval",
					actions: "setSupplementalProposal",
				},
				START_WIND_DOWN: { target: "winding_down" },
				REPORT_ISSUE: {
					target: "disputed",
					actions: "setDispute",
				},
			},
		},
		pending_quote_approval: {
			on: {
				APPROVE_SUPPLEMENTAL_QUOTE: {
					target: "in_progress",
					actions: "approveSupplemental",
				},
				REJECT_SUPPLEMENTAL_QUOTE: {
					target: "in_progress",
					actions: "rejectSupplemental",
				},
			},
		},
		winding_down: {
			on: {
				ADD_PHOTO: { actions: "appendPhoto" },
				SUBMIT_QA: {
					target: "pending_validation",
				},
			},
		},
		pending_validation: {
			on: {
				VALIDATE_OK: {
					target: "validated",
					actions: "setRating",
				},
				REPORT_ISSUE: {
					target: "disputed",
					actions: "setDispute",
				},
			},
		},
		validated: {
			on: {
				SETTLE_PAYOUT: {
					guard: "canDisbursePayout",
					target: "completed",
					actions: "setWarranty",
				},
				REPORT_ISSUE: {
					target: "disputed",
					actions: "setDispute",
				},
			},
		},
		completed: {
			type: "final",
		},
		disputed: {
			on: {
				RESOLVE_DISPUTE: { target: "in_progress" },
				CANCEL: { target: "cancelled" },
			},
		},
		cancelled: {
			type: "final",
		},
	},
});
