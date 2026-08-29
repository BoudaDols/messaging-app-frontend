<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import useChatStore from "@src/store/chat";
import useAuthStore from "@src/store/auth";
import {
  getSocket,
  sendMessage,
  emitTypingStart,
  emitTypingStop,
  emitMessageRead,
} from "@src/services/socket";
import type { ApiMessage } from "@src/services/conversationService";

import NoChatSelected from "@src/components/states/empty-states/NoChatSelected.vue";

const route = useRoute();
const chatStore = useChatStore();
const authStore = useAuthStore();

const messageInput = ref("");
const messagesContainer = ref<HTMLElement | null>(null);

// L'autre participant est-il en train d'écrire ?
const otherIsTyping = ref(false);

// Timers pour le débounce du typing
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let isTypingActive = false;

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
    otherIsTyping.value = false;
    if (id) {
      chatStore.setActiveConversation(id);
      chatStore.loadMessages(id).then(() => {
        scrollToBottom();
        markConversationAsRead();
      });
    }
  },
  { immediate: true },
);

// Défiler quand de nouveaux messages arrivent
watch(messages, scrollToBottom, { deep: true });

// Gérer la frappe (débounce : émettre typing_start une fois, puis typing_stop après 3s d'inactivité)
const handleTyping = () => {
  if (!conversationId.value) return;

  // Émettre typing_start seulement si pas déjà actif
  if (!isTypingActive) {
    emitTypingStart(conversationId.value);
    isTypingActive = true;
  }

  // Réinitialiser le timer d'arrêt
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    if (conversationId.value) emitTypingStop(conversationId.value);
    isTypingActive = false;
  }, 3000);
};

// Envoyer un message
const handleSend = async () => {
  const content = messageInput.value.trim();
  if (!content || !activeConversation.value?.participant) return;

  const recipientId = activeConversation.value.participant.id;
  messageInput.value = "";

  // Arrêter l'indicateur de frappe
  if (typingTimer) clearTimeout(typingTimer);
  if (isTypingActive && conversationId.value) {
    emitTypingStop(conversationId.value);
    isTypingActive = false;
  }

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

  // Marquer immédiatement comme lu si la conversation est ouverte
  if (message.conversationId === conversationId.value) {
    emitMessageRead([message._id]);
  }
};

// Écouter les changements de statut de frappe
const handleTypingStatus = (status: {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}) => {
  // Ne montrer que pour la conversation active et pas soi-même
  if (
    status.conversationId === conversationId.value &&
    status.userId !== currentUserId.value
  ) {
    otherIsTyping.value = status.isTyping;
  }
};

// Marquer tous les messages non lus de la conversation comme lus
const markConversationAsRead = () => {
  const unreadIds = messages.value
    .filter((m) => !isOwnMessage(m) && !m.readStatus?.isRead)
    .map((m) => m._id);
  if (unreadIds.length > 0) {
    emitMessageRead(unreadIds);
  }
};

// Écouter les accusés de lecture — mettre à jour les messages concernés
const handleReadReceipt = (receipt: { messageIds: string[] }) => {
  if (!conversationId.value) return;
  const convMessages = chatStore.messages[conversationId.value];
  if (!convMessages) return;

  for (const msg of convMessages) {
    if (receipt.messageIds.includes(msg._id)) {
      msg.readStatus = { isRead: true, readAt: new Date().toISOString() };
    }
  }
};

// Écouter les changements de présence — mettre à jour le participant
const handlePresenceChange = (data: {
  userId: string;
  status: string;
  lastSeen: string | null;
}) => {
  for (const conv of chatStore.conversations) {
    if (conv.participant?.id === data.userId) {
      conv.participant.presence = {
        status: data.status,
        lastSeen: data.lastSeen || "",
      };
    }
  }
};

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.on("new_message", handleNewMessage);
    socket.on("typing_status", handleTypingStatus);
    socket.on("read_receipt", handleReadReceipt);
    socket.on("presence_change", handlePresenceChange);
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off("new_message", handleNewMessage);
    socket.off("typing_status", handleTypingStatus);
    socket.off("read_receipt", handleReadReceipt);
    socket.off("presence_change", handlePresenceChange);
  }
  if (typingTimer) clearTimeout(typingTimer);
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
        <!--Statut de présence-->
        <div class="flex items-center">
          <span
            class="w-2 h-2 rounded-full mr-2"
            :class="
              activeConversation.participant?.presence?.status === 'online'
                ? 'bg-green-500'
                : 'bg-gray-400'
            "
          ></span>
          <p class="body-1 text-black/50 dark:text-white/50">
            {{ activeConversation.participant?.presence?.status === 'online' ? 'online' : 'offline' }}
          </p>
        </div>
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
          <div class="flex items-center justify-end mt-1">
            <p
              class="body-1"
              :class="isOwnMessage(message) ? 'text-white/70' : 'text-black/50 dark:text-white/50'"
            >
              {{ formatTime(message.createdAt) }}
            </p>
            <!--Accusé de lecture (seulement pour nos messages)-->
            <span
              v-if="isOwnMessage(message)"
              class="ml-2 text-xs"
              :class="message.readStatus?.isRead ? 'text-blue-200' : 'text-white/50'"
            >
              {{ message.readStatus?.isRead ? '✓✓' : '✓' }}
            </span>
          </div>
        </div>
      </div>

      <!--Indicateur de frappe-->
      <div v-if="otherIsTyping" class="mb-4 flex justify-start">
        <div class="px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
          <p class="body-2 text-black/50 dark:text-white/50 italic">
            {{ activeConversation.participant?.displayName }} is typing...
          </p>
        </div>
      </div>
    </div>

    <!--Message input-->
    <div class="w-full px-5 py-4 border-t border-gray-100 dark:border-gray-700">
      <form @submit.prevent="handleSend" class="flex items-center">
        <input
          v-model="messageInput"
          @input="handleTyping"
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
