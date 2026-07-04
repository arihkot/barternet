/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    env: {
      VITE_BARTER_POOL_ADDRESS: "GBPOOL1234567890ABCDEFGHIJKLMNOPQRSTUV",
      VITE_REDEMPTION_REGISTRY_ADDRESS: "GBRED1234567890ABCDEFGHIJKLMNOPQRSTUV",
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});
