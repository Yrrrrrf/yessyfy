import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

import { sdkAliases } from "./aliases.ts";

export interface GwaConfig {
	plugins?: PluginOption[];
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineGWA(options: GwaConfig = {}) {
	const { plugins = [], extraPlugins = [], overrides = {} } = options;

	return defineConfig({
		resolve: {
			alias: [
				...sdkAliases,
				{ find: /^#lib\/(.*)/, replacement: "/src/lib/$1" },
				{ find: /^#lib$/, replacement: "/src/lib/mod.ts" },
			],
		},
		plugins: [tailwindcss() as PluginOption, ...plugins, ...extraPlugins],
		ssr: {
			noExternal: ["rune-lab", "arkano", "@lucide/svelte"],
		},
		...overrides,
	});
}

export default defineGWA();
export type { PluginOption };
