import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
export default defineConfig({
  plugins: [svelte({ configFile: false, compilerOptions: { runes: true } })],
  resolve: { conditions: ["browser"] },
  test: {
    include: ["tests/product/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
