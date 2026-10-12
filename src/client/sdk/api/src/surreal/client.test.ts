import {
	deepStrictEqual as assertEquals,
	ok as assert,
	rejects as assertRejects,
} from "node:assert/strict";
import type { Surreal } from "surrealdb";
import {
	type ClientConfig,
	type HttpPort,
	OpenHausClient,
	type OperationBinding,
} from "./client.ts";
import { recordId } from "../../../core/src/contracts/ids.ts";
import { SDKError } from "../../../core/src/contracts/errors.ts";
const http: HttpPort = {
	request: async () => {
		throw SDKError.configuration("Fixture has no HTTP service");
	},
};
const driver = async () =>
	({
		connect: async () => {},
		use: async () => {},
		close: async () => {},
		invalidate: async () => {},
	}) as unknown as Surreal;
const binding = (
	execute: OperationBinding["execute"],
	isPublic = false,
): OperationBinding => ({
	public: isPublic,
	prepare: (input) => input,
	execute,
});
const profile = {
	id: "user:a",
	email: "a@example.test",
	display_name: "A",
	role: "agent",
	enabled: true,
	email_verified: true,
};
const config = (operations: ClientConfig["operations"]): ClientConfig => ({
	manifest: { version: "fixture", hash: "fixture-only" },
	endpoint: "wss://fixture.example.test/rpc",
	namespace: "fixture",
	database: "fixture",
	mainOrigin: "https://main.example.test",
	visionOrigin: "https://vision.example.test",
	maxPageSize: 100,
	publicStatuses: ["published"],
	currencies: { USD: 2, JPY: 0, BHD: 3 },
	restoreTokenOnOutage: true,
	uploadOrigins: ["https://uploads.example.test"],
	maxUploadBytes: 100000,
	mediaTypes: ["image/png"],
	operations,
	createRequestKey: () => "fixture-key",
	classifyError: (error) =>
		SDKError.isSDKError(error)
			? error
			: SDKError.transport("Fixture transport error", error),
});
Deno.test("unconfigured client fails before native driver creation", async () => {
	let created = 0;
	const client = new OpenHausClient(null, http, async () => {
		created++;
		return driver();
	});
	await assertRejects(() => client.searchCatalog({}), SDKError);
	assertEquals(created, 0);
});
Deno.test("native port mutation has one attempt and preserves uncertain outcome", async () => {
	let calls = 0;
	const client = new OpenHausClient(
		config({
			signin: binding(async () => ({ token: "token", profile })),
			setFavorite: binding(async () => {
				calls++;
				throw SDKError.transport("lost acknowledgment");
			}),
		}),
		http,
		driver,
	);
	await client.signin({ email: "a@example.test", password: "x" });
	try {
		await client.setFavorite({
			request_key: "one",
			payload: {
				property_id: recordId("property", "property:a"),
				desired: true,
			},
		});
		throw new Error("Expected uncertainty");
	} catch (error) {
		assertEquals((error as SDKError).kind, "uncertain");
	}
	assertEquals(calls, 1);
	await client.disconnect();
});
Deno.test("invalid role never authenticates the client", async () => {
	const client = new OpenHausClient(
		config({
			signin: binding(async () => ({
				token: "token",
				profile: { ...profile, role: "owner" },
			})),
		}),
		http,
		driver,
	);
	await assertRejects(
		() => client.signin({ email: "a@example.test", password: "x" }),
		SDKError,
	);
	assertEquals(client.currentProfile, null);
	assertEquals(client.token, null);
});
Deno.test("null inquiry acknowledgment never fabricates a receipt", async () => {
	const client = new OpenHausClient(
		config({ submitInquiry: binding(async () => null, true) }),
		http,
		driver,
	);
	try {
		await client.submitInquiry({
			property_id: recordId("property", "property:a"),
			name: "A",
			email: "a@example.test",
			message: "Hello",
			request_key: "one",
		});
		throw new Error("Expected uncertainty");
	} catch (error) {
		assertEquals((error as SDKError).kind, "uncertain");
	}
});
Deno.test("wrong table and excess currency precision are rejected on reads", async () => {
	const card = {
		id: "user:a",
		slug: "a",
		title: "A",
		price: "1.001",
		currency: "USD",
		operation: "sale",
		property_type: "house",
		status: "published",
		address: { city: "A", state: "B" },
	};
	const client = new OpenHausClient(
		config({
			searchCatalog: binding(
				async () => ({
					items: [card],
					total: 1,
					page: 1,
					limit: 12,
					has_more: false,
				}),
				true,
			),
		}),
		http,
		driver,
	);
	await assertRejects(() => client.searchCatalog({}), SDKError);
});
Deno.test("inputs and revisions reject before executing a mutation", async () => {
	let called = 0;
	const client = new OpenHausClient(
		config({
			signin: binding(async () => ({ token: "token", profile })),
			updateProperty: binding(async () => {
				called++;
				return null;
			}),
		}),
		http,
		driver,
	);
	await client.signin({ email: "a@example.test", password: "x" });
	await assertRejects(
		() =>
			client.saveProperty({
				request_key: "one",
				payload: { id: "property:a", patch: { title: "B" } },
			}),
		SDKError,
		"Expected revision",
	);
	assertEquals(called, 0);
});
Deno.test("favorite acknowledgment must correlate ID and desired state", async () => {
	const client = new OpenHausClient(
		config({
			signin: binding(async () => ({ token: "token", profile })),
			setFavorite: binding(async () => ({
				property_id: "property:other",
				desired: true,
			})),
		}),
		http,
		driver,
	);
	await client.signin({ email: "a@example.test", password: "x" });
	try {
		await client.setFavorite({
			request_key: "one",
			payload: {
				property_id: recordId("property", "property:a"),
				desired: true,
			},
		});
		throw new Error("Expected uncertainty");
	} catch (error) {
		assertEquals((error as SDKError).kind, "uncertain");
	}
});

Deno.test("deployment rejects a mismatched server before dispatching an operation", async () => {
	const { createDeployment } = await import("../../../../config/deployment.ts");
	const paths: string[] = [];
	const client = new OpenHausClient(
		createDeployment(),
		{
			request: async (path) => {
				paths.push(path);
				return {
					version: "different",
					hash: "wrong",
					namespace: "openhaus",
					database: "main",
				};
			},
		},
		driver,
	);
	try {
		await assertRejects(() => client.searchCatalog({}), {
			name: "SDKError",
			kind: "configuration",
		});
		assertEquals(paths, ["/v1/contract"]);
	} finally {
		await client.disconnect();
	}
});

let live = false;
try {
	live = !!Deno.env.get("OH_TEST_API_URL");
} catch {
	/* pure tests do not need environment access */
}
Deno.test({
	name: "paired client: native identity, listings, uploads, catalog, favorites, inquiries, CRM, inbox, recovery",
	ignore: !live,
	sanitizeResources: false,
	sanitizeOps: false,
	async fn() {
		const { createDeployment } = await import(
			"../../../../config/deployment.ts"
		);
		const { up } = await import("npm:up-fetch@2.6.1");
		const apiOrigin = Deno.env.get("OH_TEST_API_URL")!;
		const dbOrigin = Deno.env.get("GWA_DB_URL")!;
		const transport = up(fetch, () => ({
			baseUrl: apiOrigin,
			retry: { attempts: 0 },
		}));
		const http: HttpPort = {
			request: (path, options) => transport(path, options),
		};
		const cfg = createDeployment({
			apiOrigin,
			databaseEndpoint: dbOrigin.replace(/^http/, "ws") + "/rpc",
		});
		const client = new OpenHausClient(cfg, http);
		const other = new OpenHausClient(cfg, http);
		const outsider = new OpenHausClient(cfg, http);
		const visitor = new OpenHausClient(cfg, http);
		const key = () => crypto.randomUUID();
		const title = `Paired home ${key()}`;
		const command = <T>(payload: T, revision?: number) => ({
			request_key: key(),
			payload,
			...(revision === undefined ? {} : { expected_revision: revision }),
		});
		const rootSQL = async (query: string) => {
			const response = await fetch(dbOrigin + "/sql", {
				method: "POST",
				headers: {
					Authorization:
						"Basic " +
						btoa(
							`${Deno.env.get("GWA_DB_USER")}:${Deno.env.get(
								"GWA_DB_PASSWORD",
							)}`,
						),
					Accept: "application/json",
					"Content-Type": "text/plain",
					"surreal-ns": cfg.namespace,
					"surreal-db": cfg.database,
				},
				body: query,
			});
			const rows = await response.json();
			assert(
				response.ok && rows.every((r: { status: string }) => r.status === "OK"),
				JSON.stringify(rows),
			);
			return rows;
		};
		let stop: (() => void) | undefined;
		try {
			const agent = await client.signin({
				email: "agent@openhaus.test",
				password: "OpenHausAgent12!",
			});
			assert(agent.role === "agent");
			const profile = await client.updateProfile(
				command({
					display_name: "Paired Agent",
					phone: "",
					locale: "en",
					preferred_currency: "MXN",
				}),
			);
			assert(profile.display_name === "Paired Agent");
			let listing = await client.saveProperty(
				command({
					patch: {
						title,
						description: "A complete client and server contract test.",
						price: "1600000.00",
						currency: "MXN",
						operation: "sale",
						property_type: "house",
						bedrooms: 3,
						bathrooms: 1.5,
						area_sqm: 120,
						lot_sqm: 160,
						parking_spots: 1,
						amenities: ["garden"],
						address: {
							street: "Private Street",
							exterior_number: "8",
							neighborhood: "Centro",
							city: "CDMX",
							state: "CDMX",
							postal_code: "01000",
							country: "MX",
						},
						coordinates: { lat: 19.4326, lng: -99.1332 },
					},
				}),
			);
			const change = command(
				{
					id: listing.id,
					patch: { title: title + " updated" },
				},
				listing.revision,
			);
			const updated = await client.saveProperty(change);
			assert(
				updated.revision === listing.revision + 1 &&
					updated.title === title + " updated",
			);
			assertEquals(await client.saveProperty(change), updated);
			listing = updated;
			let conflict = false;
			try {
				await client.saveProperty({
					...change,
					payload: { id: listing.id, patch: { title: "Changed same key" } },
				});
			} catch (e) {
				conflict = SDKError.isSDKError(e) && e.kind === "conflict";
			}
			assert(conflict);
			await assertRejects(
				() =>
					client.saveProperty(
						command(
							{
								id: listing.id,
								patch: { title: "Stale update" },
							},
							listing.revision - 1,
						),
					),
				{ name: "SDKError", kind: "conflict" },
			);
			const png = Uint8Array.from(
				atob(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNw6TgDAAKsAZkaoN/PAAAAAElFTkSuQmCC",
				),
				(c) => c.charCodeAt(0),
			);
			const ticket = await client.beginUpload(
				command({
					property_id: listing.id,
					name: "test.png",
					size: png.length,
					type: "image/png",
				}),
			);
			const badTicket = new URL(ticket.url);
			badTicket.searchParams.set("signature", "tampered");
			const rejectedSignature = await fetch(badTicket, {
				method: ticket.method,
				headers: ticket.headers,
				body: png,
			});
			assertEquals(rejectedSignature.status, 401);
			await rejectedSignature.body?.cancel();
			const invalidImage = await fetch(ticket.url, {
				method: ticket.method,
				headers: ticket.headers,
				body: new Uint8Array(png.length),
			});
			assertEquals(invalidImage.status, 400);
			await invalidImage.body?.cancel();
			const transferred = await fetch(ticket.url, {
				method: ticket.method,
				headers: ticket.headers,
				body: png,
			});
			assert(transferred.ok, await transferred.text());
			const asset = await client.completeUpload(
				command({ upload_id: ticket.upload_id }),
			);
			listing = await client.attachMedia(
				command(
					{
						property_id: listing.id,
						asset_id: asset.asset_id,
						cover: true,
					},
					listing.revision,
				),
			);
			assert(listing.images.length === 1 && listing.images[0].is_cover);
			assert((await fetch(listing.images[0].url)).ok);
			listing = await client.updateMedia(
				command(
					{
						property_id: listing.id,
						media_id: asset.asset_id,
						action: "move",
						order: 0,
					},
					listing.revision,
				),
			);
			const raced = await Promise.allSettled([
				client.saveProperty(
					command(
						{ id: listing.id, patch: { title: title + " A" } },
						listing.revision,
					),
				),
				client.saveProperty(
					command(
						{ id: listing.id, patch: { title: title + " B" } },
						listing.revision,
					),
				),
			]);
			assertEquals(
				raced.filter((result) => result.status === "fulfilled").length,
				1,
			);
			const loser = raced.find((result) => result.status === "rejected")!;
			assert(
				loser.status === "rejected" &&
					SDKError.isSDKError(loser.reason) &&
					loser.reason.kind === "conflict",
			);
			const winner = raced.find((result) => result.status === "fulfilled")!;
			assert(winner.status === "fulfilled");
			listing = winner.value;
			listing = await client.transitionProperty(
				command({ id: listing.id, action: "publish" }, listing.revision),
			);
			assert(listing.status === "published");
			const catalog = await client.searchCatalog({
				text: title,
				currency: "MXN",
				min_price: "1000000",
				max_price: "2000000",
				amenities: ["garden"],
				sort: "price_asc",
			});
			assert(catalog.items.some((p) => p.id === listing.id));
			const detail = await client.getPropertyDetail(listing.id);
			assert(
				detail.address.street === undefined &&
					detail.coordinates?.lat === 19.43,
			);
			assert((await fetch(detail.images[0].url)).ok);
			assert(
				(await client.getMapMarkers({ text: title })).some(
					(p) => p.id === listing.id,
				),
			);
			assert(
				(await client.resolveProperties([listing.id]))[0].status ===
					"available",
			);
			assert((await client.getMyListings()).some((p) => p.id === listing.id));
			const email = `paired-${crypto.randomUUID()}@openhaus.test`;
			const anonymous = await other.searchCatalog({ text: title });
			assert(anonymous.items.some((p) => p.id === listing.id));
			const customer = await other.signup({
				email,
				password: "OpenHausCustomer12!",
				display_name: "Paired customer",
				role: "agent",
			});
			assert(customer.role === "customer");
			const verification = "live-verify-" + key();
			await rootSQL(
				`CREATE recovery_challenge SET user=type::record(${JSON.stringify(
					customer.id,
				)}),purpose='verify',token_hash=crypto::sha256(${JSON.stringify(
					verification,
				)}),expires_at=time::now()+30m;`,
			);
			await other.accountCommand(
				"verifyEmail",
				command({ token: verification }),
			);
			assert((await other.authenticate(other.token!)).email_verified);

			let forbidden = false;
			try {
				await other.getPropertyForEdit(listing.id);
			} catch (e) {
				forbidden = SDKError.isSDKError(e) && e.kind === "forbidden";
			}
			assert(forbidden);
			await other.setFavorite(
				command({ property_id: listing.id, desired: true }),
			);
			assert((await other.listFavoriteIds()).includes(listing.id));
			assert(
				(await other.mergeFavorites(command({ ids: [listing.id] }))).outcomes[0]
					.status === "confirmed",
			);
			const snapshot = await client.getInbox();
			const events: unknown[] = [];
			stop = await client.subscribeInbox(snapshot.cursor, (event) => {
				events.push(event);
			});
			const inquiry = {
				property_id: listing.id,
				name: "Paired visitor",
				email,
				message: "Please arrange a viewing",
				request_key: key(),
			};
			const receipt = await other.submitInquiry(inquiry);
			assertEquals(await other.submitInquiry(inquiry), receipt);
			assertEquals(await other.lookupInquiry(inquiry.request_key), receipt);
			for (let i = 0; i < 40 && !events.length; i++) {
				await new Promise((r) => setTimeout(r, 100));
			}
			assert(events.length > 0);
			const inbox = await client.getInbox();
			assert(inbox.items.length > snapshot.items.length);
			const marked = await client.markNotifications(
				command({ ids: [inbox.items[0].id] }),
			);
			assert(!!marked[0].read_at);
			let lead = await client.createLead(
				command({
					name: "Paired CRM lead",
					currency: "MXN",
					budget_min: "100000.00",
					budget_max: "200000.00",
					priority: "medium",
					property_interests: [listing.id],
				}),
			);
			lead = await client.updateLeadStage(
				command({ id: lead.id, stage: "contacted" }, lead.revision),
			);
			const note = await client.addLeadNote(
				command(
					{ id: lead.id, content: "Call tomorrow", is_pinned: true },
					lead.revision,
				),
			);
			assert(note.author_id === agent.id && note.is_pinned);
			lead = await client.getLead(lead.id);
			assert(lead.notes.some((n) => n.id === note.id));
			await outsider.signin({
				email: "other-agent@openhaus.test",
				password: "OpenHausOtherAgent12!",
			});
			await assertRejects(() => outsider.getLead(lead.id), {
				name: "SDKError",
				kind: "forbidden",
			});
			await assertRejects(() => outsider.getPropertyForEdit(listing.id), {
				name: "SDKError",
				kind: "forbidden",
			});
			const guestKey = key();
			const guestReceipt = await visitor.submitInquiry({
				property_id: listing.id,
				name: "Guest visitor",
				email: `guest-${key()}@openhaus.test`,
				message: "A guest inquiry",
				request_key: guestKey,
			});
			assertEquals(await visitor.lookupInquiry(guestKey), guestReceipt);
			assert((await client.getLeads()).some((l) => l.id === lead.id));
			assert((await client.getMetrics()).pipeline_amount !== "0");
			assert((await client.getActivities()).some((a) => a.lead_id === lead.id));
			await other.accountCommand("requestPasswordReset", command({ email }));
			await client.accountCommand(
				"requestPasswordReset",
				command({ email: "unknown@openhaus.test" }),
			);
			// Seed a single-use challenge to exercise the public reset without reading encrypted job secrets.
			const secret = "live-reset-secret-" + key();
			await rootSQL(
				`CREATE recovery_challenge SET user=type::record(${JSON.stringify(
					customer.id,
				)}),purpose='reset',token_hash=crypto::sha256(${JSON.stringify(
					secret,
				)}),expires_at=time::now()+30m;`,
			);
			const oldToken = other.token!;
			await other.accountCommand(
				"completePasswordReset",
				command({ token: secret, new_password: "OpenHausNewPassword12!" }),
			);
			let revoked = false;
			try {
				await other.authenticate(oldToken);
			} catch (e) {
				revoked = SDKError.isSDKError(e) && e.kind === "unauthenticated";
			}
			assert(revoked);
			await other.signin({ email, password: "OpenHausNewPassword12!" });
			await other.accountCommand(
				"changePassword",
				command({
					current_password: "OpenHausNewPassword12!",
					new_password: "OpenHausFinalPassword12!",
				}),
			);
			listing = await client.getPropertyForEdit(listing.id);
			listing = await client.transitionProperty(
				command({ id: listing.id, action: "archive" }, listing.revision),
			);
			assert(
				(await client.resolveProperties([listing.id]))[0].status ===
					"unavailable",
			);
			const archivedAsset = await fetch(detail.images[0].url);
			assert(archivedAsset.status === 403);
			await archivedAsset.body?.cancel();
			let delivered = false;
			for (let attempt = 0; attempt < 40; attempt++) {
				const jobs = await rootSQL(
					`SELECT status,secret_ciphertext FROM service_job WHERE actor=type::record(${JSON.stringify(
						customer.id,
					)}) AND kind='email';`,
				);
				const rows = jobs[0].result;
				delivered = rows.some(
					(j: { status: string; secret_ciphertext?: string }) =>
						j.status === "ready" && !j.secret_ciphertext,
				);
				if (delivered) break;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			assert(delivered, "durable email worker did not complete delivery");
		} finally {
			stop?.();
			await client.disconnect();
			await other.disconnect();
			await outsider.disconnect();
			await visitor.disconnect();
		}
	},
});
