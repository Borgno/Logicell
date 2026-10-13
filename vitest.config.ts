import { defineConfig } from "vitest/config";

// Config separada do vite.config.ts: o plugin do React Router não roda dentro do Vitest.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    // Cria e migra o banco de teste. Precisa do Postgres do docker-compose.dev.yml no ar.
    globalSetup: ["server/test/globalSetup.ts"],
    // Os arquivos de teste dividem o mesmo banco e o resetDatabase apaga tudo: um arquivo por vez.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      SESSION_SECRET: "test-secret-with-at-least-32-characters",
      SEED_PASSWORD: "seed-password",
      // TEST_DATABASE_URL troca o banco de teste, por exemplo no CI. O nome precisa terminar em _test.
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://dev:dev@localhost:5433/logicell_test",
    },
  },
});
