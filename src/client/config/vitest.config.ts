import { defineConfig } from "vitest/config";
import { defineSveltePkg } from "../sdk/sdk.config.ts";
import { sdkAliases } from "./aliases.ts";
const root = new URL("../", import.meta.url).pathname;
const project = (name: string, include: string[]) => ({
	extends: false as const,
	...defineSveltePkg({
		overrides: {
			root,
			resolve: { alias: sdkAliases, dedupe: ["svelte"] },
			ssr: { noExternal: ["rune-lab", "arkano", "@lucide/svelte"] },
			test: { name, include },
		},
	}),
});
export default defineConfig({
	test: {
		projects: [
			project("state", ["sdk/state/src/**/*.test.ts"]),
			project("ui", ["sdk/ui/src/**/*.test.ts"]),
			project("minimal", ["apps/minimal/src/routes/*.test.ts"]),
		],
	},
});
