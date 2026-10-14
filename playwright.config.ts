import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// Roda contra o build de produção (SPA e API na mesma origem), como no deploy.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "tsx e2e/prepareDatabase.ts && bun run build && bun run start",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      SESSION_SECRET: "e2e-secret-with-at-least-32-characters",
      // Banco próprio do E2E, recriado a cada rodada. O nome termina em _test pela trava do setup.
      DATABASE_URL:
        process.env.TEST_E2E_DATABASE_URL ??
        "postgresql://dev:dev@localhost:5433/logicell_e2e_test",
    },
  },
});
