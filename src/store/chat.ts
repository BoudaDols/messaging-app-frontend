/**
 * Chat store - manages conversations and messages from the backend API.
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import type { Ref } from "vue";
import * as conversationService from "@src/services/conversationService";
import type {
	ApiConversation,
	ApiMessage,
} from "@src/services/conversationService";

const useChatStore = defineStore("chatData", () => {
	const conversations: Ref<ApiConversation[]> = ref([]);
	const messages: Ref<Record<string, ApiMessage[]>> = ref({});
	const status = ref("idle");
	const activeConversationId: Ref<string | null> = ref(null);

	/**
	 * Charge la liste des conversations depuis l'API
	 */
	async function loadConversations() {
		status.value = "loading";
		try {
			const data = await conversationService.getConversations();
			conversations.value = data.conversations;
			status.value = "success";
		} catch (error) {
			status.value = "error";
			console.error("Failed to load conversations:", error);
		}
	}

	/**
	 * Charge les messages d'une conversation
	 */
	async function loadMessages(conversationId: string) {
		try {
			const data = await conversationService.getMessages(conversationId);
			// Les messages arrivent en ordre décroissant, on les inverse pour l'affichage
			messages.value[conversationId] = data.messages.reverse();
		} catch (error) {
			console.error("Failed to load messages:", error);
		}
	}

	/**
	 * Ajoute un message reçu en temps réel
	 */
	function addMessage(message: ApiMessage) {
		const convId = message.conversationId;
		if (!messages.value[convId]) {
			messages.value[convId] = [];
		}
		messages.value[convId].push(message);
	}

	function setActiveConversation(conversationId: string) {
		activeConversationId.value = conversationId;
	}

	return {
		conversations,
		messages,
		status,
		activeConversationId,
		loadConversations,
		loadMessages,
		addMessage,
		setActiveConversation,
	};
});

export default useChatStore;
