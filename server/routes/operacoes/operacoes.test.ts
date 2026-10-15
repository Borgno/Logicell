import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import type { Prisma } from "../../db/generated/client";
import { jsonRequest, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

type Row = Record<string, unknown> & {
  id: number;
  emissaoAntiga: boolean;
  placaDuplicada: boolean;
};
type ListBody = {
  data: Row[];
  meta: { page: number; pageSize: number; total: number; totalValor: number };
};

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;
let pasta: number;

const DIA = 24 * 60 * 60 * 1000;
const diasAtras = (dias: number) => {
  const data = new Date(Date.now() - dias * DIA);
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
};

function op(data: Partial<Prisma.OperacaoCreateManyInput> = {}): Prisma.OperacaoCreateManyInput {
  return { nm_agencia: "MATRIZ - SP", nr_ctrc: "1", ...data };
}

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
  pasta = (await prisma.pasta.create({ data: { nome: "Alfa" } })).id;
});

const get = async (query: string) => {
  const res = await app.request(`/api/v1/operacoes?${query}`, { headers: { Cookie: user } });
  return { res, body: (await res.json()) as ListBody };
};
const send = (method: string, path: string, body: unknown) =>
  app.request(`/api/v1/operacoes${path}`, jsonRequest(method, body, user));

describe("GET /operacoes", () => {
  it("separa Caixa de Entrada e pasta, com total e soma do valor", async () => {
    await prisma.operacao.createMany({
      data: [
        op({ nr_ctrc: "10", vl_total: 100.5 }),
        op({ nr_ctrc: "11", vl_total: 50 }),
        op({ nr_ctrc: "12", pastaId: pasta, vl_total: 7 }),
      ],
    });
    const inbox = await get("pasta=inbox");
    expect(inbox.res.status).toBe(200);
    expect(inbox.body.meta).toEqual({ page: 1, pageSize: 200, total: 2, totalValor: 150.5 });
    expect(inbox.body.data[0]).toMatchObject({ cte: "11", agencia: "MATRIZ - SP", total: 50 });
    expect(inbox.body.data[0]).not.toHaveProperty("nr_ctrc");

    const daPasta = await get(`pasta=${pasta}`);
    expect(daPasta.body.data.map((row) => row.cte)).toEqual(["12"]);
    expect((await get("pasta=999999")).res.status).toBe(404);
  });

  it("filtra por coluna, com OU por vírgula, vazio e período", async () => {
    await prisma.operacao.createMany({
      data: [
        op({ nr_ctrc: "1", nm_pessoa_pagador: "ACME LTDA", dt_emissao_: new Date("2026-03-05") }),
        op({ nr_ctrc: "2", nm_pessoa_pagador: "BETA SA", dt_emissao_: new Date("2026-04-10") }),
        op({ nr_ctrc: "3", nm_pessoa_pagador: null }),
      ],
    });
    const ctes = async (query: string) =>
      (await get(`pasta=inbox&${query}`)).body.data.map((r) => r.cte).sort();
    expect(await ctes("filtro=cliente:contains:acme")).toEqual(["1"]);
    expect(await ctes("filtro=cliente:contains:acme,beta")).toEqual(["1", "2"]);
    expect(await ctes("filtro=cliente:blank")).toEqual(["3"]);
    expect(await ctes("filtro=dataEmissao:equals:05/03/2026")).toEqual(["1"]);
    expect(
      await ctes(`filtro=${encodeURIComponent("dataEmissao:period:01/04/2026;30/04/2026")}`),
    ).toEqual(["2"]);
    expect(await ctes("filtro=cliente:contains:a&filtro=cte:equals:2")).toEqual(["2"]);
    expect((await get("pasta=inbox&filtro=nm_pessoa_pagador:contains:x")).res.status).toBe(422);
    expect((await get("pasta=inbox&filtro=cliente:antigos")).res.status).toBe(422);
  });

  it("marca e filtra emissão antiga pelo prazo do cliente, e placa duplicada no escopo", async () => {
    await prisma.prazoCliente.create({ data: { cliente: "ACME", prazoDias: 30 } });
    await prisma.operacao.createMany({
      data: [
        op({
          nr_ctrc: "1",
          nm_pessoa_pagador: "acme ",
          dt_emissao_: diasAtras(20),
          ds_placa: "ABC1234",
        }),
        op({
          nr_ctrc: "2",
          nm_pessoa_pagador: "OUTRO",
          dt_emissao_: diasAtras(20),
          ds_placa: "abc1234 ",
        }),
        op({
          nr_ctrc: "3",
          nm_pessoa_pagador: "OUTRO",
          dt_emissao_: diasAtras(5),
          ds_placa: "XYZ9999",
        }),
        // Mesma placa em outra pasta não conta.
        op({ nr_ctrc: "4", pastaId: pasta, ds_placa: "XYZ9999" }),
      ],
    });
    const { body } = await get("pasta=inbox&sort=cte");
    expect(body.data.map((row) => [row.cte, row.emissaoAntiga, row.placaDuplicada])).toEqual([
      ["1", false, true],
      ["2", true, true],
      ["3", false, false],
    ]);
    const antigas = await get("pasta=inbox&filtro=dataEmissao:antigos");
    expect(antigas.body.data.map((row) => row.cte)).toEqual(["2"]);
    const duplicadas = await get("pasta=inbox&filtro=placa:duplicados&sort=cte");
    expect(duplicadas.body.data.map((row) => row.cte)).toEqual(["1", "2"]);
  });

  it("ordena o CTe pelo número e pagina", async () => {
    await prisma.operacao.createMany({
      data: ["9", "10", "100"].map((nr_ctrc) => op({ nr_ctrc })),
    });
    expect((await get("pasta=inbox&sort=-cte")).body.data.map((row) => row.cte)).toEqual([
      "100",
      "10",
      "9",
    ]);
    const page2 = await get("pasta=inbox&sort=cte&page=2&pageSize=2");
    expect(page2.body.data.map((row) => row.cte)).toEqual(["100"]);
    const alem = await get("pasta=inbox&page=5&pageSize=2");
    expect(alem.body).toMatchObject({ data: [], meta: { total: 3 } });
  });

  it("busca livre por CTe, NF, cliente e placa", async () => {
    await prisma.operacao.createMany({
      data: [
        op({ nr_ctrc: "555", nr_nf: "NF-1" }),
        op({ nr_ctrc: "1", ds_placa: "QWE5555" }),
        op({ nr_ctrc: "2" }),
      ],
    });
    expect((await get("pasta=inbox&search=555")).body.meta.total).toBe(2);
  });
});

describe("PATCH /operacoes/{id}", () => {
  it("grava texto, data e número convertidos, e status grava a data do status", async () => {
    const { id } = await prisma.operacao.create({ data: op() });
    const patch = (campo: string, valor: string | null) =>
      send("PATCH", `/${id}`, { campo, valor });

    expect(await (await patch("dataEmissao", "05/03/2026")).json()).toMatchObject({
      dataEmissao: "2026-03-05T00:00:00.000Z",
    });
    expect(await (await patch("total", "1.234,56")).json()).toMatchObject({ total: 1234.56 });
    const status = (await (await patch("status", "FATURADO")).json()) as Row;
    expect(status.status).toBe("FATURADO");
    expect(status.dataStatus).not.toBeNull();
    expect(await (await patch("comentarios", "")).json()).toMatchObject({ comentarios: null });

    expect((await patch("dataEmissao", "31/02/2026")).status).toBe(422);
    expect((await patch("total", "muito")).status).toBe(422);
    expect((await patch("cte", " ")).status).toBe(422);
    expect((await patch("pastaId", "1")).status).toBe(422);
    expect((await send("PATCH", "/999999", { campo: "status", valor: "X" })).status).toBe(404);
  });
});

describe("lote", () => {
  beforeEach(async () => {
    await prisma.operacao.createMany({
      data: [
        op({ nr_ctrc: "1", nm_pessoa_pagador: "ACME" }),
        op({ nr_ctrc: "2", nm_pessoa_pagador: "ACME" }),
        op({ nr_ctrc: "3", nm_pessoa_pagador: "BETA" }),
      ],
    });
  });

  const idsDe = async (...ctes: string[]) =>
    (
      await prisma.operacao.findMany({ where: { nr_ctrc: { in: ctes } }, orderBy: { id: "asc" } })
    ).map((o) => o.id);

  it("move as marcadas para a pasta e de volta para a Caixa de Entrada", async () => {
    const ids = await idsDe("1", "3");
    const res = await send("PATCH", "", { selecao: { ids }, pastaId: pasta });
    expect(await res.json()).toEqual({ afetadas: 2 });
    expect((await get(`pasta=${pasta}`)).body.meta.total).toBe(2);
    await send("PATCH", "", { selecao: { ids }, pastaId: null });
    expect((await get("pasta=inbox")).body.meta.total).toBe(3);
    expect((await send("PATCH", "", { selecao: { ids }, pastaId: 999999 })).status).toBe(404);
  });

  it("move todas as filtradas menos as desmarcadas", async () => {
    const [primeira] = await idsDe("1");
    const res = await send("PATCH", "", {
      selecao: {
        todas: { pasta: "inbox", filtro: ["cliente:equals:ACME"], excluidos: [primeira] },
      },
      pastaId: pasta,
    });
    expect(await res.json()).toEqual({ afetadas: 1 });
    expect((await get(`pasta=${pasta}`)).body.data.map((row) => row.cte)).toEqual(["2"]);
  });

  it("troca o status em lote só onde muda, e exclui", async () => {
    const ids = await idsDe("1", "2");
    await send("PATCH", "", { selecao: { ids }, campo: "status", valor: "OK" });
    const rows = await prisma.operacao.findMany({ where: { id: { in: ids } } });
    expect(rows.every((row) => row.status === "OK" && row.data_status !== null)).toBe(true);
    expect((await send("PATCH", "", { selecao: { ids }, campo: "cte", valor: "X" })).status).toBe(
      422,
    );

    const del = await send("DELETE", "", { selecao: { ids } });
    expect(await del.json()).toEqual({ afetadas: 2 });
    expect(await prisma.operacao.count()).toBe(1);
  });
});

describe("planilha e contadores", () => {
  it("exporta a lista filtrada em XLSX", async () => {
    await prisma.operacao.createMany({ data: [op({ nr_ctrc: "1" }), op({ nr_ctrc: "2" })] });
    const res = await app.request("/api/v1/operacoes/planilha?pasta=inbox&ordem=cte,agencia", {
      headers: { Cookie: user },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await res.arrayBuffer());
    const sheet = workbook.worksheets[0];
    expect(sheet.getRow(1).getCell(1).value).toBe("CTe");
    expect(sheet.getRow(1).getCell(2).value).toBe("Agência");
    expect(sheet.rowCount).toBe(3);
  });

  it("conta total e emissões antigas por pasta", async () => {
    await prisma.operacao.createMany({
      data: [
        op({ dt_emissao_: diasAtras(40), vl_total: 10 }),
        op({ dt_emissao_: diasAtras(1) }),
        op({ pastaId: pasta, dt_emissao_: diasAtras(40), vl_total: 5 }),
      ],
    });
    const res = await app.request("/api/v1/operacaoStats", { headers: { Cookie: user } });
    expect(await res.json()).toEqual({
      caixaDeEntrada: { total: 2, emissoesAntigas: 1, valorEmissoesAntigas: 10 },
      pastas: [{ pastaId: pasta, total: 1, emissoesAntigas: 1, valorEmissoesAntigas: 5 }],
    });
  });
});
