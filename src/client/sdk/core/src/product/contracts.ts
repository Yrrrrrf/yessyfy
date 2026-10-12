export const CONTRACT_VERSION = "YESSYFY-CLIENT/1";
export type Role = "customer" | "collaborator" | "operator" | "admin";
export type Status =
	| "pending_triage"
	| "dispatched"
	| "accepted"
	| "in_transit"
	| "in_progress"
	| "pending_quote_approval"
	| "pending_validation"
	| "validated"
	| "completed"
	| "disputed"
	| "cancelled";
export type Phase = "diagnostic_before" | "work_progress" | "proof_finished";
export type Action =
	| "offer.accept"
	| "offer.decline"
	| "order.start_transit"
	| "order.arrive"
	| "order.propose"
	| "order.request_review"
	| "order.review"
	| "order.cancel"
	| "order.report_no_show"
	| "quote.approve"
	| "quote.reject"
	| "dispatch.offer"
	| "qa.accept"
	| "qa.reject"
	| "finance.reconcile";
export interface Coordinates {
	lat: number;
	lng: number;
	accuracy?: number;
	observed_at?: string;
}
export interface Address {
	id?: string;
	label: string;
	street: string;
	city: string;
	postal_code: string;
	access: string;
	coordinates?: Coordinates;
}
export interface Profile {
	id: string;
	name: string;
	phone: string;
	roles: Role[];
	locale: "es" | "en";
	currency: "MXN";
	eligibility: "unsubmitted" | "submitted" | "verified" | "rejected";
	review_reason?: string;
	trades: string[];
	area: string;
	vehicle: string;
	fiscal: {
		rfc: string;
		name: string;
		postal_code: string;
		regime: string;
		use: string;
	};
	addresses: Address[];
	membership: { active: boolean; name?: string };
	duty: boolean;
	verification_documents?: {
		asset_id: string;
		kind: string;
		name: string;
		url: string;
	}[];
}
export interface Service {
	id: string;
	name: string;
	category: string;
	icon: string;
	description: string;
	included: string[];
	excluded: string[];
	modes: ("fixed" | "diagnostic")[];
	estimate_cents: number;
	area: string;
}
export interface Collaborator {
	id: string;
	name: string;
	trades: string[];
	area: string;
	rating: number;
	completed: number;
	verified: boolean;
	available: boolean;
	updated_at: string;
	bio: string;
}
export interface Slot {
	id: string;
	label: string;
	date: string;
	timezone: string;
	available: boolean;
}
export interface Booking {
	service_id: string;
	mode: "fixed" | "diagnostic";
	category: string;
	location_type: "residencial" | "comercial" | "premium";
	urgency: "normal" | "mismo_dia" | "emergencia_24_7";
	description: string;
	address: Address;
	date: string;
	slot: string;
	timezone: string;
	preferred_collaborator?: string;
}
export interface Quote {
	id: string;
	revision: number;
	order_id?: string;
	expires_at: string;
	scope: string;
	currency: "MXN";
	total_cents: number;
	base_cents: number;
	increment_cents: number;
	discount_cents: number;
	previous_total_cents: number;
	labor_cents: number;
	parts_cents: number;
	reason: string;
	status: "preview" | "pending" | "approved" | "rejected";
	allowed_actions: Action[];
}
export interface Evidence {
	id: string;
	order_id: string;
	phase: Phase;
	url: string;
	sha256: string;
	name: string;
	size: number;
	received_at: string;
	captured_at?: string;
	coordinates?: Coordinates;
	source: "camera" | "file";
}
export interface TimelineEntry {
	id: string;
	kind: string;
	actor: string;
	at: string;
	text: string;
}
export interface Order {
	id: string;
	code: string;
	revision: number;
	customer_id: string;
	customer_name: string;
	collaborator_id?: string;
	collaborator_name?: string;
	booking: Booking;
	quote: Quote;
	proposal?: Quote;
	status: Status;
	allowed_actions: Action[];
	evidence: Evidence[];
	timeline: TimelineEntry[];
	updated_at: string;
	qa: "not_ready" | "pending" | "accepted" | "rejected";
	customer_review: "pending" | "accepted" | "issue";
	finance: {
		payment: "pending" | "reserved" | "confirmed" | "failed";
		payout: "not_ready" | "pending" | "confirmed" | "failed";
		total_cents: number;
		fee_cents: number;
		net_cents: number;
		withholding_cents: number;
		receipt?: string;
	};
	telemetry?: Coordinates;
	eta_minutes?: number;
	pass?: { code: string; expires_at: string; vehicle: string };
	rating?: number;
	review_text?: string;
}
export interface Offer {
	id: string;
	revision: number;
	order_id: string;
	order_code: string;
	collaborator_id: string;
	expires_at: string;
	status: "pending" | "accepted" | "declined" | "expired";
	service: string;
	area: string;
	description: string;
	net_cents: number;
	allowed_actions: Action[];
}
export interface Message {
	id: string;
	order_id: string;
	sender_id: string;
	sender_name: string;
	text: string;
	at: string;
	moderated?: boolean;
}
export interface Notice {
	id: string;
	revision: number;
	title: string;
	body: string;
	at: string;
	read: boolean;
	surface: "main" | "vision";
	href: string;
}
export interface Case {
	id: string;
	revision: number;
	order_id: string;
	customer_id: string;
	category: string;
	description: string;
	status: "open" | "reviewing" | "resolved";
	resolution?: string;
	timeline: TimelineEntry[];
}
export interface Warranty {
	id: string;
	order_id: string;
	code: string;
	customer_id: string;
	starts_at: string;
	ends_at: string;
	status: "active" | "claimed" | "expired";
	terms: string;
	document_id: string;
}
export interface Document {
	id: string;
	order_id: string;
	kind: "report" | "warranty" | "invoice";
	status: "processing" | "ready" | "failed";
	filename: string;
	mime: string;
	url?: string;
	error?: string;
	receipt?: string;
}
export interface Payout {
	id: string;
	order_id: string;
	code: string;
	status: "pending" | "confirmed" | "failed";
	gross_cents: number;
	fee_cents: number;
	withholding_cents: number;
	net_cents: number;
	at: string;
	receipt?: string;
}
export interface Command {
	request_key: string;
	expected_revision?: number;
	payload: Record<string, unknown>;
}
export interface Receipt {
	request_key: string;
	confirmed: boolean;
	resource_id: string;
	revision?: number;
	state?: string;
}
export interface UploadTicket {
	id: string;
	url: string;
	expires_at: string;
	method: "PUT";
	headers: Record<string, string>;
}
export interface FeedEvent {
	cursor: number;
	kind: "order" | "inbox" | "conversation" | "offer" | "gap";
	resource_id?: string;
}
export interface Page<T> {
	items: T[];
	page: number;
	limit: number;
	total: number;
	has_more: boolean;
}
export interface Manifest {
	version: string;
	operations: string[];
	max_upload_bytes: number;
	mime_types: string[];
	timezone: string;
	areas: string[];
}
export interface Session {
	token: string;
	profile: Profile;
}
export interface Inputs {
	manifest: Record<string, never>;
	requestOtp: { phone: string };
	verifyOtp: { challenge_id: string; code: string };
	session: Record<string, never>;
	logout: Record<string, never>;
	catalog: Record<string, never>;
	slots: { service_id: string; date: string; city: string; urgency: string };
	collaborators: {
		category?: string;
		text?: string;
		area?: string;
		available?: boolean;
	};
	profile: Record<string, never>;
	profiles: Record<string, never>;
	updateProfile: Command;
	submitVerification: Command;
	previewQuote: { booking: Booking };
	createOrder: Command;
	orders: {
		view: "customer" | "field" | "ops";
		text?: string;
		status?: string;
		category?: string;
		urgency?: string;
		page?: number;
	};
	order: { id: string };
	offers: Record<string, never>;
	candidates: { order_id: string };
	offer: Command;
	acceptOffer: Command;
	declineOffer: Command;
	duty: Command;
	progress: Command;
	propose: Command;
	decideQuote: Command;
	review: Command;
	qa: Command;
	cancelPreview: { id: string; reason: string };
	cancelOrder: Command;
	reconcileFinance: Command;
	beginUpload: Command;
	renewUpload: Command;
	completeUpload: Command;
	attachEvidence: Command;
	attachVerification: Command;
	conversation: { order_id: string };
	sendMessage: Command;
	inbox: Record<string, never>;
	markRead: Command;
	events: { cursor: number };
	cases: Record<string, never>;
	case: { id: string };
	createCase: Command;
	resolveCase: Command;
	warranties: Record<string, never>;
	warranty: { id: string };
	documents: { order_id: string };
	requestDocument: Command;
	document: { id: string };
	payouts: Record<string, never>;
	receipt: { request_key: string };
}
export interface Results {
	manifest: Manifest;
	requestOtp: { challenge_id: string; expires_at: string };
	verifyOtp: Session;
	session: Profile;
	logout: { confirmed: true };
	catalog: Service[];
	slots: Slot[];
	collaborators: Collaborator[];
	profile: Profile;
	profiles: Profile[];
	updateProfile: Profile;
	submitVerification: Profile;
	previewQuote: Quote;
	createOrder: Order;
	orders: Page<Order>;
	order: Order;
	offers: Offer[];
	candidates: Collaborator[];
	offer: Offer;
	acceptOffer: Order;
	declineOffer: Offer;
	duty: Profile;
	progress: Order;
	propose: Order;
	decideQuote: Order;
	review: Order;
	qa: Order;
	cancelPreview: { fee_cents: number; reason: string; revision: number };
	cancelOrder: Order;
	reconcileFinance: Order;
	beginUpload: UploadTicket;
	renewUpload: UploadTicket;
	completeUpload: { asset_id: string };
	attachEvidence: Order;
	attachVerification: Profile;
	conversation: Message[];
	sendMessage: Message;
	inbox: { items: Notice[]; cursor: number };
	markRead: Notice[];
	events: FeedEvent[];
	cases: Case[];
	case: Case;
	createCase: Case;
	resolveCase: Case;
	warranties: Warranty[];
	warranty: Warranty;
	documents: Document[];
	requestDocument: Document;
	document: Document;
	payouts: Payout[];
	receipt: { operation: string; result: unknown } | null;
}
export type Operation = keyof Results;
export class ClientError extends Error {
	constructor(
		public kind:
			| "validation"
			| "unauthenticated"
			| "forbidden"
			| "not_found"
			| "conflict"
			| "unavailable"
			| "uncertain"
			| "configuration",
		message: string,
		public detail?: unknown,
	) {
		super(message);
		this.name = "ClientError";
	}
}
export interface ClientPort {
	token: string | null;
	call<K extends Operation>(
		operation: K,
		input: Inputs[K],
		signal?: AbortSignal,
	): Promise<Results[K]>;
	dispose(): void;
}
export function cents(value: unknown): number {
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value < 0 ||
		value > 1_000_000_000_000
	)
		throw new ClientError("validation", "Invalid centavo amount");
	return value;
}
export function money(value: number, locale = "es"): string {
	const n = BigInt(cents(value));
	return `${locale === "es" ? "$" : "MXN $"}${new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US").format(n / 100n)}.${String(n % 100n).padStart(2, "0")}${locale === "es" ? " MXN" : ""}`;
}
export function integerInput(text: string): number {
	if (!/^\d+(\.\d{1,2})?$/.test(text.trim()))
		throw new ClientError(
			"validation",
			"Enter a non-negative amount with at most two decimals",
		);
	const [whole, fraction = ""] = text.trim().split(".");
	return cents(Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))));
}
export function bookingErrors(b: Booking): Record<string, string> {
	const e: Record<string, string> = {};
	if (!b.service_id) e.service_id = "Choose a service";
	if (b.description.trim().length < 10)
		e.description = "Describe the work in at least 10 characters";
	if (!b.address.street.trim()) e.street = "Enter the address";
	if (!b.address.city.trim()) e.city = "Enter the city";
	if (!/^\d{5}$/.test(b.address.postal_code))
		e.postal_code = "Enter a five-digit postal code";
	if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) e.date = "Choose a date";
	if (!b.slot) e.slot = "Choose a time window";
	return e;
}
export function safePath(path: string): string | null {
	return path.startsWith("/") &&
		!path.startsWith("//") &&
		!/[\\\u0000-\u001f]/.test(path)
		? path
		: null;
}
export function safeResourceUrl(value: unknown): string {
	if (typeof value !== "string" || !value)
		throw new ClientError("validation", "Invalid resource URL");
	if (safePath(value)) return value;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new ClientError("validation", "Invalid resource URL");
	}
	if (
		!["https:", "http:"].includes(url.protocol) ||
		url.username ||
		url.password
	)
		throw new ClientError("validation", "Invalid resource destination");
	return value;
}
export function validateResult<K extends Operation>(
	op: K,
	value: unknown,
): Results[K] {
	const object = (v: unknown): Record<string, unknown> => {
		if (!v || typeof v !== "object" || Array.isArray(v))
			throw new ClientError("validation", `Invalid ${op} response`);
		return v as Record<string, unknown>;
	};
	const id = (v: unknown) => {
		const r = object(v);
		if (typeof r.id !== "string" || !r.id)
			throw new ClientError("validation", "Missing resource identity");
		return r;
	};
	const revision = (v: unknown) => {
		const r = id(v);
		if (!Number.isSafeInteger(r.revision) || Number(r.revision) < 1)
			throw new ClientError("validation", "Invalid revision");
		return r;
	};
	const profile = (v: unknown) => {
		const r = id(v);
		if (r.verification_documents) {
			if (!Array.isArray(r.verification_documents))
				throw new ClientError("validation", "Invalid verification documents");
			r.verification_documents.forEach((d) => safeResourceUrl(object(d).url));
		}
		if (
			!Array.isArray(r.roles) ||
			!r.roles.every((x) =>
				["customer", "collaborator", "operator", "admin"].includes(String(x)),
			) ||
			typeof r.name !== "string" ||
			typeof r.phone !== "string" ||
			r.currency !== "MXN" ||
			!["unsubmitted", "submitted", "verified", "rejected"].includes(
				String(r.eligibility),
			) ||
			!Array.isArray(r.trades) ||
			!r.fiscal ||
			!r.membership ||
			!Array.isArray(r.addresses) ||
			!["es", "en"].includes(String(r.locale))
		)
			throw new ClientError("validation", "Invalid session profile");
	};
	const quote = (v: unknown) => {
		const r = revision(v);
		if (
			r.currency !== "MXN" ||
			typeof r.expires_at !== "string" ||
			!Number.isFinite(Date.parse(r.expires_at)) ||
			!Array.isArray(r.allowed_actions)
		)
			throw new ClientError("validation", "Invalid quote");
		for (const k of [
			"total_cents",
			"base_cents",
			"increment_cents",
			"discount_cents",
			"previous_total_cents",
			"labor_cents",
			"parts_cents",
		])
			cents(r[k]);
	};
	const actions = (v: unknown) => {
		if (
			!Array.isArray(v) ||
			v.some(
				(x) =>
					![
						"offer.accept",
						"offer.decline",
						"order.start_transit",
						"order.arrive",
						"order.propose",
						"order.request_review",
						"order.review",
						"order.cancel",
						"order.report_no_show",
						"quote.approve",
						"quote.reject",
						"dispatch.offer",
						"qa.accept",
						"qa.reject",
						"finance.reconcile",
					].includes(String(x)),
			)
		)
			throw new ClientError("validation", "Invalid action capability");
	};
	const order = (v: unknown) => {
		const r = revision(v);
		if (
			typeof r.code !== "string" ||
			typeof r.customer_id !== "string" ||
			!Array.isArray(r.allowed_actions) ||
			!Array.isArray(r.evidence) ||
			!Array.isArray(r.timeline) ||
			![
				"pending_triage",
				"dispatched",
				"accepted",
				"in_transit",
				"in_progress",
				"pending_quote_approval",
				"pending_validation",
				"validated",
				"completed",
				"disputed",
				"cancelled",
			].includes(String(r.status))
		)
			throw new ClientError("validation", "Invalid order");
		actions(r.allowed_actions);
		quote(r.quote);
		if (r.proposal) quote(r.proposal);
		(r.evidence as unknown[]).forEach((e) => safeResourceUrl(id(e).url));
		const f = object(r.finance);
		for (const k of [
			"total_cents",
			"fee_cents",
			"net_cents",
			"withholding_cents",
		])
			cents(f[k]);
		const b = object(r.booking),
			address = object(b.address);
		for (const k of [
			"service_id",
			"category",
			"mode",
			"location_type",
			"urgency",
			"description",
			"date",
			"slot",
			"timezone",
		])
			if (typeof b[k] !== "string")
				throw new ClientError("validation", "Incomplete booking");
		for (const k of ["street", "city", "postal_code", "access"])
			if (typeof address[k] !== "string")
				throw new ClientError("validation", "Incomplete address");
		if (
			!["not_ready", "pending", "accepted", "rejected"].includes(
				String(r.qa),
			) ||
			!["pending", "accepted", "issue"].includes(String(r.customer_review)) ||
			!["pending", "reserved", "confirmed", "failed"].includes(
				String(f.payment),
			) ||
			!["not_ready", "pending", "confirmed", "failed"].includes(
				String(f.payout),
			)
		)
			throw new ClientError("validation", "Invalid outcome state");
	};
	const array = (fn: (v: unknown) => void) => {
		if (!Array.isArray(value))
			throw new ClientError("validation", "Invalid list");
		value.forEach(fn);
	};
	if (op === "manifest") {
		const r = object(value);
		if (
			r.version !== CONTRACT_VERSION ||
			!Array.isArray(r.operations) ||
			!Number.isSafeInteger(r.max_upload_bytes) ||
			!Array.isArray(r.mime_types) ||
			typeof r.timezone !== "string"
		)
			throw new ClientError(
				"configuration",
				"Client/service contract mismatch",
			);
	} else if (op === "verifyOtp") {
		const r = object(value);
		if (typeof r.token !== "string" || !r.token)
			throw new ClientError("validation", "Missing session token");
		profile(r.profile);
	} else if (
		[
			"session",
			"profile",
			"updateProfile",
			"submitVerification",
			"duty",
			"attachVerification",
		].includes(op)
	)
		profile(value);
	else if (op === "profiles") array(profile);
	else if (op === "previewQuote") quote(value);
	else if (
		[
			"order",
			"createOrder",
			"acceptOffer",
			"progress",
			"propose",
			"decideQuote",
			"review",
			"qa",
			"cancelOrder",
			"reconcileFinance",
			"attachEvidence",
		].includes(op)
	)
		order(value);
	else if (op === "orders") {
		const r = object(value);
		if (
			!Array.isArray(r.items) ||
			!Number.isSafeInteger(r.total) ||
			!Number.isSafeInteger(r.page)
		)
			throw new ClientError("validation", "Invalid page");
		r.items.forEach(order);
	} else if (op === "beginUpload" || op === "renewUpload") {
		const r = id(value);
		safeResourceUrl(r.url);
		if (
			r.method !== "PUT" ||
			!Number.isFinite(Date.parse(String(r.expires_at))) ||
			!r.headers ||
			typeof r.headers !== "object"
		)
			throw new ClientError("validation", "Invalid private upload ticket");
	} else if (["document", "requestDocument"].includes(op)) {
		const r = id(value);
		if (!["processing", "ready", "failed"].includes(String(r.status)))
			throw new ClientError("validation", "Invalid document status");
		if (r.url) safeResourceUrl(r.url);
		if (r.status === "ready" && !r.url)
			throw new ClientError("validation", "Missing authorized document URL");
	} else if (
		[
			"catalog",
			"slots",
			"collaborators",
			"candidates",
			"offers",
			"conversation",
			"cases",
			"warranties",
			"documents",
			"payouts",
			"markRead",
		].includes(op)
	)
		array((v) => {
			const r = id(v);
			if (op === "catalog") {
				cents(r.estimate_cents);
				if (
					!Array.isArray(r.modes) ||
					!r.modes.length ||
					r.modes.some((x) => !["fixed", "diagnostic"].includes(String(x))) ||
					!Array.isArray(r.included) ||
					!Array.isArray(r.excluded) ||
					typeof r.name !== "string" ||
					typeof r.category !== "string"
				)
					throw new ClientError("validation", "Invalid catalog service");
			}
			if (
				op === "slots" &&
				(typeof r.label !== "string" ||
					typeof r.available !== "boolean" ||
					typeof r.date !== "string" ||
					typeof r.timezone !== "string")
			)
				throw new ClientError("validation", "Invalid availability window");
			if (
				(op === "collaborators" || op === "candidates") &&
				(!Array.isArray(r.trades) ||
					typeof r.name !== "string" ||
					typeof r.verified !== "boolean" ||
					typeof r.available !== "boolean")
			)
				throw new ClientError("validation", "Invalid public profile");
			if (op === "documents" && r.url) safeResourceUrl(r.url);
			if (op === "payouts")
				for (const k of [
					"gross_cents",
					"fee_cents",
					"withholding_cents",
					"net_cents",
				])
					cents(r[k]);
			if (op === "offers") {
				revision(r);
				cents(r.net_cents);
				actions(r.allowed_actions);
			}
		});
	else if (op === "events") {
		if (
			!Array.isArray(value) ||
			value.some((v) => !Number.isSafeInteger(object(v).cursor))
		)
			throw new ClientError("validation", "Invalid event cursor");
	} else if (op === "inbox") {
		const r = object(value);
		if (!Array.isArray(r.items) || !Number.isSafeInteger(r.cursor))
			throw new ClientError("validation", "Invalid inbox");
		r.items.forEach((v) => {
			const n = id(v);
			if (
				typeof n.href !== "string" ||
				!safePath(n.href) ||
				!["main", "vision"].includes(String(n.surface))
			)
				throw new ClientError("validation", "Invalid notification destination");
		});
	} else if (op === "receipt") {
		if (value !== null) {
			const r = object(value);
			if (
				typeof r.operation !== "string" ||
				!("result" in r) ||
				r.operation === "receipt"
			)
				throw new ClientError("validation", "Invalid receipt");
			validateResult(r.operation as Operation, r.result);
		}
	} else if (op === "requestOtp") {
		const r = object(value);
		if (typeof r.challenge_id !== "string" || typeof r.expires_at !== "string")
			throw new ClientError("validation", "Invalid OTP challenge");
	} else if (op === "completeUpload") {
		if (typeof object(value).asset_id !== "string")
			throw new ClientError("validation", "Invalid asset");
	} else if (op === "cancelPreview") {
		const r = object(value);
		cents(r.fee_cents);
		if (!Number.isSafeInteger(r.revision))
			throw new ClientError("validation", "Invalid cancellation revision");
	} else if (op === "logout") {
		if (object(value).confirmed !== true)
			throw new ClientError("validation", "Sign-out was not acknowledged");
	} else id(value);
	return value as Results[K];
}
