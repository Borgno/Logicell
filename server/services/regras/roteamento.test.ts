import { describe, expect, it } from "vitest";
import { montarMapas, rotear, type RegraRow } from "./roteamento";

const regra = (pastaId: number, campos: Partial<Omit<RegraRow, "pastaId">>): RegraRow => ({
  pastaId,
  agencia: null,
  cliente: null,
  produto: null,
  ...campos,
});

describe("rotear", () => {
  it("sem regra, vai para a Caixa de Entrada", () => {
    expect(rotear({ nm_pessoa_pagador: "ACME" }, montarMapas([]))).toBeNull();
  });

  it("match fraco único: pasta genérica do cliente", () => {
    const mapas = montarMapas([regra(1, { cliente: "ACME" })]);
    expect(rotear({ nm_pessoa_pagador: "  acme " }, mapas)).toBe(1);
  });

  it("dois fracos: ambíguo, Caixa de Entrada", () => {
    const mapas = montarMapas([regra(1, { cliente: "ACME" }), regra(2, { cliente: "ACME" })]);
    expect(rotear({ nm_pessoa_pagador: "ACME" }, mapas)).toBeNull();
  });

  it("match forte único vence o fraco", () => {
    const mapas = montarMapas([
      regra(1, { cliente: "ACME" }),
      regra(2, { cliente: "ACME" }),
      regra(2, { produto: "SOJA" }),
    ]);
    expect(rotear({ nm_pessoa_pagador: "ACME", nm_produto: "soja" }, mapas)).toBe(2);
    // Produto que não bate: a pasta específica sai, e sobra a genérica.
    expect(rotear({ nm_pessoa_pagador: "ACME", nm_produto: "MILHO" }, mapas)).toBe(1);
  });

  it("dois fortes: ambíguo, Caixa de Entrada", () => {
    const mapas = montarMapas([
      regra(1, { cliente: "ACME" }),
      regra(1, { produto: "SOJA" }),
      regra(2, { cliente: "ACME" }),
      regra(2, { produto: "SOJA" }),
    ]);
    expect(rotear({ nm_pessoa_pagador: "ACME", nm_produto: "SOJA" }, mapas)).toBeNull();
  });

  it("pasta específica sem produto na operação não casa", () => {
    const mapas = montarMapas([regra(1, { cliente: "ACME" }), regra(1, { produto: "SOJA" })]);
    expect(rotear({ nm_pessoa_pagador: "ACME" }, mapas)).toBeNull();
  });

  it("cliente antes de agência, e agência quando o cliente não tem regra", () => {
    const mapas = montarMapas([
      regra(1, { cliente: "ACME" }),
      regra(2, { agencia: "MATRIZ - SP" }),
    ]);
    expect(rotear({ nm_pessoa_pagador: "ACME", nm_agencia: "MATRIZ - SP" }, mapas)).toBe(1);
    expect(rotear({ nm_pessoa_pagador: "OUTRO", nm_agencia: "matriz - sp" }, mapas)).toBe(2);
  });

  it("cliente com regra não cai para a agência, mesmo sem casar produto", () => {
    const mapas = montarMapas([
      regra(1, { cliente: "ACME" }),
      regra(1, { produto: "SOJA" }),
      regra(2, { agencia: "MATRIZ - SP" }),
    ]);
    expect(
      rotear({ nm_pessoa_pagador: "ACME", nm_agencia: "MATRIZ - SP", nm_produto: "MILHO" }, mapas),
    ).toBeNull();
  });
});
