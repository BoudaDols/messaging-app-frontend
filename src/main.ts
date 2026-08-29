import router from "@src/router";
import "@src/style.css";
import { createPinia } from "pinia";
import { createApp } from "vue";
import vClickOutside from "click-outside-vue3";

import App from "@src/App.vue";
import { connectSocket } from "@src/services/socket";

const pinia = createPinia();

// Si un token existe déjà, établir la connexion WebSocket au démarrage
const existingToken = localStorage.getItem("token");
if (existingToken) {
	connectSocket(existingToken);
}

createApp(App).use(pinia).use(router).use(vClickOutside).mount("#app");
