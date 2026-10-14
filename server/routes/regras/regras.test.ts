import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import { mapasRoteamento } from "../../services/regras/regras.service";
import { rotear } from "../../services/regras/roteamento";
import {
  ADMIN_EMAIL,
  jsonRequest,
  lastAuditEvent,
  loginAs,
  setupApp,
  setUser,
  USER_EMAIL,
} from "../../test/helpers";

type ListBody = {
  data: {
    id: number;
    nome: string;
    regras: { id: number; tipo: string; valor: string; conflito: boolean }[];
  }[];
};

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;
let alfa: number;
let beta: number;

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
  alfa = (await prisma.pasta.create({ data: { nome: "Alfa" } })).id;
  beta = (await prisma.pasta.create({ data: { nome: "Beta" } })).id;
});

const BASE = "/api/v1/regras";
const add = (body: Record<string, unknown>, cookie = admin) =>
  app.request(BASE, jsonRequest("POST", body, cookie));
const list = async () =>
  (await (await app.request(BASE, { headers: { Cookie: admin } })).json()) as ListBody;

describe("regras de automação", () => {
  it("só supervisor e admin gerenciam", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await app.request(BASE, { headers: { Cookie: user } })).status).toBe(403);
    await setUser(USER_EMAIL, { role: "gestor" });
    const gestor = await loginAs(app, USER_EMAIL);
    expect((await add({ pastaId: alfa, tipo: "cliente", valor: "acme" }, gestor)).status).toBe(201);
  });

  it("grava em caixa alta, recusa repetida na mesma pasta e registra no audit da pasta", async () => {
    const res = await add({ pastaId: alfa, tipo: "cliente", valor: "  acme " });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ tipo: "cliente", valor: "ACME", conflito: false });
    expect(await lastAuditEvent()).toMatchObject({
      action: "regra.created",
      targetType: "pasta",
      targetId: String(alfa),
    });
    expect((await add({ pastaId: alfa, tipo: "cliente", valor: "Acme" })).status).toBe(409);
    expect((await add({ pastaId: 999999, tipo: "cliente", valor: "X" })).status).toBe(404);
  });

  it("marca o conflito nas duas pastas genéricas e desmarca ao remover", async () => {
    await add({ pastaId: alfa, tipo: "cliente", valor: "ACME" });
    const res = await add({ pastaId: beta, tipo: "cliente", valor: "ACME" });
    expect(await res.json()).toMatchObject({ conflito: true });
    const body = await list();
    expect(body.data.flatMap((pasta) => pasta.regras.map((regra) => regra.conflito))).toEqual([
      true,
      true,
    ]);

    const regraBeta = body.data.find((pasta) => pasta.id === beta)!.regras[0];
    const del = await app.request(`${BASE}/${regraBeta.id}`, {
      method: "DELETE",
      headers: { Cookie: admin },
    });
    expect(del.status).toBe(204);
    expect((await list()).data[0].regras[0].conflito).toBe(false);
  });

  it("os mapas do motor acompanham a escrita", async () => {
    await add({ pastaId: alfa, tipo: "agencia", valor: "MATRIZ - SP" });
    expect(rotear({ nm_agencia: "matriz - sp" }, await mapasRoteamento())).toBe(alfa);
    await add({ pastaId: beta, tipo: "agencia", valor: "MATRIZ - SP" });
    expect(rotear({ nm_agencia: "MATRIZ - SP" }, await mapasRoteamento())).toBeNull();
  });
});
