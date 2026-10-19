import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import { SNAPSHOTS_GUARDADOS } from "../../services/importacao/importacao.service";
import { ADMIN_EMAIL, lastAuditEvent, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";
import { CABECALHO, linha, montarPlanilha } from "../../test/planilha";

type Resultado = {
  importacao: { id: number };
  totalLido: number;
  adicionadas: number;
  ignoradas: number;
  removidas: number;
};

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
});

async function importar(
  linhas: unknown[][],
  modo = "SUBSTITUIR",
  cookie = user,
  nome = "relatorio.xlsx",
) {
  const form = new FormData();
  form.append("arquivo", new File([await montarPlanilha(linhas)], nome));
  form.append("modo", modo);
  const res = await app.request("/api/v1/importacoes", {
    method: "POST",
    body: form,
    headers: { Cookie: cookie },
  });
  return { res, body: (await res.json()) as Resultado };
}

const ctes = async () =>
  (await prisma.operacao.findMany({ orderBy: { nr_ctrc: "asc" } })).map((op) => op.nr_ctrc);

describe("POST /importacoes", () => {
  it("qualquer usuário importa; a regra de automação manda a operação para a pasta", async () => {
    const pasta = await prisma.pasta.create({ data: { nome: "Acme" } });
    await prisma.regraAutomacao.create({ data: { pastaId: pasta.id, cliente: "ACME" } });

    const { res, body } = await importar([
      ["", "", "", "", "", "", "", "TOTAL", 300],
      CABECALHO,
      linha({ ctrc: 1, cliente: "acme " }),
      linha({ ctrc: 2, cliente: "BETA" }),
      linha({ ctrc: 3, tipo: "CE", total: 0 }),
    ]);
    expect(res.status).toBe(201);
    expect(body).toMatchObject({ totalLido: 3, adicionadas: 2, ignoradas: 1, removidas: 0 });

    const ops = await prisma.operacao.findMany({ orderBy: { nr_ctrc: "asc" } });
    expect(ops.map((op) => [op.nr_ctrc, op.pastaId, op.importacaoId])).toEqual([
      ["1", pasta.id, body.importacao.id],
      ["2", null, body.importacao.id],
    ]);
    expect(ops[0].nm_agencia).toBe("MATRIZ - SP");
    expect(await lastAuditEvent()).toMatchObject({
      action: "importacao.created",
      targetType: "importacao",
      data: { adicionadas: 2, removidas: 0 },
    });
  });

  it("status da planilha vira o nome cadastrado; o que não está na lista fica como veio", async () => {
    await prisma.statusOperacao.createMany({
      data: [{ nome: "ANEXADO PORTAL" }, { nome: "ENCERRADO", ativo: false }],
    });
    await importar([
      [...CABECALHO, "status"],
      [...linha({ ctrc: 1 }), "anexado portal "],
      [...linha({ ctrc: 2 }), "encerrado"],
      [...linha({ ctrc: 3 }), "texto livre"],
    ]);
    const ops = await prisma.operacao.findMany({ orderBy: { nr_ctrc: "asc" } });
    expect(ops.map((op) => op.status)).toEqual(["ANEXADO PORTAL", "ENCERRADO", "TEXTO LIVRE"]);
  });

  it("a mesma planilha de novo não duplica nada", async () => {
    const planilha = [CABECALHO, linha({ ctrc: 1 }), linha({ ctrc: 2 })];
    await importar(planilha, "ADICIONAR");
    const { body } = await importar(planilha, "ADICIONAR");
    expect(body).toMatchObject({ adicionadas: 0, ignoradas: 2 });
    expect(await prisma.operacao.count()).toBe(2);
  });

  it("Substituir apaga o que não veio e mantém pasta e status do que veio de novo", async () => {
    const pasta = await prisma.pasta.create({ data: { nome: "Alfa" } });
    await importar([CABECALHO, linha({ ctrc: 1 }), linha({ ctrc: 2 }), linha({ ctrc: 3 })]);
    await prisma.operacao.updateMany({
      where: { nr_ctrc: "2" },
      data: { pastaId: pasta.id, status: "CONFERIDO" },
    });

    const { body } = await importar([CABECALHO, linha({ ctrc: 2 }), linha({ ctrc: 4 })]);
    expect(body).toMatchObject({ adicionadas: 1, ignoradas: 1, removidas: 2 });
    expect(await ctes()).toEqual(["2", "4"]);
    expect(await prisma.operacao.findFirst({ where: { nr_ctrc: "2" } })).toMatchObject({
      pastaId: pasta.id,
      status: "CONFERIDO",
    });
  });

  it("Adicionar não apaga nada", async () => {
    await importar([CABECALHO, linha({ ctrc: 1 })]);
    const { body } = await importar([CABECALHO, linha({ ctrc: 2 })], "ADICIONAR");
    expect(body.removidas).toBe(0);
    expect(await ctes()).toEqual(["1", "2"]);
  });

  it("planilha inválida dá 422 sem escrever nada", async () => {
    const { res, body } = await importar([
      ["Agência", "CTRC"],
      ["X", 1],
    ]);
    expect(res.status).toBe(422);
    expect(body).toMatchObject({ code: "PLANILHA_INVALIDA" });
    expect(await prisma.importacao.count()).toBe(0);
    expect(
      (await importar([CABECALHO, linha({ ctrc: 1 })], "SUBSTITUIR", user, "dados.csv")).res.status,
    ).toBe(422);
  });
});

describe("desfazer", () => {
  it("volta pastas, regras e operações ao estado de antes da importação seguinte", async () => {
    const primeira = (await importar([CABECALHO, linha({ ctrc: 1 }), linha({ ctrc: 2 })])).body;
    const pasta = await prisma.pasta.create({ data: { nome: "Antes" } });
    await prisma.regraAutomacao.create({ data: { pastaId: pasta.id, cliente: "ACME" } });
    await prisma.operacao.updateMany({ where: { nr_ctrc: "1" }, data: { pastaId: pasta.id } });

    await importar([CABECALHO, linha({ ctrc: 9, cliente: "OUTRO" })]);
    await prisma.pasta.create({ data: { nome: "Depois" } });
    expect(await ctes()).toEqual(["9"]);

    const admin = await loginAs(app, ADMIN_EMAIL);
    const res = await app.request(`/api/v1/importacoes/${primeira.importacao.id}/restauracoes`, {
      method: "POST",
      headers: { Cookie: admin },
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      importacaoId: primeira.importacao.id,
      importacoesDesfeitas: 1,
    });

    expect(await ctes()).toEqual(["1", "2"]);
    expect((await prisma.pasta.findMany()).map((p) => p.nome)).toEqual(["Antes"]);
    expect(await prisma.regraAutomacao.count()).toBe(1);
    expect(await prisma.operacao.findFirst({ where: { nr_ctrc: "1" } })).toMatchObject({
      pastaId: pasta.id,
      importacaoId: primeira.importacao.id,
    });
    expect(await prisma.importacao.count()).toBe(1);
    expect(await lastAuditEvent()).toMatchObject({ action: "importacao.restored" });

    // As sequências seguem do maior id restaurado: criar de novo não colide.
    await expect(prisma.pasta.create({ data: { nome: "Nova" } })).resolves.toBeTruthy();
    await expect(importar([CABECALHO, linha({ ctrc: 3 })], "ADICIONAR")).resolves.toMatchObject({
      body: { adicionadas: 1 },
    });
  });

  it("usuário comum não desfaz; a importação atual e a sem foto dão 409", async () => {
    const primeira = (await importar([CABECALHO, linha({ ctrc: 1 })])).body;
    const segunda = (await importar([CABECALHO, linha({ ctrc: 2 })])).body;
    const url = (id: number) => `/api/v1/importacoes/${id}/restauracoes`;

    expect(
      (
        await app.request(url(primeira.importacao.id), {
          method: "POST",
          headers: { Cookie: user },
        })
      ).status,
    ).toBe(403);

    const admin = await loginAs(app, ADMIN_EMAIL);
    const post = (id: number) =>
      app.request(url(id), { method: "POST", headers: { Cookie: admin } });
    expect((await post(segunda.importacao.id)).status).toBe(409);
    await prisma.snapshotImportacao.deleteMany();
    expect(await (await post(primeira.importacao.id)).json()).toMatchObject({
      code: "SEM_SNAPSHOT",
    });
    expect((await post(999999)).status).toBe(404);
  });
});

describe("GET /importacoes e retenção", () => {
  it("lista as mais recentes primeiro, e só as anteriores com foto podem ser desfeitas", async () => {
    await importar([CABECALHO, linha({ ctrc: 1 })], "SUBSTITUIR", user, "a.xlsx");
    await importar([CABECALHO, linha({ ctrc: 2 })], "SUBSTITUIR", user, "b.xlsx");
    const res = await app.request("/api/v1/importacoes", { headers: { Cookie: user } });
    expect(await res.json()).toMatchObject({
      data: [
        { nomeArquivo: "b.xlsx", usuario: "Usuário Comum", podeDesfazer: false },
        { nomeArquivo: "a.xlsx", podeDesfazer: true },
      ],
      meta: { total: 2 },
    });
    const busca = await app.request("/api/v1/importacoes?search=A.XLSX", {
      headers: { Cookie: user },
    });
    expect(await busca.json()).toMatchObject({
      data: [{ nomeArquivo: "a.xlsx" }],
      meta: { total: 1 },
    });
  });

  it(`guarda só as últimas ${SNAPSHOTS_GUARDADOS} fotos`, async () => {
    for (let i = 0; i < SNAPSHOTS_GUARDADOS + 1; i++) {
      const importacao = await prisma.importacao.create({
        data: { nomeArquivo: `${i}.xlsx`, usuario: "Teste", qtdRegistros: 0 },
      });
      await prisma.snapshotImportacao.create({
        data: { importacaoId: importacao.id, pastas: [], regras: [], operacoes: [] },
      });
    }
    await importar([CABECALHO, linha({ ctrc: 1 })]);
    expect(await prisma.snapshotImportacao.count()).toBe(SNAPSHOTS_GUARDADOS);
    const maisAntiga = await prisma.importacao.findFirst({
      orderBy: { id: "asc" },
      include: { snapshot: true },
    });
    expect(maisAntiga?.snapshot).toBeNull();
  });
});
