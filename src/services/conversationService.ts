/**
 * Conversation and message API calls.
 */

import api from "@src/services/api";

export interface ApiConversation {
	id: string;
	participant: {
		id: string;
		displayName: string;
		email: string;
		avatar: Record<string, unknown>;
		presence: { status: string; lastSeen: string };
	} | null;
	lastMessage: {
		content: string;
		senderId: string;
		createdAt: string;
	} | null;
	unreadCount: number;
	createdAt: string;
}

export interface ApiMessage {
	_id: string;
	conversationId: string;
	senderId: string | { _id: string; displayName: string };
	recipientId: string;
	content: string;
	deliveryStatus: string;
	readStatus: { isRead: boolean; readAt?: string };
	createdAt: string;
}

export async function getConversations(): Promise<{
	conversations: ApiConversation[];
	total: number;
}> {
	const response = await api.get("/conversations");
	return response.data;
}

export async function getMessages(
	conversationId: string,
	cursor?: string,
): Promise<{ messages: ApiMessage[]; nextCursor: string | null; hasMore: boolean }> {
	const params = cursor ? { cursor } : {};
	const response = await api.get(`/conversations/${conversationId}/messages`, {
		params,
	});
	return response.data;
}
