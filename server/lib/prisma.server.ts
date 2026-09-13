import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  try {
    const url = new URL(base);
    //Cap no pool: o pooler do Supabase em modo sessão limita o total de clientes
    //(15 no plano atual) e cada processo segura `connection_limit` conexões.
    //Produção fica com 10; fora dela o padrão é 2, para um `npm run dev` local
    //não disputar slots com o container em produção. DB_CONNECTION_LIMIT
    //sobrescreve. pool_timeout evita request travado esperando conexão (a VPS
    //fica na EU e o banco no BR, então cada ida ao banco já custa ~200 ms).
    const connectionLimit =
      process.env.DB_CONNECTION_LIMIT || (process.env.NODE_ENV === "production" ? "10" : "2");
    url.searchParams.set("connection_limit", connectionLimit);
    url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return base;
  }
}

//LOG_QUERIES=1 acrescenta "query" ao log do Prisma — útil para contar viagens
//de rede ao banco sem mexer em nada quando a env não está setada.
const logLevels: ("query" | "warn" | "error")[] =
  process.env.LOG_QUERIES === "1" ? ["query", "warn", "error"] : ["warn", "error"];

const prisma = global.__prisma ?? new PrismaClient({
  log: logLevels,
  datasourceUrl: buildDatasourceUrl(),
});

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
