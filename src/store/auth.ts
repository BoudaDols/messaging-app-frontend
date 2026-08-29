/**
 * Authentication store - manages the logged-in user and JWT token.
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import type { Ref } from "vue";
import * as authService from "@src/services/authService";
import { connectSocket, disconnectSocket } from "@src/services/socket";

interface AuthUser {
	id: string;
	email: string;
	displayName: string;
}

const useAuthStore = defineStore("auth", () => {
	const token: Ref<string | null> = ref(localStorage.getItem("token"));
	const user: Ref<AuthUser | null> = ref(
		JSON.parse(localStorage.getItem("authUser") || "null"),
	);
	const error: Ref<string | null> = ref(null);
	const loading = ref(false);

	const isAuthenticated = () => !!token.value;

	async function login(email: string, password: string) {
		loading.value = true;
		error.value = null;
		try {
			const data = await authService.login(email, password);
			token.value = data.token;
			user.value = data.user;
			localStorage.setItem("token", data.token);
			localStorage.setItem("authUser", JSON.stringify(data.user));
			// Établir la connexion WebSocket
			connectSocket(data.token);
			return true;
		} catch (err: any) {
			error.value =
				err.response?.data?.error?.message || "Login failed";
			return false;
		} finally {
			loading.value = false;
		}
	}

	async function register(email: string, password: string) {
		loading.value = true;
		error.value = null;
		try {
			const data = await authService.register(email, password);
			token.value = data.token;
			user.value = data.user;
			localStorage.setItem("token", data.token);
			localStorage.setItem("authUser", JSON.stringify(data.user));
			return true;
		} catch (err: any) {
			error.value =
				err.response?.data?.error?.message || "Registration failed";
			return false;
		} finally {
			loading.value = false;
		}
	}

	function logout() {
		token.value = null;
		user.value = null;
		localStorage.removeItem("token");
		localStorage.removeItem("authUser");
		disconnectSocket();
	}

	return {
		token,
		user,
		error,
		loading,
		isAuthenticated,
		login,
		register,
		logout,
	};
});

export default useAuthStore;
