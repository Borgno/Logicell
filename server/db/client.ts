import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../env";
import { isConnectionError } from "./connectionError";
import { PrismaClient } from "./generated/client";

// Leitura pode ser refeita sem efeito colateral. Escrita fica de fora do retry.
const READ_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "$queryRaw",
  "$queryRawUnsafe",
]);

// O pool é do pg, não do Prisma: o Prisma 7 não aplica connection_limit nem pool_timeout da URL.
// - max: o limite de clientes do pooler do Supabase vale por processo (ver DB_CONNECTION_LIMIT).
// - connectionTimeoutMillis: o padrão do pg é esperar para sempre por uma conexão livre.
// - idleTimeoutMillis: o padrão de 10 s fecha a conexão a cada pausa, e a próxima request paga o
//   handshake TLS até o Brasil (~200 ms por ida). 240 s fica abaixo dos 350 s de idle do balanceador
//   TCP da AWS, que derruba sem avisar.
// - keepAlive: keepalive TCP a cada minuto (o padrão do Linux é 2 h).
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DB_CONNECTION_LIMIT,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 240_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 60_000,
});

const base = new PrismaClient({
  adapter,
  log: process.env.LOG_QUERIES === "1" ? ["query", "warn", "error"] : ["warn", "error"],
});

// Client único do processo. Só server/services/ importa este arquivo (regra do ESLint).
// A primeira leitura depois de o pooler derrubar a conexão falha; ela é refeita uma vez, 250 ms
// depois, já numa conexão nova do pool.
export const prisma = base.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      try {
        return await query(args);
      } catch (error) {
        if (!READ_OPERATIONS.has(operation) || !isConnectionError(error)) throw error;
        console.warn(`[db] refazendo ${model ?? ""}.${operation} após erro de conexão`);
        await new Promise((resolve) => setTimeout(resolve, 250));
        return query(args);
      }
    },
  },
});

// Em produção, um SELECT 1 por minuto mantém uma conexão quente. O keepalive TCP reinicia o idle do
// balanceador, mas não está provado que o Supavisor mantém a sessão ociosa; fica até alguém medir.
if (env.NODE_ENV === "production") {
  setInterval(() => {
    base.$queryRaw`SELECT 1`.catch((error: unknown) => {
      console.warn("[db] keep-alive falhou", error);
    });
  }, 60_000).unref();
}
