import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(import.meta.url), "..");

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			"@src": resolve(rootDir, "src"),
			"@custom_types": resolve(rootDir, "src/@custom_types"),
		},
	},
});
