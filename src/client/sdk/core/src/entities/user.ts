export type UserRole =
	| "customer"
	| "collaborator"
	| "operator"
	| "admin"
	| "owner"
	| "user";
export type UserStatus = "active" | "suspended" | "banned" | "pending_kyc";

export interface User {
	id: string;
	email?: string;
	phone?: string;
	username?: string;
	fullName?: string;
	role: UserRole;
	status?: UserStatus;
	rfc?: string;
	curp?: string;
	avatarUrl?: string;
	locale?: string;
	createdAt?: string;
	updatedAt?: string;
}
