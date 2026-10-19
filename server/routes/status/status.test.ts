import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import {
  ADMIN_EMAIL,
  jsonRequest,
  lastAuditEvent,
  loginAs,
  setupApp,
  USER_EMAIL,
} from "../../test/helpers";

type Item = { id: number; nome: string; ordem: number; ativo: boolean };

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
});

const BASE = "/api/v1/status";
const send = (method: string, path: string, body?: unknown, cookie = admin) =>
  app.request(`${BASE}${path}`, jsonRequest(method, body, cookie));
const criar = async (nome: string) => (await (await send("POST", "", { nome })).json()) as Item;
const lista = async () => ((await (await send("GET", "")).json()) as { data: Item[] }).data;

describe("status das operações", () => {
  it("todo usuário lê a lista; só supervisor e admin mudam", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await send("GET", "", undefined, user)).status).toBe(200);
    expect((await send("POST", "", { nome: "X" }, user)).status).toBe(403);
  });

  it("cria no fim da lista e recusa nome repetido em outra caixa", async () => {
    const res = await send("POST", "", { nome: " Aberto " });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ nome: "Aberto", ordem: 1, ativo: true });
    expect((await criar("ENCERRADO")).ordem).toBe(2);
    expect((await send("POST", "", { nome: "aberto" })).status).toBe(409);
    expect((await send("POST", "", { nome: " " })).status).toBe(422);
    expect(await lastAuditEvent()).toMatchObject({
      action: "status.created",
      targetType: "status",
    });
  });

  it("renomear leva junto as operações com o nome antigo", async () => {
    const status = await criar("PENDENTE");
    await prisma.operacao.createMany({
      data: [
        { nm_agencia: "A", nr_ctrc: "1", status: "PENDENTE" },
        { nm_agencia: "A", nr_ctrc: "2", status: "OUTRO" },
      ],
    });
    const res = await send("PATCH", `/${status.id}`, { nome: "PENDENTE FILIAL" });
    expect(await res.json()).toMatchObject({ nome: "PENDENTE FILIAL" });
    const ops = await prisma.operacao.findMany({ orderBy: { nr_ctrc: "asc" } });
    expect(ops.map((op) => op.status)).toEqual(["PENDENTE FILIAL", "OUTRO"]);
    expect(await lastAuditEvent()).toMatchObject({
      action: "status.updated",
      data: { nome: { from: "PENDENTE", to: "PENDENTE FILIAL" }, operacoesRenomeadas: 1 },
    });

    await criar("ABERTO");
    expect((await send("PATCH", `/${status.id}`, { nome: "aberto" })).status).toBe(409);
    expect((await send("PATCH", `/${status.id}`, {})).status).toBe(422);
    expect((await send("PATCH", "/999999", { ativo: false })).status).toBe(404);
  });

  it("desativar tira o status da edição, e a lista continua mostrando", async () => {
    const status = await criar("SINISTRO");
    expect(await (await send("PATCH", `/${status.id}`, { ativo: false })).json()).toMatchObject({
      ativo: false,
    });
    expect((await lista()).map((s) => [s.nome, s.ativo])).toEqual([["SINISTRO", false]]);
    const { id } = await prisma.operacao.create({ data: { nm_agencia: "A", nr_ctrc: "1" } });
    const res = await app.request(
      `/api/v1/operacoes/${id}`,
      jsonRequest("PATCH", { campo: "status", valor: "SINISTRO" }, admin),
    );
    expect(res.status).toBe(422);
  });

  it("reordena com todos os ids, e recusa lista incompleta ou repetida", async () => {
    const a = await criar("A");
    const b = await criar("B");
    const c = await criar("C");
    const res = await send("PUT", "/ordem", { ids: [c.id, a.id, b.id] });
    expect(res.status).toBe(200);
    expect((await lista()).map((s) => s.nome)).toEqual(["C", "A", "B"]);
    expect((await send("PUT", "/ordem", { ids: [a.id, b.id] })).status).toBe(422);
    expect((await send("PUT", "/ordem", { ids: [a.id, a.id, b.id] })).status).toBe(422);
  });

  it("exclui só o que nenhuma operação usa", async () => {
    const usado = await criar("USADO");
    const livre = await criar("LIVRE");
    await prisma.operacao.create({ data: { nm_agencia: "A", nr_ctrc: "1", status: "USADO" } });
    const emUso = await send("DELETE", `/${usado.id}`);
    expect(emUso.status).toBe(409);
    expect(await emUso.json()).toMatchObject({ code: "STATUS_EM_USO" });
    expect((await send("DELETE", `/${livre.id}`)).status).toBe(204);
    expect((await send("DELETE", `/${livre.id}`)).status).toBe(404);
    expect((await lista()).map((s) => s.nome)).toEqual(["USADO"]);
  });
});
