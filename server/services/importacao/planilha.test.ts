import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { CABECALHO, linha, montarPlanilha } from "../../test/planilha";
import {
  assinatura,
  lerPlanilha,
  mapearLinha,
  normalizarChave,
  padronizarAgencia,
} from "./planilha";

describe("lerPlanilha", () => {
  it("acha o cabeçalho na linha 1", async () => {
    const buffer = await montarPlanilha([CABECALHO, linha({ ctrc: 10 }), linha({ ctrc: 11 })]);
    const { operacoes, totalLido } = await lerPlanilha(buffer);
    expect(totalLido).toBe(2);
    expect(operacoes.map((op) => op.nr_ctrc)).toEqual(["10", "11"]);
  });

  it("acha o cabeçalho na linha 2, embaixo da linha de totais", async () => {
    const buffer = await montarPlanilha([
      ["", "", "", "", "", "", "", "TOTAL", 300],
      CABECALHO,
      linha({ ctrc: 10 }),
      [],
      linha({ ctrc: 11 }),
    ]);
    const { operacoes, totalLido } = await lerPlanilha(buffer);
    expect(totalLido).toBe(2);
    expect(operacoes.map((op) => op.nr_ctrc)).toEqual(["10", "11"]);
  });

  it("casa cabeçalhos pelo De-Para, sem caixa, acento, espaço nem _", async () => {
    const buffer = await montarPlanilha([
      ["Agência", "Data Emissão", "Cliente", "CTRC", "Nota Fiscal", "Valor Total", "Placa"],
      ["Sinop  -mt", "05/03/2026", "Beta", "77", "NF9", 10.5, "ABC1234"],
    ]);
    const [op] = (await lerPlanilha(buffer)).operacoes;
    expect(op).toMatchObject({
      nm_agencia: "SINOP - MT",
      nm_pessoa_pagador: "Beta",
      nr_ctrc: "77",
      nr_nf: "NF9",
      vl_total: 10.5,
      ds_placa: "ABC1234",
    });
    expect(op.dt_emissao_?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("lê data de célula de data como meia-noite UTC do mesmo dia", async () => {
    const buffer = await montarPlanilha([
      CABECALHO,
      linha({ ctrc: 1, emissao: new Date(Date.UTC(2026, 2, 5)) }),
    ]);
    const [op] = (await lerPlanilha(buffer)).operacoes;
    expect(op.dt_emissao_?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("descarta CE com valor zero ou vazio, e mantém CE com valor", async () => {
    const buffer = await montarPlanilha([
      CABECALHO,
      linha({ ctrc: 1, tipo: "CE", total: 0 }),
      linha({ ctrc: 2, tipo: " ce ", total: "" }),
      linha({ ctrc: 3, tipo: "CE", total: "0,00" }),
      linha({ ctrc: 4, tipo: "CE", total: 50 }),
      linha({ ctrc: 5, tipo: "CTE", total: 0 }),
    ]);
    const { operacoes, totalLido } = await lerPlanilha(buffer);
    expect(totalLido).toBe(5);
    expect(operacoes.map((op) => op.nr_ctrc)).toEqual(["4", "5"]);
  });

  it("recusa planilha sem as colunas obrigatórias, vazia ou que não é planilha", async () => {
    await expect(
      lerPlanilha(
        await montarPlanilha([
          ["Agência", "CTRC"],
          ["X", 1],
        ]),
      ),
    ).rejects.toThrow("Colunas obrigatórias faltando: NF, VALOR TOTAL");
    await expect(lerPlanilha(await montarPlanilha([CABECALHO]))).rejects.toThrow("Não há dados");
    await expect(lerPlanilha(Buffer.from("não é planilha"))).rejects.toMatchObject({
      code: "PLANILHA_INVALIDA",
    });
  });

  it("lê .xls, o formato binário antigo que o ERP exporta", async () => {
    const sheet = XLSX.utils.aoa_to_sheet(
      [
        ["", "TOTAL"],
        ["AGENCIA", "DATA EMISSAO", "CTRC", "NF", "VALOR TOTAL"],
        ["sinop - mt", new Date(2026, 2, 5), 123, 456, 1500.5],
      ],
      { cellDates: true },
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Relatório");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "biff8" }) as Buffer;
    const [op] = (await lerPlanilha(buffer)).operacoes;
    expect(op).toMatchObject({
      nm_agencia: "SINOP - MT",
      nr_ctrc: "123",
      nr_nf: "456",
      vl_total: 1500.5,
    });
    expect(op.dt_emissao_?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(op.hash_assinatura).toBe(
      assinatura({ nm_agencia: "SINOP - MT", nr_ctrc: "123", nr_nf: "456", vl_total: 1500.5 }),
    );
  });

  it("entende fórmula e rich text", async () => {
    const buffer = await montarPlanilha([
      CABECALHO,
      [
        { richText: [{ text: "MATRIZ" }, { text: " - SP" }] },
        null,
        "ACME",
        "9",
        "CTE",
        null,
        "1",
        null,
        { formula: "50*2", result: 100 },
      ],
    ]);
    const [op] = (await lerPlanilha(buffer)).operacoes;
    expect(op).toMatchObject({ nm_agencia: "MATRIZ - SP", vl_total: 100 });
  });
});

describe("assinatura", () => {
  it("é o SHA-256 de agência|CTRC|NF|valor com duas casas, como no sistema antigo", () => {
    const esperado = createHash("sha256").update("MATRIZ - SP|123|456|1500.50").digest("hex");
    expect(
      assinatura({ nm_agencia: "MATRIZ - SP", nr_ctrc: "123", nr_nf: "456", vl_total: 1500.5 }),
    ).toBe(esperado);
    const semNf = createHash("sha256").update("MATRIZ - SP|123||0.00").digest("hex");
    expect(
      assinatura({ nm_agencia: "MATRIZ - SP", nr_ctrc: "123", nr_nf: null, vl_total: null }),
    ).toBe(semNf);
  });

  it("sai na linha mapeada e muda quando o valor muda", () => {
    const base = {
      [normalizarChave("AGENCIA")]: "matriz - sp",
      NRCTRC: "1",
      NRNF: "2",
      VLTOTAL: 10,
    };
    const a = mapearLinha(base)!;
    const b = mapearLinha({ ...base, VLTOTAL: 10.01 })!;
    expect(a.hash_assinatura).toBe(assinatura(a));
    expect(a.hash_assinatura).not.toBe(b.hash_assinatura);
  });
});

describe("padronizarAgencia", () => {
  it("caixa alta, espaço único e traço com espaço dos dois lados", () => {
    expect(padronizarAgencia("  lpc  transportes-rondonopolis ")).toBe(
      "LPC TRANSPORTES - RONDONOPOLIS",
    );
  });
});
