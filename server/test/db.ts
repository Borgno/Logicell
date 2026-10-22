import { prisma } from "../db/client";

// Apaga os dados de todas as tabelas do app, em qualquer schema, e zera as sequences. O histórico de
// migrations não é tocado. Chamar no beforeEach de teste que grava no banco.
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ schemaname: string; tablename: string }[]>`
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables
    .map(({ schemaname, tablename }) => `"${schemaname}"."${tablename}"`)
    .join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
