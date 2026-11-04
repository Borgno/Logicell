import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import type { Prisma } from "../../db/generated/client";
import { ADMIN_EMAIL, findUser, loginAs, setupApp, setUser, USER_EMAIL } from "../../test/helpers";

type Resumo = {
  total: { valor: number; quantidade: number };
  faturistas: {
    faturistaId: string | null;
    nome: string;
    supervisor: string | null;
    valor: number;
    quantidade: number;
  }[];
};

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;
let userId: string;
let alfa: number;
let beta: number;

// Ontem, à meia-noite UTC: dentro do prazo padrão de 10 dias.
const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const op = (data: Partial<Prisma.OperacaoCreateManyInput>): Prisma.OperacaoCreateManyInput => ({
  nm_agencia: "MATRIZ - SP",
  nr_ctrc: "1",
  ...data,
});

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
  const gestor = await prisma.user.create({
    data: { email: "gestor@local.test", name: "Gestora", role: "gestor", passwordHash: "x" },
  });
  userId = (await setUser(USER_EMAIL, { supervisor: { connect: { id: gestor.id } } })).id;
  alfa = (await prisma.pasta.create({ data: { nome: "Alfa", faturistaId: userId } })).id;
  beta = (await prisma.pasta.create({ data: { nome: "Beta" } })).id;
  await prisma.operacao.createMany({
    data: [
      op({
        pastaId: alfa,
        vl_total: 100,
        status: "OK",
        nm_pessoa_pagador: "ACME",
        dt_emissao_: new Date(ontem),
      }),
      op({
        pastaId: alfa,
        vl_total: 50,
        status: null,
        nm_pessoa_pagador: "ACME",
        dt_emissao_: new Date("2020-01-01"),
      }),
      op({ pastaId: beta, vl_total: 30, status: "OK", nm_pessoa_pagador: "BETA" }),
      op({ pastaId: null, vl_total: 20, status: "OK", nm_pessoa_pagador: "BETA" }),
    ],
  });
});

const get = async <T>(path: string, cookie = admin) => {
  const res = await app.request(`/api/v1/dashboard${path}`, { headers: { Cookie: cookie } });
  return { res, body: (await res.json()) as T };
};

describe("GET /dashboard", () => {
  it("soma por faturista da pasta, com o supervisor; sem faturista junta Caixa de Entrada e pasta sem dono", async () => {
    const { body } = await get<Resumo>("");
    expect(body.total).toEqual({ valor: 200, quantidade: 4 });
    expect(body.faturistas).toEqual([
      {
        faturistaId: userId,
        nome: "Usuário Comum",
        supervisor: "Gestora",
        valor: 150,
        quantidade: 2,
      },
      { faturistaId: null, nome: "Sem faturista", supervisor: null, valor: 50, quantidade: 2 },
    ]);
  });

  it("filtra por status, vazio, cliente, período, pasta e emissões antigas", async () => {
    const total = async (query: string) => (await get<Resumo>(`?${query}`)).body.total;
    expect(await total("status=OK")).toEqual({ valor: 150, quantidade: 3 });
    expect(await total("status=__vazio__")).toEqual({ valor: 50, quantidade: 1 });
    expect(await total("cliente=BETA")).toEqual({ valor: 50, quantidade: 2 });
    expect(await total(`de=${ontem}&ate=${ontem}`)).toEqual({ valor: 100, quantidade: 1 });
    expect(await total("pasta=inbox")).toEqual({ valor: 20, quantidade: 1 });
    expect(await total("antigas=true")).toEqual({ valor: 50, quantidade: 1 });
    expect(await total("faturista=sem")).toEqual({ valor: 50, quantidade: 2 });
    expect((await get("?de=2026-02-30")).res.status).toBe(422);
  });

  it("usuário comum só vê as pastas dele, mesmo pedindo outro faturista", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const { body } = await get<Resumo>("?faturista=sem", user);
    expect(body.faturistas.map((item) => item.faturistaId)).toEqual([userId]);
    expect(body.total.valor).toBe(150);
  });
});

describe("GET /dashboard/opcoes", () => {
  it("traz os valores distintos, e o usuário comum só as pastas dele", async () => {
    const { body } = await get<Record<string, unknown>>("/opcoes");
    expect(body).toMatchObject({
      faturistas: [{ id: userId, nome: "Usuário Comum" }],
      clientes: ["ACME", "BETA"],
      status: ["OK"],
      agencias: ["MATRIZ - SP"],
    });
    const user = await get<{ pastas: { nome: string }[] }>(
      "/opcoes",
      await loginAs(app, USER_EMAIL),
    );
    expect(user.body.pastas.map((pasta) => pasta.nome)).toEqual(["Alfa"]);
  });

  it("vê a pasta nova sem esperar o cache", async () => {
    await get("/opcoes");
    const { id } = await findUser(USER_EMAIL);
    await app.request("/api/v1/pastas", {
      method: "POST",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Gama", faturistaId: id }),
    });
    const { body } = await get<{ pastas: { nome: string }[] }>("/opcoes");
    expect(body.pastas.map((pasta) => pasta.nome)).toContain("Gama");
  });
});

describe("GET /dashboard/faturistas/{id}/cubo", () => {
  it("agrega o faturista por dimensão e pasta, com as emissões antigas", async () => {
    const { body } = await get<{ linhas: Record<string, unknown>[]; pastas: { nome: string }[] }>(
      `/faturistas/${userId}/cubo`,
    );
    expect(body.pastas.map((pasta) => pasta.nome)).toEqual(["Alfa"]);
    const linhas = body.linhas.sort((a, b) => Number(b.valor) - Number(a.valor));
    expect(linhas).toMatchObject([
      {
        status: "OK",
        cliente: "ACME",
        pastaId: alfa,
        valor: 100,
        quantidade: 1,
        antigas: 0,
        primeira: ontem,
      },
      {
        status: null,
        cliente: "ACME",
        pastaId: alfa,
        valor: 50,
        quantidade: 1,
        antigas: 1,
        valorAntigas: 50,
      },
    ]);
  });

  it("sem faturista e o recorte do usuário comum", async () => {
    const sem = await get<{ linhas: unknown[] }>("/faturistas/sem/cubo");
    expect(sem.body.linhas).toHaveLength(2);
    const user = await loginAs(app, USER_EMAIL);
    expect((await get("/faturistas/sem/cubo", user)).res.status).toBe(403);
    expect((await get(`/faturistas/${userId}/cubo`, user)).res.status).toBe(200);
  });
});
