import type { Coordinates } from "./item.ts";

export type PhotoQAPhase =
	| "diagnostic_before"
	| "work_progress"
	| "proof_finished";

export interface PhotoQAEvidence {
	id: string;
	jobOrderId: string;
	phase: PhotoQAPhase;
	imageUrl: string;
	thumbnailUrl: string;
	sha256Checksum: string;
	capturedAt: string;
	capturedLocation?: Coordinates;
	verifiedByOps: boolean;
	opsReviewerId?: string;
	createdAt: string;
}
