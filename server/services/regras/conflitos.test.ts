import { describe, expect, it } from "vitest";
import { regrasEmConflito } from "./conflitos";

let nextId = 1;
const regra = (
  pastaId: number,
  campos: { agencia?: string; cliente?: string; produto?: string },
) => ({
  id: nextId++,
  pastaId,
  agencia: campos.agencia ?? null,
  cliente: campos.cliente ?? null,
  produto: campos.produto ?? null,
});

describe("regrasEmConflito", () => {
  it("duas pastas genéricas com o mesmo cliente", () => {
    const a = regra(1, { cliente: "ACME" });
    const b = regra(2, { cliente: "acme" });
    expect(regrasEmConflito([a, b])).toEqual(new Set([a.id, b.id]));
  });

  it("duas pastas específicas com produto em comum e a mesma agência", () => {
    const a = regra(1, { agencia: "MATRIZ - SP" });
    const b = regra(2, { agencia: "MATRIZ - SP" });
    const regras = [a, b, regra(1, { produto: "SOJA" }), regra(2, { produto: "SOJA" })];
    expect(regrasEmConflito(regras)).toEqual(new Set([a.id, b.id]));
  });

  it("genérica e específica com o mesmo cliente não conflitam: a específica vence pelo produto", () => {
    const regras = [
      regra(1, { cliente: "ACME" }),
      regra(2, { cliente: "ACME" }),
      regra(2, { produto: "SOJA" }),
    ];
    expect(regrasEmConflito(regras).size).toBe(0);
  });

  it("específicas sem produto em comum não conflitam", () => {
    const regras = [
      regra(1, { cliente: "ACME" }),
      regra(1, { produto: "SOJA" }),
      regra(2, { cliente: "ACME" }),
      regra(2, { produto: "MILHO" }),
    ];
    expect(regrasEmConflito(regras).size).toBe(0);
  });

  it("regra de produto nunca é marcada", () => {
    const produto = regra(1, { produto: "SOJA" });
    const regras = [
      regra(1, { cliente: "ACME" }),
      produto,
      regra(2, { cliente: "ACME" }),
      regra(2, { produto: "SOJA" }),
    ];
    expect(regrasEmConflito(regras).has(produto.id)).toBe(false);
  });
});
