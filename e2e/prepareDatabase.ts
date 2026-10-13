import { recreateDatabase } from "../server/test/recreateDatabase";

// Roda antes do servidor do E2E (webServer do playwright.config.ts): banco vazio e migrado.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ausente no webServer.env do playwright.config.ts.");

await recreateDatabase(databaseUrl);
