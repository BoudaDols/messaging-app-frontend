/**
 * Socket.io client service for real-time messaging.
 * Manages the WebSocket connection and exposes helpers to send/receive events.
 */

import { io, type Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Établit la connexion WebSocket avec le token JWT
 */
export function connectSocket(token: string): Socket {
	if (socket?.connected) {
		return socket;
	}

	socket = io(WS_URL, {
		auth: { token },
		transports: ["websocket"],
	});

	socket.on("connect", () => {
		console.log("WebSocket connected");
	});

	socket.on("connect_error", (err) => {
		console.error("WebSocket connection error:", err.message);
	});

	return socket;
}

/**
 * Retourne le socket actif
 */
export function getSocket(): Socket | null {
	return socket;
}

/**
 * Envoie un message
 */
export function sendMessage(
	recipientId: string,
	content: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
	return new Promise((resolve) => {
		if (!socket) {
			resolve({ success: false, error: "Not connected" });
			return;
		}
		socket.emit("send_message", { recipientId, content }, (ack: any) => {
			resolve(ack);
		});
	});
}

/**
 * Émet un événement "typing_start"
 */
export function emitTypingStart(conversationId: string) {
	socket?.emit("typing_start", { conversationId });
}

/**
 * Émet un événement "typing_stop"
 */
export function emitTypingStop(conversationId: string) {
	socket?.emit("typing_stop", { conversationId });
}

/**
 * Marque des messages comme lus
 */
export function emitMessageRead(messageIds: string[]) {
	socket?.emit("message_read", { messageIds });
}

/**
 * Déconnecte le socket
 */
export function disconnectSocket() {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}
