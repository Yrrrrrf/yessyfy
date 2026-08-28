import type { User, UserRole } from "@sdk";

export type AuthRole = UserRole | null;

export interface AuthStore {
	readonly role: AuthRole;
	readonly user: User | null;
	readonly isAuthenticated: boolean;
	setRole(newRole: AuthRole): void;
	setUser(newUser: User | null): void;
	logout(): void;
}

// READY(db): DB user table with role validation. JWT from API.
export function createAuthStore(): AuthStore {
	let role = $state<AuthRole>(null);
	let user = $state<User | null>(null);

	return {
		get role() {
			return role;
		},
		get user() {
			return user;
		},
		get isAuthenticated() {
			return !!user;
		},
		setRole(newRole: AuthRole) {
			role = newRole;
		},
		setUser(newUser: User | null) {
			user = newUser;
		},
		logout() {
			role = null;
			user = null;
		},
	};
}

export const authStore: AuthStore = createAuthStore();
