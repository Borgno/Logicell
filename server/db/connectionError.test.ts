import { describe, expect, it } from "vitest";
import { isConnectionError } from "./connectionError";
import { Prisma } from "./generated/client";

function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("erro", { code, clientVersion: "7", meta });
}

function adapterMeta(originalCode: string) {
  return { driverAdapterError: { cause: { originalCode, kind: "postgres" } } };
}

describe("isConnectionError", () => {
  it("reconhece os códigos P de conexão", () => {
    for (const code of ["P1001", "P1002", "P1008", "P1017"]) {
      expect(isConnectionError(knownError(code))).toBe(true);
    }
  });

  it("reconhece sessão encerrada pelo servidor em query crua e em operação de modelo", () => {
    expect(isConnectionError(knownError("P2010", adapterMeta("57P01")))).toBe(true);
    expect(isConnectionError(knownError("P2039", adapterMeta("57P01")))).toBe(true);
    expect(isConnectionError(knownError("P2039", adapterMeta("57P03")))).toBe(true);
  });

  it("reconhece o socket fechado no meio da query", () => {
    expect(isConnectionError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("não refaz erro de dado", () => {
    expect(isConnectionError(knownError("P2002"))).toBe(false);
    expect(isConnectionError(knownError("P2010", adapterMeta("23505")))).toBe(false);
    expect(isConnectionError(knownError("P2010", { driverAdapterError: "texto" }))).toBe(false);
    expect(isConnectionError(new Error("outra coisa"))).toBe(false);
    expect(isConnectionError("texto")).toBe(false);
  });
});
