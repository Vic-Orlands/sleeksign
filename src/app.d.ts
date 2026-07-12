// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			authSession: {
				session: {
					id: string;
					userId: string;
					activeOrganizationId?: string | null;
					[key: string]: unknown;
				};
				user: {
					id: string;
					email: string;
					name: string;
					image?: string | null;
					lastWorkspaceId?: string | null;
					[key: string]: unknown;
				};
			} | null;
			session: {
				id: string;
				userId: string;
				activeOrganizationId?: string | null;
				[key: string]: unknown;
			} | null;
			user: {
				id: string;
				email: string;
				name: string;
				image?: string | null;
				lastWorkspaceId?: string | null;
				[key: string]: unknown;
			} | null;
		}
	}
}

export {};
