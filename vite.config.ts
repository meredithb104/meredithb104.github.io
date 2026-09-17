/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";

// User site (meredithb104.github.io) deploys at the domain root, so base stays "/".
export default defineConfig({
  build: {
    target: "es2023",
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        accessibility: resolve(import.meta.dirname, "accessibility.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
