import { Prisma } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";

// O que os recursos de organização têm em comum: os erros do banco viram Problem Details.

type Kind = { name: string; code: string; o: "o" | "a"; duplicateField: string };

export const KINDS = {
  pasta: { name: "Pasta", code: "PASTA", o: "a", duplicateField: "nome" },
  regra: { name: "Regra", code: "REGRA", o: "a", duplicateField: "valor" },
  prazoCliente: {
    name: "Prazo do cliente",
    code: "PRAZO_CLIENTE",
    o: "o",
    duplicateField: "cliente",
  },
  status: { name: "Status", code: "STATUS", o: "o", duplicateField: "nome" },
} as const satisfies Record<string, Kind>;

export function notFound(kind: Kind) {
  return new ApiProblem(404, `${kind.code}_NOT_FOUND`, `${kind.name} não encontrad${kind.o}.`);
}

export function duplicate(kind: Kind, detail = `${kind.name} já cadastrad${kind.o}.`) {
  return new ApiProblem(409, `${kind.code}_DUPLICATE`, detail, {
    errors: [{ field: kind.duplicateField, message: detail }],
  });
}

// Roda a operação no banco e traduz nome repetido (P2002) e registro que sumiu (P2025).
export async function guard<T>(kind: Kind, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
    if (error.code === "P2002") throw duplicate(kind);
    if (error.code === "P2025") throw notFound(kind);
    throw error;
  }
}
