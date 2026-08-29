<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import Button from "@src/components/ui/inputs/Button.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import PasswordInput from "@src/components/ui/inputs/PasswordInput.vue";
import { RouterLink } from "vue-router";
import useAuthStore from "@src/store/auth";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value);
  if (success) {
    router.push("/chat/");
  }
};
</script>

<template>
  <div
    class="p-5 md:basis-1/2 xs:basis-full flex flex-col justify-center items-center"
  >
    <div class="w-full md:px-[26%] xs:px-[10%]">
      <!--header-->
      <div class="mb-6 flex flex-col">
        <img
          src="@src/assets/vectors/logo-gradient.svg"
          class="w-5.5 h-4.5 mb-4 opacity-70"
          alt="bird logo"
        />
        <p class="heading-2 text-black/70 dark:text-white/70 mb-4">
          Welcome back
        </p>
        <p class="body-3 text-black/75 dark:text-white/70 font-light">
          Sign in to start messaging now!
        </p>
      </div>

      <!--error message-->
      <div v-if="authStore.error" class="mb-4">
        <p class="body-2 text-red-500">{{ authStore.error }}</p>
      </div>

      <!--form-->
      <div class="mb-6">
        <LabeledTextInput
          label="Email"
          placeholder="Enter your email"
          class="mb-5"
          @value-changed="(value) => { email = value; }"
          :value="email"
        />
        <PasswordInput
          @value-changed="(value) => { password = value; }"
          :value="password"
          label="Password"
          placeholder="Enter your password"
        />
      </div>

      <!--local controls-->
      <div class="mb-6">
        <Button
          @click="handleLogin"
          class="contained-primary contained-text w-full mb-4"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? "Signing in..." : "Sign in" }}
        </Button>
      </div>

      <!--bottom text-->
      <div class="flex justify-center">
        <p class="body-2 text-black/70 dark:text-white/70">
          Don't have an account?
          <RouterLink
            to="/access/sign-up/"
            class="text-indigo-400 opacity-100"
          >
            Sign up
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
