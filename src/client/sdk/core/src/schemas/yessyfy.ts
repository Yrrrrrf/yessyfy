import { type } from "arktype";

export const userRoleSchema = type(
	"'customer' | 'collaborator' | 'operator' | 'admin' | 'owner' | 'user'",
);

export const userStatusSchema = type(
	"'active' | 'suspended' | 'banned' | 'pending_kyc'",
);

export const userSchema = type({
	id: "string",
	phone: "string",
	"email?": "string",
	"username?": "string",
	fullName: "string",
	role: userRoleSchema,
	status: userStatusSchema,
	"rfc?": "string",
	"curp?": "string",
	"avatarUrl?": "string",
	locale: "string",
	createdAt: "string",
	updatedAt: "string",
});

export const serviceCategorySchema = type(
	"'plomeria' | 'electricidad' | 'cerrajeria' | 'jardineria' | 'mantenimiento_hogar' | 'albanileria'",
);

export const locationTypeSchema = type(
	"'residencial' | 'comercial' | 'premium'",
);
export const urgencyLevelSchema = type(
	"'normal' | 'mismo_dia' | 'emergencia_24_7'",
);

export const jobOrderStatusSchema = type(
	"'draft' | 'pending_triage' | 'dispatched' | 'accepted' | 'en_camino' | 'in_progress' | 'winding_down' | 'pending_validation' | 'validated' | 'completed' | 'disputed' | 'cancelled'",
);

export const coordinatesSchema = type({
	latitude: "number",
	longitude: "number",
});

export const jobOrderSchema = type({
	id: "string",
	code: "string",
	customerId: "string",
	"collaboratorId?": "string",
	category: serviceCategorySchema,
	locationType: locationTypeSchema,
	urgency: urgencyLevelSchema,
	status: jobOrderStatusSchema,
	coordinates: coordinatesSchema,
	addressText: "string",
	postalCode: "string",
	description: "string",
	baseBudgetCents: "number",
	supplementalCents: "number",
	totalCustomerCents: "number",
	platformFeeCents: "number",
	collaboratorGrossCents: "number",
	isrWithheldCents: "number",
	ivaWithheldCents: "number",
	collaboratorNetCents: "number",
	createdAt: "string",
	"scheduledFor?": "string",
	"dispatchedAt?": "string",
	"arrivedAt?": "string",
	"completedAt?": "string",
});

export const bookingRequestSchema = type({
	category: serviceCategorySchema,
	locationType: locationTypeSchema,
	urgency: urgencyLevelSchema,
	addressText: "string >= 5",
	postalCode: "string == 5",
	description: "string >= 10",
});
