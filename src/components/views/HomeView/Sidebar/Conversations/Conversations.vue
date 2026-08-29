<script setup lang="ts">
import type { Ref } from "vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import useChatStore from "@src/store/chat";

import { PencilSquareIcon } from "@heroicons/vue/24/outline";
import NoConversation from "@src/components/states/empty-states/NoConversation.vue";
import Circle2Lines from "@src/components/states/loading-states/Circle2Lines.vue";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import SearchInput from "@src/components/ui/inputs/SearchInput.vue";
import SidebarHeader from "@src/components/views/HomeView/Sidebar/SidebarHeader.vue";

const chatStore = useChatStore();
const router = useRouter();

const keyword: Ref<string> = ref("");

// Filtrer les conversations selon la recherche (par nom du participant)
const filteredConversations = computed(() => {
  if (!keyword.value) return chatStore.conversations;
  return chatStore.conversations.filter((conv) =>
    conv.participant?.displayName
      ?.toLowerCase()
      .includes(keyword.value.toLowerCase()),
  );
});

// Ouvrir une conversation
const openConversation = (conversationId: string) => {
  chatStore.setActiveConversation(conversationId);
  chatStore.loadMessages(conversationId);
  router.push({ path: `/chat/${conversationId}/` });
};

// Formater l'heure du dernier message
const formatTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Tronquer le texte de l'aperçu
const shorten = (text?: string) => {
  if (!text) return "";
  return text.length > 30 ? `${text.substring(0, 30)}...` : text;
};
</script>

<template>
  <div>
    <SidebarHeader>
      <template v-slot:title>Messages</template>
      <template v-slot:actions>
        <IconButton
          class="ic-btn-ghost-primary w-7 h-7"
          aria-label="compose conversation"
          title="compose conversation"
        >
          <PencilSquareIcon class="w-[1.25rem] h-[1.25rem]" />
        </IconButton>
      </template>
    </SidebarHeader>

    <!--search bar-->
    <div class="px-5 xs:pb-6 md:pb-5">
      <SearchInput
        @value-changed="(value) => { keyword = value; }"
        :value="keyword"
      />
    </div>

    <!--conversations-->
    <div
      role="list"
      aria-label="conversations"
      class="w-full h-full scroll-smooth scrollbar-hidden"
      style="overflow-x: visible; overflow-y: scroll"
    >
      <!--loading state-->
      <Circle2Lines
        v-if="chatStore.status === 'loading'"
        v-for="item in 6"
        :key="item"
      />

      <!--conversation list-->
      <div v-else-if="filteredConversations.length > 0">
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="select-none"
        >
          <button
            :aria-label="'conversation with ' + conversation.participant?.displayName"
            @click="openConversation(conversation.id)"
            class="w-full h-23 px-5 py-6 mb-3 flex rounded focus:bg-indigo-50 dark:hover:bg-gray-600 hover:bg-indigo-50 active:bg-indigo-100 focus:outline-none transition duration-500 ease-out"
          >
            <!--avatar-->
            <div class="mr-4">
              <div
                class="w-7 h-7 rounded-full bg-cover bg-center bg-indigo-300 flex items-center justify-center text-white"
              >
                {{ conversation.participant?.displayName?.[0]?.toUpperCase() }}
              </div>
            </div>

            <div class="w-full flex flex-col">
              <div class="w-full">
                <div class="flex items-start">
                  <div class="grow mb-3 text-start">
                    <p class="heading-2 text-black/70 dark:text-white/70">
                      {{ conversation.participant?.displayName }}
                    </p>
                  </div>
                  <p class="body-1 text-black/70 dark:text-white/70">
                    {{ formatTime(conversation.lastMessage?.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="flex justify-between">
                <p
                  class="body-2 text-black/70 dark:text-white/70 flex justify-start items-center"
                  :class="{ 'text-indigo-400': conversation.unreadCount }"
                >
                  {{ shorten(conversation.lastMessage?.content) }}
                </p>

                <!--unread badge-->
                <div v-if="conversation.unreadCount">
                  <div
                    class="w-4.5 h-4.5 flex justify-center items-center rounded-[50%] bg-indigo-300"
                  >
                    <p class="body-1 text-white">
                      {{ conversation.unreadCount }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!--empty state-->
      <div v-else>
        <NoConversation />
      </div>
    </div>
  </div>
</template>
