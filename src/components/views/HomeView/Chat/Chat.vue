<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import useChatStore from "@src/store/chat";
import useAuthStore from "@src/store/auth";
import { getSocket, sendMessage } from "@src/services/socket";
import type { ApiMessage } from "@src/services/conversationService";

import NoChatSelected from "@src/components/states/empty-states/NoChatSelected.vue";

const route = useRoute();
const chatStore = useChatStore();
const authStore = useAuthStore();

const messageInput = ref("");
const messagesContainer = ref<HTMLElement | null>(null);

// ID de la conversation active (depuis l'URL)
const conversationId = computed(() => route.params.id as string | undefined);

// La conversation active
const activeConversation = computed(() =>
  chatStore.conversations.find((c) => c.id === conversationId.value),
);

// Les messages de la conversation active
const messages = computed<ApiMessage[]>(() => {
  if (!conversationId.value) return [];
  return chatStore.messages[conversationId.value] || [];
});

// L'ID de l'utilisateur courant
const currentUserId = computed(() => authStore.user?.id);

// Déterminer si un message est envoyé par l'utilisateur courant
const isOwnMessage = (message: ApiMessage) => {
  const senderId =
    typeof message.senderId === "string"
      ? message.senderId
      : message.senderId._id;
  return senderId === currentUserId.value;
};

// Faire défiler vers le bas
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Charger les messages quand la conversation change
watch(
  conversationId,
  (id) => {
    if (id) {
      chatStore.setActiveConversation(id);
      chatStore.loadMessages(id).then(scrollToBottom);
    }
  },
  { immediate: true },
);

// Défiler quand de nouveaux messages arrivent
watch(messages, scrollToBottom, { deep: true });

// Envoyer un message
const handleSend = async () => {
  const content = messageInput.value.trim();
  if (!content || !activeConversation.value?.participant) return;

  const recipientId = activeConversation.value.participant.id;
  messageInput.value = "";

  const ack = await sendMessage(recipientId, content);
  if (ack.success) {
    // Recharger les messages pour afficher le message envoyé
    if (conversationId.value) {
      await chatStore.loadMessages(conversationId.value);
      scrollToBottom();
    }
  } else {
    console.error("Failed to send message:", ack.error);
  }
};

// Écouter les nouveaux messages en temps réel
const handleNewMessage = (message: ApiMessage) => {
  chatStore.addMessage(message);
  scrollToBottom();
};

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.on("new_message", handleNewMessage);
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off("new_message", handleNewMessage);
  }
});

// Formater l'heure d'un message
const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<template>
  <div
    v-if="conversationId && activeConversation"
    class="h-full flex flex-col scrollbar-hidden"
  >
    <!--Chat header-->
    <div
      class="w-full px-5 py-4 flex items-center border-b border-gray-100 dark:border-gray-700"
    >
      <div
        class="w-9 h-9 mr-4 rounded-full bg-cover bg-center bg-indigo-300 flex items-center justify-center text-white"
      >
        {{ activeConversation.participant?.displayName?.[0]?.toUpperCase() }}
      </div>
      <div>
        <p class="heading-2 text-black/70 dark:text-white/70">
          {{ activeConversation.participant?.displayName }}
        </p>
        <p class="body-1 text-black/50 dark:text-white/50">
          {{ activeConversation.participant?.presence?.status }}
        </p>
      </div>
    </div>

    <!--Messages-->
    <div
      ref="messagesContainer"
      class="grow px-5 py-4 overflow-y-scroll scrollbar-hidden"
    >
      <div
        v-for="message in messages"
        :key="message._id"
        class="mb-4 flex"
        :class="isOwnMessage(message) ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[70%] px-4 py-3 rounded-lg"
          :class="
            isOwnMessage(message)
              ? 'bg-indigo-300 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-black/70 dark:text-white/70'
          "
        >
          <p class="body-2">{{ message.content }}</p>
          <p
            class="body-1 mt-1"
            :class="isOwnMessage(message) ? 'text-white/70' : 'text-black/50 dark:text-white/50'"
          >
            {{ formatTime(message.createdAt) }}
          </p>
        </div>
      </div>
    </div>

    <!--Message input-->
    <div class="w-full px-5 py-4 border-t border-gray-100 dark:border-gray-700">
      <form @submit.prevent="handleSend" class="flex items-center">
        <input
          v-model="messageInput"
          type="text"
          placeholder="Type a message..."
          class="grow px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-black/70 dark:text-white/70 outline-none"
        />
        <button
          type="submit"
          class="ml-3 px-5 py-3 rounded-lg bg-indigo-300 text-white contained-text"
        >
          Send
        </button>
      </form>
    </div>
  </div>

  <NoChatSelected v-else />
</template>
