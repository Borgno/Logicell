import { defineConfig } from "prisma/config";

// O CLI do Prisma roda sobre o Node, que não lê o .env sozinho. Em produção o arquivo não existe e as
// variáveis vêm do container, como no server/env.ts.
try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env e não env(): o env() lança erro sem a variável em todo comando, inclusive no
    // `prisma generate` do build, que não conecta no banco. Em produção é o pooler do Supabase em
    // modo sessão (porta 5432), que aceita migration; o modo transação (6543) não serve.
    url: process.env.DATABASE_URL ?? "",
  },
});
