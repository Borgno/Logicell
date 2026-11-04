import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import { prazoDoCliente } from "../../services/prazos/prazos.service";
import { ADMIN_EMAIL, jsonRequest, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
});

const BASE = "/api/v1/prazos";
const send = (method: string, path: string, body?: unknown) =>
  app.request(`${BASE}${path}`, jsonRequest(method, body, admin));

describe("prazos de emissão", () => {
  it("usuário comum recebe 403", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await app.request(BASE, { headers: { Cookie: user } })).status).toBe(403);
  });

  it("padrão de 10 dias sem configuração, e troca", async () => {
    expect(await (await send("GET", "")).json()).toEqual({ padraoDias: 10, clientes: [] });
    const res = await send("PUT", "/padrao", { prazoDias: 15 });
    expect(await res.json()).toMatchObject({ padraoDias: 15 });
    expect((await send("PUT", "/padrao", { prazoDias: 0 })).status).toBe(422);
  });

  it("exceção por cliente: cria em caixa alta, recusa repetida, edita e remove", async () => {
    const res = await send("POST", "/clientes", { cliente: " acme ", prazoDias: 30 });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: number };
    expect(created).toMatchObject({ cliente: "ACME", prazoDias: 30 });
    expect((await send("POST", "/clientes", { cliente: "Acme", prazoDias: 5 })).status).toBe(409);

    const prazo = await prazoDoCliente();
    expect(prazo("acme")).toBe(30);
    expect(prazo("OUTRO")).toBe(10);

    expect(
      await (await send("PATCH", `/clientes/${created.id}`, { prazoDias: 45 })).json(),
    ).toMatchObject({
      prazoDias: 45,
    });
    expect((await send("DELETE", `/clientes/${created.id}`)).status).toBe(204);
    expect((await send("DELETE", `/clientes/${created.id}`)).status).toBe(404);
    expect((await prazoDoCliente())("ACME")).toBe(10);
  });

  it("sugere clientes das operações, os mais frequentes primeiro", async () => {
    const op = (cliente: string) => ({
      nm_agencia: "MATRIZ - SP",
      nr_ctrc: "1",
      nm_pessoa_pagador: cliente,
    });
    await prisma.operacao.createMany({
      data: [op("Acme Ltda"), op("ACME LTDA "), op("Acme Filial"), op("Outro")],
    });
    expect(await (await send("GET", "/sugestoes?search=acme")).json()).toEqual({
      data: ["ACME LTDA", "ACME FILIAL"],
    });
    expect(await (await send("GET", "/sugestoes?search=%25")).json()).toEqual({ data: [] });
  });
});
