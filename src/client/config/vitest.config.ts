import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite-plus";

const SDK_ROOT = new URL("../sdk", import.meta.url).pathname;
const SDK_ENTRY = new URL("../sdk/mod.ts", import.meta.url).pathname;

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@sdk\/([^/]+)$/, replacement: `${SDK_ROOT}/$1/src/mod.ts` },
			{ find: /^@sdk\/(.*)/, replacement: `${SDK_ROOT}/$1` },
			{ find: /^@sdk$/, replacement: SDK_ENTRY },
		],
	},
	plugins: [
		svelte({
			configFile: false,
			compilerOptions: {
				runes: true,
			},
		}) as unknown as PluginOption,
	],
	test: {
		globals: true,
		projects: ["./sdk/*/vite.config.ts", "./apps/*/vite.config.*"],
		exclude: [
			"**/node_modules/**",
			"**/.git/**",
			"**/.svelte-kit/**",
			"**/dist/**",
			"**/build/**",
		],
	},
});
