import type { TestProject } from "vitest/node";
import { recreateDatabase } from "./recreateDatabase";

// Roda uma vez antes da suíte: banco de teste vazio e migrado.
export default async function setup(project: TestProject) {
  // O globalSetup roda fora do test.env: a URL vem do config do Vitest.
  const databaseUrl = project.config.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL ausente no test.env do vitest.config.ts.");
  await recreateDatabase(databaseUrl);
}
