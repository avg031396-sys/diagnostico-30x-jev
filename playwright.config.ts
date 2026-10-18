import { defineConfig, devices } from "@playwright/test";

// E2E y pruebas de API contra el Worker real (wrangler dev) con JEV_MODE=mock.
// El rate limit se apaga con LIMITE_ACTIVO:0 para que la suite no se bloquee a sí misma.
// QA_TOKEN local es token-e2e-local (el mismo valor que trae .dev.vars.example).
const PUERTO = 8787;
const ORIGEN = `http://127.0.0.1:${PUERTO}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/blueprints/**"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: ORIGEN,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "movil-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 } },
    },
  ],
  webServer: {
    command:
      "npm run build && npm run db:migrar && npx wrangler dev --ip 127.0.0.1 --port 8787 --var JEV_MODE:mock --var LIMITE_ACTIVO:0 --var QA_TOKEN:token-e2e-local --show-interactive-dev-session=false",
    url: `${ORIGEN}/api/salud`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
