import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  var __prisma: ReturnType<typeof criarClient> | undefined;
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

//Operações de leitura: seguras para refazer sem duplicar efeito colateral
//(escritas ficam de fora do retry por isso). Cobre modelos e as chamadas raw.
const OPERACOES_LEITURA = new Set([
  "findMany", "findFirst", "findUnique", "findFirstOrThrow", "findUniqueOrThrow",
  "count", "aggregate", "groupBy", "$queryRaw", "$queryRawUnsafe",
]);

//O pooler do Supabase (modo sessão, aws-1-sa-east-1) derruba conexões ociosas
//sem avisar; a 1ª query após um tempo parado falha com P1001/P1002/P1017 (ou
//PrismaClientInitializationError/"Can't reach database server") em vez de só
//reconectar. Isolado para o retry abaixo reusar.
function isErroDeConexao(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P1001" || err.code === "P1002" || err.code === "P1017";
  }
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Can't reach database server");
}

function criarClient() {
  return new PrismaClient({
    log: logLevels,
    datasourceUrl: buildDatasourceUrl(),
  }).$extends({
    query: {
      //$allOperations sob `query` (Prisma 5) cobre modelos e raw no mesmo
      //lugar. Refaz uma vez, só leitura, dando ~250ms para o engine
      //reconectar (a 2ª tentativa já paga o handshake, não a request do
      //usuário original).
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (!OPERACOES_LEITURA.has(operation) || !isErroDeConexao(err)) throw err;
          console.warn(`[Prisma] refazendo ${model ?? ""}.${operation} após erro de conexão`);
          await new Promise((resolve) => setTimeout(resolve, 250));
          return query(args);
        }
      },
    },
  });
}

const prisma = global.__prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
