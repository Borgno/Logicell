import { execFileSync } from "node:child_process";
import pg from "pg";

// Recria o banco vazio e aplica as migrations com o mesmo `migrate deploy` de produção. Usado pelo
// Vitest e pelo E2E, cada um com o seu banco, separados do de dev (logicell).
export async function recreateDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.slice(1);
  // Apaga o banco inteiro: nunca rodar contra o de dev ou o de produção.
  if (!database.endsWith("_test")) {
    throw new Error(`Banco de teste precisa terminar em _test, recebido "${database}".`);
  }

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Postgres fora do ar em ${url.host}. Suba com \`bun run infra:up\` antes dos testes.`,
      { cause: error },
    );
  }
  try {
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${database}"`);
  } finally {
    await client.end();
  }

  execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}
