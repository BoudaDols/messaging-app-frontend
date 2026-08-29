/**
 * Axios instance configured to talk to the backend API.
 * Automatically attaches the JWT token to every request.
 */

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
	baseURL: `${API_URL}/api`,
	headers: {
		"Content-Type": "application/json",
	},
});

// Intercepteur : attache le token JWT à chaque requête
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Intercepteur : gère les erreurs 401 (token expiré/invalide)
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Token invalide → déconnexion
			localStorage.removeItem("token");
			// Rediriger vers login si on n'y est pas déjà
			if (!window.location.pathname.includes("/access/")) {
				window.location.href = "/access/sign-in/";
			}
		}
		return Promise.reject(error);
	},
);

export default api;
