import { Prisma } from "./generated/client";

// Códigos do Prisma para conexão perdida: servidor fora (P1001), timeout de conexão (P1002) ou de
// socket (P1008) e conexão fechada pelo servidor (P1017).
const PRISMA_CONNECTION_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

// Código do Postgres que acompanha o erro do adapter quando o servidor encerra a sessão:
// 57P01 (admin_shutdown), 57P02 (crash_shutdown), 57P03 (cannot_connect_now).
function postgresCode(meta: unknown): string | undefined {
  if (typeof meta !== "object" || meta === null || !("driverAdapterError" in meta)) return;
  const adapterError = meta.driverAdapterError;
  if (typeof adapterError !== "object" || adapterError === null || !("cause" in adapterError)) {
    return;
  }
  const cause = adapterError.cause;
  if (typeof cause !== "object" || cause === null || !("originalCode" in cause)) return;
  return typeof cause.originalCode === "string" ? cause.originalCode : undefined;
}

// Conexão que cai (restart do db, rede) chega de três jeitos com o adapter do pg:
// código P de conexão; P2010 (query crua) ou P2039 (operação de modelo) com 57P0x no meta; ou um
// Error puro do pg quando o socket fecha no meio da query, sem código nenhum.
export function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (PRISMA_CONNECTION_CODES.has(error.code)) return true;
    return postgresCode(error.meta)?.startsWith("57P0") ?? false;
  }
  return error instanceof Error && error.message.includes("Connection terminated unexpectedly");
}
