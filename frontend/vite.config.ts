/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const contractsPath = path.resolve(__dirname, "../contracts.json");
const contracts = JSON.parse(fs.readFileSync(contractsPath, "utf-8"));
const testnet = contracts.networks?.testnet ?? {};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_TOKEN_FACTORY_ADDRESS": JSON.stringify(testnet.token_factory || ""),
    "import.meta.env.VITE_BARTER_POOL_ADDRESS": JSON.stringify(testnet.barter_pool || ""),
    "import.meta.env.VITE_REDEMPTION_REGISTRY_ADDRESS": JSON.stringify(testnet.redemption_registry || ""),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    env: {
      VITE_TOKEN_FACTORY_ADDRESS: "GBFACTORY1234567890ABCDEFGHIJKLMNOPQRS",
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
