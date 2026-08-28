import { type } from "arktype";
import { assertEquals } from "jsr:@std/assert@1";
import { bookingRequestSchema, userSchema } from "./yessyfy.ts";

Deno.test("ArkType Schemas: validates valid user", () => {
	const validUser = {
		id: "usr_123",
		phone: "+525512345678",
		fullName: "Juan Perez",
		role: "collaborator",
		status: "active",
		locale: "es-MX",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const result = userSchema(validUser);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("ArkType Schemas: rejects invalid booking request (short address / description)", () => {
	const invalidBooking = {
		category: "plomeria",
		locationType: "residencial",
		urgency: "normal",
		addressText: "Av", // Too short (< 5)
		postalCode: "06700",
		description: "Fix leak", // Too short (< 10)
	};

	const result = bookingRequestSchema(invalidBooking);
	assertEquals(result instanceof type.errors, true);
});
