import { defineConfig } from "vitest/config";

// Vitest corre en Node: solo código puro y adaptadores con fetch inyectado.
// Las pruebas contra el Worker real (D1, HTMLRewriter, rate limit) son e2e con Playwright.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["blueprints/**", "tests/e2e/**", "node_modules/**", "dist/**", ".wrangler/**"],
    passWithNoTests: false,
  },
});
