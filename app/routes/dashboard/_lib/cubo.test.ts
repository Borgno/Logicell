import { describe, expect, it } from "vitest";
import { agregarCubo, FILTRO_VAZIO, type Cubo, type CuboLinha } from "./cubo";

const linha = (campos: Partial<CuboLinha>): CuboLinha => ({
  status: "OK",
  tipo: "CTE",
  agencia: "MATRIZ - SP",
  tipoCte: null,
  cliente: "ACME",
  pastaId: 1,
  valor: 0,
  quantidade: 1,
  primeira: null,
  ultima: null,
  antigas: 0,
  valorAntigas: 0,
  ...campos,
});

const cubo: Cubo = {
  faturistaId: "f",
  pastas: [{ id: 1, nome: "Alfa", cor: null }],
  linhas: [
    linha({ valor: 100, primeira: "2026-03-01", ultima: "2026-03-10" }),
    linha({
      status: null,
      valor: 50,
      antigas: 1,
      valorAntigas: 50,
      primeira: "2026-02-01",
      ultima: "2026-02-02",
    }),
    linha({ status: " ", cliente: "BETA", pastaId: null, valor: 25 }),
  ],
};

describe("agregarCubo", () => {
  it("soma tudo sem sub-filtro, com período e pastas", () => {
    const detalhe = agregarCubo(cubo, {});
    expect(detalhe).toMatchObject({ valor: 175, quantidade: 3, antigas: 1, valorAntigas: 50 });
    expect([detalhe.primeira, detalhe.ultima]).toEqual(["2026-02-01", "2026-03-10"]);
    expect(detalhe.pastas.map((pasta) => [pasta.nome, pasta.valor])).toEqual([
      ["Alfa", 150],
      ["Caixa de Entrada", 25],
    ]);
  });

  it("vazio casa null e texto em branco; o filtro vale para todas as dimensões", () => {
    const detalhe = agregarCubo(cubo, { status: FILTRO_VAZIO });
    expect(detalhe.valor).toBe(75);
    expect(detalhe.grupos.cliente.map((grupo) => grupo.chave)).toEqual(["ACME", "BETA"]);
    expect(agregarCubo(cubo, { status: FILTRO_VAZIO, cliente: "BETA" }).valor).toBe(25);
  });
});
