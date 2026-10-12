import type { ApiConfig } from "rune-lab/api";
import type { Surreal } from "surrealdb";
import type {
	ClientPort,
	Command,
	FavoriteAck,
	FavoriteMerge,
	ResolvedProperty,
	Notification,
	InboxSnapshot,
	InboxEvent,
	Metrics,
	UploadTicket,
	Asset,
} from "../../../core/src/contracts/operations.ts";
import type {
	SessionProfile,
	SigninInput,
	SignupInput,
} from "../../../core/src/contracts/auth.ts";
import type {
	PropertyCard,
	PropertyDetail,
	PropertyEditModel,
	PropertyMarker,
	PropertyQuery,
	PropertyStatus,
	CatalogResult,
} from "../../../core/src/contracts/property.ts";
import type {
	Lead,
	LeadCreateInput,
	LeadNote,
	LeadStage,
} from "../../../core/src/contracts/crm.ts";
import type {
	InquiryInput,
	InquiryReceipt,
} from "../../../core/src/contracts/inquiry.ts";
import { recordId } from "../../../core/src/contracts/ids.ts";
import { SDKError } from "../../../core/src/contracts/errors.ts";
import { decimal, decimalToMinor } from "../../../core/src/kernel/money.ts";
import { normalizePropertyQuery } from "../../../core/src/kernel/query.ts";
import * as schemas from "../../../core/src/schemas/mod.ts";

export interface HttpPort {
	request(path: string, options?: Record<string, unknown>): Promise<unknown>;
}
export interface BindingContext {
	db: Surreal;
	http: HttpPort;
	signal: AbortSignal;
	token: string | null;
}
/** Deployment-owned H20 adapter: exact native input mapping and wire result projection. */
export interface OperationBinding {
	readonly public?: boolean;
	/** Validate the frozen H20 input and convert locators/decimals to native SDK values. */
	prepare(input: unknown): unknown;
	execute(context: BindingContext, input: unknown): Promise<unknown>;
}
export interface ClientConfig {
	readonly manifest: { version: string; hash: string };
	readonly endpoint: string;
	readonly namespace: string;
	readonly database: string;
	readonly mainOrigin: string;
	readonly visionOrigin: string;
	readonly http?: ApiConfig;
	readonly maxPageSize: number;
	readonly publicStatuses: readonly PropertyStatus[];
	readonly currencies: Readonly<Record<string, number>>;
	readonly restoreTokenOnOutage: boolean;
	/** H20 must explicitly permit storing only an inquiry key and property locator. No contact fields. */
	readonly inquiryKeyPersistence?: boolean;
	readonly operations: Readonly<Record<string, OperationBinding>>;
	readonly mapAccepted?: boolean;
	readonly uploadOrigins: readonly string[];
	readonly maxUploadBytes: number;
	readonly mediaTypes: readonly string[];
	readonly createRequestKey: () => string;
	readonly classifyError: (error: unknown) => SDKError;
	readonly subscribeInbox?: (
		context: BindingContext,
		cursor: string,
		listener: (event: InboxEvent) => void,
	) => Promise<() => void>;
}
const protectedReads = new Set([
	"listFavoriteIds",
	"getMyListings",
	"getPropertyForEdit",
	"getLeads",
	"getLead",
	"getMetrics",
	"getInbox",
	"getActivities",
	"updateProfile",
	"changePassword",
	"setFavorite",
	"mergeFavorites",
	"createProperty",
	"updateProperty",
	"transitionProperty",
	"beginUpload",
	"completeUpload",
	"attachMedia",
	"updateMedia",
	"createLead",
	"updateLeadStage",
	"addLeadNote",
	"markNotifications",
]);
export class OpenHausClient implements ClientPort {
	private db: Surreal | null = null;
	private connection: Promise<void> | null = null;
	private controller = new AbortController();
	private epoch = 0;
	private disposed = false;
	private profile: SessionProfile | null = null;
	private sessionToken: string | null = null;
	private authQueue: Promise<unknown> = Promise.resolve();
	constructor(
		readonly config: ClientConfig | null,
		private http: HttpPort,
		private driver = async () => {
			const { Surreal } = await import("surrealdb");
			return new Surreal();
		},
	) {
		if (
			config &&
			(!config.manifest.hash ||
				!config.manifest.version ||
				!/^https?:\/\/|^wss?:\/\//.test(config.endpoint) ||
				!config.namespace ||
				!config.database ||
				!Number.isSafeInteger(config.maxPageSize) ||
				config.maxPageSize < 1)
		)
			throw SDKError.configuration("Invalid deployment configuration");
	}
	get configured() {
		return !!this.config;
	}
	get token() {
		return this.sessionToken;
	}
	get currentProfile() {
		return this.profile;
	}
	supports(operation: string) {
		return operation === "subscribeInbox"
			? !!this.config?.subscribeInbox
			: !!this.config?.operations[operation];
	}
	async connect(): Promise<void> {
		if (this.disposed) throw SDKError.cancelled();
		if (!this.config)
			throw SDKError.configuration("Deployment bindings are not configured");
		const config = this.config;
		if (!this.connection)
			this.connection = (async () => {
				const db = await this.driver();
				this.db = db;
				try {
					await db.connect(config.endpoint);
					await db.use({
						namespace: config.namespace,
						database: config.database,
					});
				} catch (error) {
					await db.close().catch(() => {});
					this.db = null;
					this.connection = null;
					throw this.failure(error);
				}
				if (this.disposed) {
					await db.close();
					throw SDKError.cancelled();
				}
			})();
		await this.connection;
	}
	private failure(error: unknown): SDKError {
		if (SDKError.isSDKError(error)) return error;
		if (error instanceof Error && error.name === "AbortError")
			return SDKError.cancelled();
		return (
			this.config?.classifyError(error) ??
			SDKError.configuration("Deployment bindings are not configured")
		);
	}
	private context(): BindingContext {
		if (!this.db)
			throw SDKError.unavailable("Database connection is unavailable");
		return {
			db: this.db,
			http: this.http,
			signal: this.controller.signal,
			token: this.sessionToken,
		};
	}
	private async call(
		operation: string,
		input: unknown,
		mutating = false,
	): Promise<unknown> {
		const binding = this.config?.operations[operation];
		if (!binding)
			throw SDKError.configuration(`Operation is not bound: ${operation}`);
		const prepared = binding.prepare(this.validateInput(operation, input));
		const generation = this.epoch;
		if (
			!binding.public &&
			!["signin", "signup", "authenticate"].includes(operation) &&
			!this.profile?.enabled
		)
			throw SDKError.unauthenticated();
		if (protectedReads.has(operation) && !this.profile)
			throw SDKError.unauthenticated();
		await this.connect();
		if (generation !== this.epoch || this.disposed) throw SDKError.cancelled();
		try {
			const result = await binding.execute(this.context(), prepared);
			if (generation !== this.epoch || this.disposed)
				throw SDKError.cancelled();
			return result;
		} catch (error) {
			const failure = this.failure(error);
			if (
				mutating &&
				["transport", "timeout", "unavailable"].includes(failure.kind)
			)
				throw SDKError.uncertain(
					"The command outcome needs reconciliation",
					failure,
				);
			throw failure;
		}
	}
	private validateInput(operation: string, input: unknown): unknown {
		const config = this.config;
		if (!config)
			throw SDKError.configuration("Deployment bindings are not configured");
		if (!input || typeof input !== "object")
			throw SDKError.validation("Missing operation input");
		const row = input as Record<string, unknown>;
		if (
			"request_key" in row &&
			(typeof row.request_key !== "string" || !row.request_key.trim())
		)
			throw SDKError.validation("Missing request key");
		if (
			"expected_revision" in row &&
			row.expected_revision !== undefined &&
			(!Number.isSafeInteger(row.expected_revision) ||
				Number(row.expected_revision) < 0)
		)
			throw SDKError.validation("Invalid revision");
		if (["signin", "signup", "requestPasswordReset"].includes(operation)) {
			const data = (row.payload ?? row) as Record<string, unknown>;
			if (
				typeof data.email !== "string" ||
				!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
			)
				throw SDKError.validation("Enter a valid email address");
			if (
				operation !== "requestPasswordReset" &&
				(typeof data.password !== "string" || !data.password)
			)
				throw SDKError.validation("Password is required");
			if (
				operation === "signup" &&
				(typeof data.display_name !== "string" || !data.display_name.trim())
			)
				throw SDKError.validation("Name is required");
		}
		if (operation === "submitInquiry") {
			schemas.validateSchema(schemas.InquiryInputSchema, row);
			recordId("property", row.property_id);
			if (
				!String(row.name).trim() ||
				!String(row.message).trim() ||
				!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))
			)
				throw SDKError.validation("Complete the inquiry contact fields");
		}
		if (row.payload && typeof row.payload === "object") {
			const data = row.payload as Record<string, unknown>;
			if ("property_id" in data) recordId("property", data.property_id);
			if ("id" in data && data.id !== undefined)
				recordId(
					operation.toLowerCase().includes("lead") ? "lead" : "property",
					data.id,
				);
			if (
				[
					"updateProperty",
					"transitionProperty",
					"attachMedia",
					"updateMedia",
					"updateLeadStage",
					"addLeadNote",
				].includes(operation) &&
				row.expected_revision === undefined
			)
				throw SDKError.validation("Expected revision is required");
			if (operation === "updateProperty" || operation === "createProperty") {
				const patch = data.patch as Record<string, unknown>;
				const fields = [
					"title",
					"description",
					"price",
					"currency",
					"operation",
					"property_type",
					"bedrooms",
					"bathrooms",
					"area_sqm",
					"lot_sqm",
					"parking_spots",
					"amenities",
					"address",
					"coordinates",
				];
				if (!patch || Object.keys(patch).some((k) => !fields.includes(k)))
					throw SDKError.validation("Unsupported listing field");
				this.checkValues(patch);
				if (
					operation === "createProperty" &&
					(!patch.title ||
						patch.price === undefined ||
						!patch.currency ||
						!patch.address)
				)
					throw SDKError.validation("Complete the draft fields");
			}
			if (operation === "createLead") {
				this.checkValues(data);
				if (
					!data.name ||
					typeof data.name !== "string" ||
					!data.name.trim() ||
					!data.currency
				)
					throw SDKError.validation("Lead name and currency are required");
				if (
					data.budget_min !== undefined &&
					data.budget_max !== undefined &&
					decimalToMinor(
						decimal(data.budget_min),
						config.currencies[String(data.currency)],
					) >
						decimalToMinor(
							decimal(data.budget_max),
							config.currencies[String(data.currency)],
						)
				)
					throw SDKError.validation("Minimum budget exceeds maximum");
			}
			if (operation === "setFavorite" && typeof data.desired !== "boolean")
				throw SDKError.validation("Desired save state is required");
			if (operation === "mergeFavorites") {
				if (
					!Array.isArray(data.ids) ||
					new Set(data.ids).size !== data.ids.length
				)
					throw SDKError.validation("Invalid save union");
				data.ids.forEach((id) => {
					recordId("property", id);
				});
			}
			if (
				operation === "addLeadNote" &&
				(!data.content ||
					typeof data.content !== "string" ||
					!data.content.trim())
			)
				throw SDKError.validation("Note content is required");
			if (
				operation === "transitionProperty" &&
				!["publish", "archive"].includes(String(data.action))
			)
				throw SDKError.validation("Unsupported listing transition");
			if (
				operation === "beginUpload" &&
				(!this.config ||
					!Number.isSafeInteger(data.size) ||
					Number(data.size) <= 0 ||
					Number(data.size) > this.config.maxUploadBytes ||
					!this.config.mediaTypes.includes(String(data.type)))
			)
				throw SDKError.validation("Unsupported upload size or type");
		}
		return input;
	}
	private validate<T>(schema: unknown, value: unknown): T {
		const decoded = schemas.validateSchema(
			schema as Parameters<typeof schemas.validateSchema>[0],
			value,
		);
		this.checkValues(decoded);
		return decoded as T;
	}
	private checkValues(value: unknown): void {
		if (Array.isArray(value)) {
			value.forEach((x) => {
				this.checkValues(x);
			});
			return;
		}
		if (!value || typeof value !== "object") return;
		const row = value as Record<string, unknown>;
		for (const [key, item] of Object.entries(row)) {
			if (
				["price", "budget_min", "budget_max", "pipeline_amount"].includes(
					key,
				) &&
				item !== undefined
			) {
				const amount = decimal(item);
				const code = row.currency;
				if (
					typeof code !== "string" ||
					this.config?.currencies[code] === undefined
				)
					throw SDKError.validation("Unsupported source currency");
				decimalToMinor(amount, this.config.currencies[code]);
			}
			if (typeof item === "number" && !Number.isFinite(item))
				throw SDKError.validation(`Invalid ${key}`);
			if (
				[
					"created_at",
					"updated_at",
					"received_at",
					"expires_at",
					"occurred_at",
					"date",
				].includes(key) &&
				(typeof item !== "string" || !Number.isFinite(Date.parse(item)))
			)
				throw SDKError.validation(`Invalid ${key}`);
			if (
				key === "coordinates" &&
				Array.isArray(item) &&
				(item.length !== 2 ||
					!item.every(Number.isFinite) ||
					Math.abs(item[0]) > 180 ||
					Math.abs(item[1]) > 90)
			)
				throw SDKError.validation("Invalid marker coordinates");
			if (
				(key.endsWith("_url") || key === "url") &&
				item !== undefined &&
				typeof item === "string"
			) {
				try {
					const url = new URL(item, "https://relative.invalid");
					if (!["http:", "https:"].includes(url.protocol)) throw new Error();
				} catch {
					throw SDKError.validation("Invalid asset URL");
				}
			}
			if (key === "coordinates" && item && !Array.isArray(item)) {
				const point = item as { lat: number; lng: number };
				if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180)
					throw SDKError.validation("Coordinates outside range");
			}
			this.checkValues(item);
		}
		if (typeof row.property_id === "string")
			recordId("property", row.property_id);
		if (typeof row.author_id === "string") recordId("user", row.author_id);
		if (Array.isArray(row.property_interests))
			row.property_interests.forEach((id) => {
				recordId("property", id);
			});
		if (typeof row.lead_id === "string") recordId("lead", row.lead_id);
		if (typeof row.id === "string") {
			if ("property_type" in row) recordId("property", row.id);
			else if ("stage" in row) recordId("lead", row.id);
			else if ("role" in row || ("email" in row && "name" in row))
				recordId("user", row.id);
		}
	}
	private auth<T>(operation: () => Promise<T>): Promise<T> {
		const next = this.authQueue.catch(() => {}).then(operation);
		this.authQueue = next.catch(() => {});
		return next;
	}
	private validateProfile(value: unknown): SessionProfile {
		const profile = this.validate<SessionProfile>(
			schemas.SessionProfileSchema,
			value,
		);
		if (!profile.enabled) throw SDKError.forbidden("Account is disabled");
		return profile;
	}
	private sign(
		operation: "signin" | "signup",
		input: SigninInput | SignupInput,
	): Promise<SessionProfile> {
		const generation = ++this.epoch;
		this.profile = null;
		this.sessionToken = null;
		return this.auth(async () => {
			if (generation !== this.epoch) throw SDKError.cancelled();
			const value = (await this.call(operation, input)) as {
				token?: unknown;
				profile?: unknown;
			};
			if (generation !== this.epoch) throw SDKError.cancelled();
			if (!value || typeof value.token !== "string" || !value.token)
				throw SDKError.validation("Invalid authentication acknowledgment");
			const profile = this.validateProfile(value.profile);
			this.sessionToken = value.token;
			this.profile = profile;
			return profile;
		});
	}
	signin(input: SigninInput) {
		return this.sign("signin", input);
	}
	signup(input: SignupInput) {
		const { role: _role, ...permitted } = input;
		return this.sign("signup", permitted);
	}
	authenticate(token: string): Promise<SessionProfile> {
		const generation = ++this.epoch;
		this.profile = null;
		this.sessionToken = null;
		return this.auth(async () => {
			if (generation !== this.epoch) throw SDKError.cancelled();
			const profile = this.validateProfile(
				await this.call("authenticate", { token }),
			);
			if (generation !== this.epoch) throw SDKError.cancelled();
			this.profile = profile;
			this.sessionToken = token;
			return profile;
		});
	}
	async invalidate(): Promise<void> {
		++this.epoch;
		this.profile = null;
		this.sessionToken = null;
		await this.auth(async () => {
			if (this.db) await this.db.invalidate();
		});
	}
	async disconnect(): Promise<void> {
		this.disposed = true;
		++this.epoch;
		this.controller.abort();
		this.profile = null;
		this.sessionToken = null;
		await this.authQueue.catch(() => {});
		await this.db?.close();
		this.db = null;
	}
	private async mutation<T>(
		operation: string,
		input: unknown,
		schema: unknown,
		verify?: (value: T) => void,
	): Promise<T> {
		const raw = await this.call(operation, input, true);
		try {
			const value = this.validate<T>(schema, raw);
			verify?.(value);
			return value;
		} catch (cause) {
			throw SDKError.uncertain(
				"The acknowledgment could not be verified. Reconcile the original command.",
				cause,
			);
		}
	}
	async updateProfile(command: Command<Record<string, unknown>>) {
		const profile = await this.mutation<SessionProfile>(
			"updateProfile",
			command,
			schemas.SessionProfileSchema,
			(value) => {
				if (!value.enabled || value.id !== this.profile?.id)
					throw SDKError.validation("Profile identity mismatch");
			},
		);
		this.profile = profile;
		return profile;
	}
	async accountCommand(
		operation:
			| "changePassword"
			| "requestPasswordReset"
			| "completePasswordReset"
			| "verifyEmail",
		command: Command<Record<string, unknown>>,
	) {
		return this.mutation<{ confirmed: true }>(
			operation,
			command,
			schemas.ConfirmationSchema,
		);
	}
	async searchCatalog(query: PropertyQuery) {
		const result = this.validate<CatalogResult<PropertyCard>>(
			schemas.CatalogSchema,
			await this.call(
				"searchCatalog",
				normalizePropertyQuery(
					query as Record<string, unknown>,
					this.config?.maxPageSize,
				),
			),
		);
		if (
			result.items.some(
				(row) => !this.config?.publicStatuses.includes(row.status),
			)
		)
			throw SDKError.validation("Catalog returned a nonpublic listing");
		if (
			result.items.length > result.limit ||
			result.items.length > result.total
		)
			throw SDKError.validation("Invalid catalog totals");
		return result;
	}
	async getPropertyDetail(locator: string) {
		if (!locator.trim()) throw SDKError.validation("Missing listing locator");
		const row = this.validate<PropertyDetail>(
			schemas.PropertyDetailSchema,
			await this.call("getPropertyDetail", { locator }),
		);
		if (!this.config?.publicStatuses.includes(row.status))
			throw SDKError.validation("Detail returned a nonpublic listing");
		return row;
	}
	async getMapMarkers(query: PropertyQuery) {
		if (!this.config?.mapAccepted)
			throw SDKError.configuration("Map acceptance is open");
		return this.validate<PropertyMarker[]>(
			schemas.PropertyMarkerSchema.array(),
			await this.call(
				"getMapMarkers",
				normalizePropertyQuery(
					query as Record<string, unknown>,
					this.config.maxPageSize,
				),
			),
		);
	}
	async resolveProperties(ids: readonly string[]) {
		const wanted = [...new Set(ids)].map((id) => recordId("property", id));
		if (wanted.length > 100)
			throw SDKError.validation("Resolve at most 100 IDs per batch");
		const rows = this.validate<ResolvedProperty[]>(
			schemas.ResolvedPropertySchema.array(),
			await this.call("resolveProperties", { ids: wanted }),
		);
		if (
			rows.length !== wanted.length ||
			new Set(rows.map((r) => r.id)).size !== wanted.length ||
			rows.some(
				(r) =>
					!wanted.includes(r.id) ||
					(r.status === "available" && (!r.property || r.property.id !== r.id)),
			)
		)
			throw SDKError.validation("Incomplete property resolution");
		return rows;
	}
	async listFavoriteIds() {
		const value = await this.call("listFavoriteIds", {});
		if (!Array.isArray(value)) throw SDKError.validation("Invalid favorites");
		return [...new Set(value.map((x) => recordId("property", x)))];
	}
	async setFavorite(
		command: Command<{ property_id: string; desired: boolean }>,
	) {
		return this.mutation<FavoriteAck>(
			"setFavorite",
			command,
			schemas.FavoriteAckSchema,
			(ack) => {
				if (
					ack.property_id !== command.payload.property_id ||
					ack.desired !== command.payload.desired
				)
					throw SDKError.validation("Favorite acknowledgment mismatch");
			},
		);
	}
	async mergeFavorites(command: Command<{ ids: readonly string[] }>) {
		return this.mutation<FavoriteMerge>(
			"mergeFavorites",
			command,
			schemas.FavoriteMergeSchema,
			(ack) => {
				if (
					new Set(ack.outcomes.map((x) => x.id)).size !==
						command.payload.ids.length ||
					command.payload.ids.some(
						(id) => !ack.outcomes.some((x) => x.id === id),
					)
				)
					throw SDKError.validation("Incomplete merge acknowledgment");
				ack.ids.forEach((id) => {
					recordId("property", id);
				});
				if (
					ack.outcomes.some(
						(x) => x.status === "confirmed" && !ack.ids.includes(x.id),
					)
				)
					throw SDKError.validation("Confirmed save missing from union");
			},
		);
	}
	async submitInquiry(input: InquiryInput) {
		return this.mutation<InquiryReceipt>(
			"submitInquiry",
			input,
			schemas.InquiryReceiptSchema,
			(receipt) => {
				if (receipt.property_id !== input.property_id || !receipt.receipt_id)
					throw SDKError.validation("Inquiry acknowledgment mismatch");
			},
		);
	}
	async lookupInquiry(key: string) {
		const result = await this.call("lookupInquiry", { request_key: key });
		return result === null
			? null
			: this.validate<InquiryReceipt>(schemas.InquiryReceiptSchema, result);
	}
	async getMyListings(status?: PropertyStatus) {
		return this.validate<PropertyEditModel[]>(
			schemas.PropertyEditSchema.array(),
			await this.call("getMyListings", { status }),
		);
	}
	async getPropertyForEdit(id: string) {
		const wanted = recordId("property", id),
			value = this.validate<PropertyEditModel>(
				schemas.PropertyEditSchema,
				await this.call("getPropertyForEdit", { id: wanted }),
			);
		if (value.id !== wanted)
			throw SDKError.validation("Listing identity mismatch");
		return value;
	}
	async saveProperty(
		command: Command<{ id?: string; patch: Record<string, unknown> }>,
	) {
		return this.mutation<PropertyEditModel>(
			command.payload.id ? "updateProperty" : "createProperty",
			command,
			schemas.PropertyEditSchema,
			(value) => {
				if (command.payload.id && value.id !== command.payload.id)
					throw SDKError.validation("Listing identity mismatch");
				if (
					command.expected_revision !== undefined &&
					value.revision <= command.expected_revision
				)
					throw SDKError.validation("Revision did not advance");
			},
		);
	}
	async transitionProperty(
		command: Command<{ id: string; action: "publish" | "archive" }>,
	) {
		return this.mutation<PropertyEditModel>(
			"transitionProperty",
			command,
			schemas.PropertyEditSchema,
			(value) => {
				if (
					value.id !== command.payload.id ||
					value.status !==
						(command.payload.action === "publish" ? "published" : "archived") ||
					value.revision <= Number(command.expected_revision)
				)
					throw SDKError.validation("Listing transition mismatch");
			},
		);
	}
	async beginUpload(
		command: Command<{
			property_id: string;
			name: string;
			size: number;
			type: string;
		}>,
	) {
		return this.mutation<UploadTicket>(
			"beginUpload",
			command,
			schemas.UploadTicketSchema,
			(ticket) => {
				if (
					!this.config?.uploadOrigins.includes(new URL(ticket.url).origin) ||
					Date.parse(ticket.expires_at) <= Date.now()
				)
					throw SDKError.validation(
						"Invalid upload destination or expired ticket",
					);
			},
		);
	}
	async completeUpload(command: Command<{ upload_id: string }>) {
		return this.mutation<Asset>("completeUpload", command, schemas.AssetSchema);
	}
	async attachMedia(
		command: Command<{ property_id: string; asset_id: string; cover: boolean }>,
	) {
		return this.mutation<PropertyEditModel>(
			"attachMedia",
			command,
			schemas.PropertyEditSchema,
			(value) => {
				if (
					value.id !== command.payload.property_id ||
					value.revision <= Number(command.expected_revision)
				)
					throw SDKError.validation("Media acknowledgment mismatch");
			},
		);
	}
	async getLeads() {
		return this.validate<Lead[]>(
			schemas.LeadSchema.array(),
			await this.call("getLeads", {}),
		);
	}
	async getLead(id: string) {
		const wanted = recordId("lead", id),
			value = this.validate<Lead>(
				schemas.LeadSchema,
				await this.call("getLead", { id: wanted }),
			);
		if (value.id !== wanted)
			throw SDKError.validation("Lead identity mismatch");
		return value;
	}
	async createLead(command: Command<LeadCreateInput>) {
		return this.mutation<Lead>("createLead", command, schemas.LeadSchema);
	}
	async updateLeadStage(command: Command<{ id: string; stage: LeadStage }>) {
		return this.mutation<Lead>(
			"updateLeadStage",
			command,
			schemas.LeadSchema,
			(value) => {
				if (
					value.id !== command.payload.id ||
					value.stage !== command.payload.stage ||
					value.revision <= Number(command.expected_revision)
				)
					throw SDKError.validation("Lead transition mismatch");
			},
		);
	}
	async addLeadNote(
		command: Command<{ id: string; content: string; is_pinned: boolean }>,
	) {
		return this.mutation<LeadNote>(
			"addLeadNote",
			command,
			schemas.LeadNoteSchema,
		);
	}
	async getMetrics() {
		return this.validate<Metrics>(
			schemas.MetricsSchema,
			await this.call("getMetrics", {}),
		);
	}
	async getInbox() {
		return this.validate<InboxSnapshot>(
			schemas.InboxSchema,
			await this.call("getInbox", {}),
		);
	}
	async markNotifications(command: Command<{ ids: readonly string[] }>) {
		return this.mutation<Notification[]>(
			"markNotifications",
			command,
			schemas.NotificationSchema.array(),
			(rows) => {
				if (
					rows.some(
						(row) => !command.payload.ids.includes(row.id) || !row.read_at,
					) ||
					new Set(rows.map((row) => row.id)).size !== rows.length
				)
					throw SDKError.validation("Read acknowledgment mismatch");
			},
		);
	}
	async subscribeInbox(cursor: string, listener: (event: InboxEvent) => void) {
		if (!this.config?.subscribeInbox)
			throw SDKError.configuration("Live inbox transport is not declared");
		const generation = this.epoch;
		await this.connect();
		const stop = await this.config.subscribeInbox(
			this.context(),
			cursor,
			(event) => {
				if (generation !== this.epoch || this.disposed) return;
				try {
					const decoded = this.validate<InboxEvent>(
						schemas.InboxEventSchema,
						event,
					);
					if (
						decoded.action === "upsert" &&
						(!decoded.item ||
							decoded.id !== decoded.item.id ||
							decoded.revision !== decoded.item.revision)
					)
						throw SDKError.validation("Invalid notification event");
					listener(decoded);
				} catch {
					listener({ action: "gap", id: "", revision: 0 });
				}
			},
		);
		if (generation !== this.epoch || this.disposed) {
			stop();
			throw SDKError.cancelled();
		}
		return stop;
	}
	async updateMedia(
		command: Command<{
			property_id: string;
			media_id: string;
			action: "cover" | "remove" | "move";
			order?: number;
		}>,
	) {
		return this.mutation<PropertyEditModel>(
			"updateMedia",
			command,
			schemas.PropertyEditSchema,
			(value) => {
				if (
					value.id !== command.payload.property_id ||
					value.revision <= Number(command.expected_revision)
				)
					throw SDKError.validation("Media revision mismatch");
			},
		);
	}
	async getActivities() {
		return this.validate<
			import("../../../core/src/contracts/operations.ts").Activity[]
		>(schemas.ActivitySchema.array(), await this.call("getActivities", {}));
	}
}
