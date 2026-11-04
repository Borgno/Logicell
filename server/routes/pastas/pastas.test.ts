import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import {
  ADMIN_EMAIL,
  findUser,
  jsonRequest,
  lastAuditEvent,
  loginAs,
  setupApp,
  setUser,
  USER_EMAIL,
} from "../../test/helpers";

type PastaBody = {
  id: number;
  nome: string;
  cor: string | null;
  faturista: { id: string; fullName: string } | null;
};

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
});

const BASE = "/api/v1/pastas";
const get = (path: string, cookie = user) => app.request(path, { headers: { Cookie: cookie } });

async function create(body: Record<string, unknown>, cookie = user) {
  const res = await app.request(BASE, jsonRequest("POST", body, cookie));
  return { res, body: (await res.json()) as PastaBody };
}

describe("pastas", () => {
  it("qualquer usuário cria, lista em ordem de nome e edita", async () => {
    const { res, body } = await create({ nome: "  Zeta ", cor: "#10b981" });
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe(`${BASE}/${body.id}`);
    expect(body).toMatchObject({ nome: "Zeta", cor: "#10b981", faturista: null });
    await create({ nome: "Alfa" });

    const list = (await (await get(BASE)).json()) as { data: PastaBody[] };
    expect(list.data.map((pasta) => pasta.nome)).toEqual(["Alfa", "Zeta"]);
    const found = (await (await get(`${BASE}?search=ZET`)).json()) as { data: PastaBody[] };
    expect(found.data.map((pasta) => pasta.nome)).toEqual(["Zeta"]);
    const verdes = (await (await get(`${BASE}?cor=%2310B981`)).json()) as { data: PastaBody[] };
    expect(verdes.data.map((pasta) => pasta.nome)).toEqual(["Zeta"]);
    // Pasta sem cor conta como cinza, a cor que a tela mostra.
    const cinzas = (await (await get(`${BASE}?cor=%2364748b`)).json()) as { data: PastaBody[] };
    expect(cinzas.data.map((pasta) => pasta.nome)).toEqual(["Alfa"]);

    const patch = await app.request(
      `${BASE}/${body.id}`,
      jsonRequest("PATCH", { nome: "Ômega" }, user),
    );
    expect(await patch.json()).toMatchObject({ nome: "Ômega" });
    expect(await lastAuditEvent()).toMatchObject({
      action: "pasta.updated",
      targetType: "pasta",
      data: { nome: { from: "Zeta", to: "Ômega" } },
    });
    // A lista em cache acompanha a escrita.
    const after = (await (await get(BASE)).json()) as { data: PastaBody[] };
    expect(after.data.map((pasta) => pasta.nome)).toEqual(["Alfa", "Ômega"]);
    const accent = (await (await get(`${BASE}?search=omega`)).json()) as { data: PastaBody[] };
    expect(accent.data.map((pasta) => pasta.nome)).toEqual(["Ômega"]);
  });

  it("nome repetido dá 409 no campo, cor fora do formato dá 422", async () => {
    await create({ nome: "Alfa" });
    const { res, body } = await create({ nome: "Alfa" });
    expect(res.status).toBe(409);
    expect(body).toMatchObject({ errors: [{ field: "nome" }] });
    expect((await create({ nome: "Beta", cor: "verde" })).res.status).toBe(422);
  });

  it("usuário comum não vincula faturista; supervisor e admin vinculam", async () => {
    const { id } = await findUser(USER_EMAIL);
    expect((await create({ nome: "Alfa", faturistaId: id })).res.status).toBe(403);

    const admin = await loginAs(app, ADMIN_EMAIL);
    const { res, body } = await create({ nome: "Alfa", faturistaId: id }, admin);
    expect(res.status).toBe(201);
    expect(body.faturista).toEqual({ id, fullName: "Usuário Comum" });

    await setUser(USER_EMAIL, { role: "gestor" });
    const gestor = await loginAs(app, USER_EMAIL);
    const patch = await app.request(
      `${BASE}/${body.id}`,
      jsonRequest("PATCH", { faturistaId: null }, gestor),
    );
    expect(await patch.json()).toMatchObject({ faturista: null });
  });

  it("faturista precisa ser usuário ativo", async () => {
    const admin = await loginAs(app, ADMIN_EMAIL);
    const target = await setUser(USER_EMAIL, { active: false });
    const { res, body } = await create({ nome: "Alfa", faturistaId: target.id }, admin);
    expect(res.status).toBe(422);
    expect(body).toMatchObject({ errors: [{ field: "faturistaId" }] });
  });

  it("desativar o faturista tira ele da pasta, e a lista mostra na hora", async () => {
    const admin = await loginAs(app, ADMIN_EMAIL);
    const target = await findUser(USER_EMAIL);
    const { body } = await create({ nome: "Alfa", faturistaId: target.id }, admin);
    await get(BASE, admin);
    await app.request(`/api/v1/users/${target.id}`, jsonRequest("PATCH", { active: false }, admin));
    const list = (await (await get(BASE, admin)).json()) as { data: PastaBody[] };
    expect(list.data.find((pasta) => pasta.id === body.id)?.faturista).toBeNull();
  });

  it("excluir apaga a pasta, as regras e as operações dela", async () => {
    const { body } = await create({ nome: "Alfa" });
    await prisma.regraAutomacao.create({ data: { pastaId: body.id, cliente: "ACME" } });
    const res = await app.request(`${BASE}/${body.id}`, {
      method: "DELETE",
      headers: { Cookie: user },
    });
    expect(res.status).toBe(204);
    expect(await prisma.regraAutomacao.count()).toBe(0);
    expect((await get(`${BASE}/${body.id}`)).status).toBe(404);
    expect(await lastAuditEvent()).toMatchObject({
      action: "pasta.deleted",
      data: { nome: "Alfa", operacoesApagadas: 0 },
    });
  });

  it("faturistas: só supervisor e admin veem a lista de ativos", async () => {
    expect((await get("/api/v1/faturistas")).status).toBe(403);
    await setUser(USER_EMAIL, { active: false });
    const res = await get("/api/v1/faturistas", await loginAs(app, ADMIN_EMAIL));
    expect(await res.json()).toEqual({
      data: [{ id: (await findUser(ADMIN_EMAIL)).id, fullName: "Administrador" }],
    });
  });
});
