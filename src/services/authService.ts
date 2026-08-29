/**
 * Authentication API calls.
 */

import api from "@src/services/api";

export interface AuthResponse {
	message: string;
	user: {
		id: string;
		email: string;
		displayName: string;
	};
	token: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
	const response = await api.post<AuthResponse>("/auth/login", {
		email,
		password,
	});
	return response.data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
	const response = await api.post<AuthResponse>("/auth/register", {
		email,
		password,
	});
	return response.data;
}
