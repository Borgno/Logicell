import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import {
  ADMIN_EMAIL,
  findUser,
  jsonRequest,
  lastAuditEvent,
  loginAs,
  SEED_PASSWORD,
  setUser,
  setupApp,
  USER_EMAIL,
} from "../../test/helpers";

type UserBody = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
};
type ListBody = { data: UserBody[]; meta: { page: number; pageSize: number; total: number } };

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
});

const get = (path: string, cookie = admin) => app.request(path, { headers: { Cookie: cookie } });
const newUser = { email: "ana@local.test", fullName: "Ana", role: "user", password: "inicial-123" };

async function createAna() {
  const res = await app.request("/api/v1/users", jsonRequest("POST", newUser, admin));
  return (await res.json()) as UserBody;
}

describe("autorização", () => {
  it("usuário comum recebe 403 em Problem Details", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const res = await get("/api/v1/users", user);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("sem sessão recebe 401", async () => {
    expect((await app.request("/api/v1/users")).status).toBe(401);
  });
});

describe("GET /api/v1/users", () => {
  it("lista com meta de paginação, ordenada por nome", async () => {
    const res = await get("/api/v1/users");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ListBody;
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
    expect(body.data.map((u) => u.email)).toEqual([ADMIN_EMAIL, USER_EMAIL]);
  });

  it("filtra por busca, role e status na query", async () => {
    await createAna();
    const bySearch = (await (await get("/api/v1/users?search=ANA")).json()) as ListBody;
    expect(bySearch.data.map((u) => u.email)).toEqual(["ana@local.test"]);

    const byRole = (await (await get("/api/v1/users?role=admin")).json()) as ListBody;
    expect(byRole.data.map((u) => u.email)).toEqual([ADMIN_EMAIL]);

    await setUser(USER_EMAIL, { active: false });
    const inactive = (await (await get("/api/v1/users?active=false")).json()) as ListBody;
    expect(inactive.data.map((u) => u.email)).toEqual([USER_EMAIL]);
  });

  it("pagina e ordena de forma decrescente", async () => {
    await createAna();
    const body = (await (
      await get("/api/v1/users?sort=-fullName&page=2&pageSize=2")
    ).json()) as ListBody;
    // Decrescente por nome: Usuário Comum, Ana, Administrador. A página 2 (de 2) tem só o último.
    expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(body.data.map((u) => u.email)).toEqual([ADMIN_EMAIL]);
  });

  it("responde 422 para query inválida", async () => {
    expect((await get("/api/v1/users?pageSize=500")).status).toBe(422);
    expect((await get("/api/v1/users?sort=senha")).status).toBe(422);
    expect((await get("/api/v1/users?active=talvez")).status).toBe(422);
  });
});

describe("POST /api/v1/users", () => {
  it("cria com 201, Location, troca de senha obrigatória e audit", async () => {
    const res = await app.request("/api/v1/users", jsonRequest("POST", newUser, admin));
    expect(res.status).toBe(201);
    const body = (await res.json()) as UserBody;
    expect(res.headers.get("Location")).toBe(`/api/v1/users/${body.id}`);
    expect(body).toMatchObject({
      email: "ana@local.test",
      role: "user",
      active: true,
      mustChangePassword: true,
    });
    expect(await lastAuditEvent()).toMatchObject({ action: "user.created", targetId: body.id });
  });

  it("responde 409 EMAIL_TAKEN com o campo, mesmo com maiúsculas", async () => {
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { ...newUser, email: "USER@local.test" }, admin),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "EMAIL_TAKEN", errors: [{ field: "email" }] });
  });

  it("responde 422 com os campos inválidos", async () => {
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { email: "x", fullName: "", role: "root", password: "123" }, admin),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { field: string }[] };
    expect(body.errors.map((e) => e.field).sort()).toEqual([
      "email",
      "fullName",
      "password",
      "role",
    ]);
  });
});

describe("GET /api/v1/users/{id}", () => {
  it("responde 404 para id inexistente e 422 para id malformado", async () => {
    expect((await get("/api/v1/users/00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await get("/api/v1/users/abc")).status).toBe(422);
  });

  it("responde 405 com Allow para DELETE, que não existe de propósito", async () => {
    const ana = await createAna();
    const res = await app.request(`/api/v1/users/${ana.id}`, {
      method: "DELETE",
      headers: { Cookie: admin },
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, PATCH");
  });
});

describe("PATCH /api/v1/users/{id}", () => {
  it("troca a role e registra de/para no audit", async () => {
    const ana = await createAna();
    const res = await app.request(
      `/api/v1/users/${ana.id}`,
      jsonRequest("PATCH", { role: "admin" }, admin),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "admin" });
    expect(await lastAuditEvent()).toMatchObject({
      action: "user.roleChanged",
      data: { from: "user", to: "admin" },
    });
  });

  it("desativar derruba a sessão do usuário na hora", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const target = await findUser(USER_EMAIL);
    await app.request(`/api/v1/users/${target.id}`, jsonRequest("PATCH", { active: false }, admin));
    expect((await get("/api/v1/me", user)).status).toBe(401);
    expect(await lastAuditEvent()).toMatchObject({ action: "user.deactivated" });
    // Desativar não apaga: o usuário continua no banco, autor do que fez.
    expect(await findUser(USER_EMAIL)).toMatchObject({ active: false });
  });

  it("o admin não desativa nem rebaixa a si mesmo", async () => {
    const me = await findUser(ADMIN_EMAIL);
    for (const patch of [{ active: false }, { role: "user" }]) {
      const res = await app.request(`/api/v1/users/${me.id}`, jsonRequest("PATCH", patch, admin));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: "SELF_LOCKOUT" });
    }
  });

  it("responde 422 para corpo vazio", async () => {
    const ana = await createAna();
    const res = await app.request(`/api/v1/users/${ana.id}`, jsonRequest("PATCH", {}, admin));
    expect(res.status).toBe(422);
  });
});

describe("supervisor do atendente", () => {
  const patch = (id: string, body: unknown) =>
    app.request(`/api/v1/users/${id}`, jsonRequest("PATCH", body, admin));

  async function createGestor(email = "gestor@local.test") {
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { ...newUser, email, fullName: "Gestora", role: "gestor" }, admin),
    );
    return (await res.json()) as UserBody;
  }

  it("cria o atendente já com o supervisor, e a lista mostra o nome", async () => {
    const gestor = await createGestor();
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { ...newUser, supervisorId: gestor.id }, admin),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      supervisor: { id: gestor.id, fullName: "Gestora" },
    });
    const list = (await (await get("/api/v1/users?search=ana@")).json()) as {
      data: { supervisor: unknown }[];
    };
    expect(list.data[0].supervisor).toEqual({ id: gestor.id, fullName: "Gestora" });
  });

  it("vincula e desvincula, com o histórico no audit", async () => {
    const gestor = await createGestor();
    const target = await findUser(USER_EMAIL);
    expect((await patch(target.id, { supervisorId: gestor.id })).status).toBe(200);
    expect(await lastAuditEvent()).toMatchObject({
      action: "user.supervisorChanged",
      data: { from: null, to: "Gestora" },
    });
    const res = await patch(target.id, { supervisorId: null });
    expect(await res.json()).toMatchObject({ supervisor: null });
  });

  it("recusa supervisor que não é gestor ativo, ou que é a própria pessoa", async () => {
    const target = await findUser(USER_EMAIL);
    const adminUser = await findUser(ADMIN_EMAIL);
    const gestor = await createGestor();
    await setUser("gestor@local.test", { active: false });
    for (const supervisorId of [adminUser.id, gestor.id, target.id]) {
      const res = await patch(target.id, { supervisorId });
      expect(res.status).toBe(422);
      const body = (await res.json()) as { errors: { field: string }[] };
      expect(body.errors[0].field).toBe("supervisorId");
    }
  });

  it("só o cargo comum tem supervisor; mudar de cargo desfaz o vínculo", async () => {
    const gestor = await createGestor();
    const adminUser = await findUser(ADMIN_EMAIL);
    expect((await patch(adminUser.id, { supervisorId: gestor.id })).status).toBe(422);

    const target = await findUser(USER_EMAIL);
    await patch(target.id, { supervisorId: gestor.id });
    const res = await patch(target.id, { role: "gestor" });
    expect(await res.json()).toMatchObject({ role: "gestor", supervisor: null });
  });

  it("quem deixa de ser supervisor solta os atendentes, e a sessão deles vê na hora", async () => {
    const gestor = await createGestor();
    const target = await findUser(USER_EMAIL);
    await patch(target.id, { supervisorId: gestor.id });
    const user = await loginAs(app, USER_EMAIL);
    expect(await (await get("/api/v1/me", user)).json()).toMatchObject({
      supervisor: { fullName: "Gestora" },
    });

    await patch(gestor.id, { role: "user" });
    expect(await (await get("/api/v1/me", user)).json()).toMatchObject({ supervisor: null });
    expect(await lastAuditEvent()).toMatchObject({
      action: "user.supervisorChanged",
      targetId: target.id,
      data: { from: "Gestora", to: null },
    });
  });

  it("desativar o supervisor também solta os atendentes", async () => {
    const gestor = await createGestor();
    const target = await findUser(USER_EMAIL);
    await patch(target.id, { supervisorId: gestor.id });
    await patch(gestor.id, { active: false });
    expect((await findUser(USER_EMAIL)).supervisorId).toBeNull();
  });
});

describe("desativar", () => {
  it("as pastas em que a pessoa era faturista ficam sem responsável", async () => {
    const target = await findUser(USER_EMAIL);
    await prisma.pasta.create({ data: { nome: "Pasta A", faturistaId: target.id } });
    await app.request(`/api/v1/users/${target.id}`, jsonRequest("PATCH", { active: false }, admin));
    expect(await prisma.pasta.findUniqueOrThrow({ where: { nome: "Pasta A" } })).toMatchObject({
      faturistaId: null,
    });
    expect(await lastAuditEvent()).toMatchObject({
      action: "user.deactivated",
      data: { pastasSemFaturista: 1 },
    });
  });

  it("reativar não devolve a vida às sessões antigas", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const target = await findUser(USER_EMAIL);
    const toggle = (active: boolean) =>
      app.request(`/api/v1/users/${target.id}`, jsonRequest("PATCH", { active }, admin));
    await toggle(false);
    await toggle(true);
    expect((await get("/api/v1/me", user)).status).toBe(401);
    expect((await get("/api/v1/me", await loginAs(app, USER_EMAIL))).status).toBe(200);
  });
});

describe("POST /api/v1/users/{id}/passwordResets", () => {
  it("gera senha temporária, derruba a sessão do usuário e obriga a troca", async () => {
    const userSession = await loginAs(app, USER_EMAIL);
    const target = await findUser(USER_EMAIL);

    const res = await app.request(
      `/api/v1/users/${target.id}/passwordResets`,
      jsonRequest("POST", undefined, admin),
    );
    expect(res.status).toBe(201);
    const { temporaryPassword } = (await res.json()) as { temporaryPassword: string };
    expect(temporaryPassword).toHaveLength(12);

    expect((await get("/api/v1/me", userSession)).status).toBe(401);
    await expect(loginAs(app, USER_EMAIL, SEED_PASSWORD)).rejects.toThrow();

    const fresh = await loginAs(app, USER_EMAIL, temporaryPassword);
    expect(await (await get("/api/v1/me", fresh)).json()).toMatchObject({
      mustChangePassword: true,
    });
    expect(await prisma.auditEvent.count({ where: { action: "user.passwordReset" } })).toBe(1);
  });
});

describe("GET /api/v1/auditEvents", () => {
  it("lista o histórico do alvo, mais recente primeiro, com o nome de quem fez", async () => {
    const ana = await createAna();
    await app.request(`/api/v1/users/${ana.id}`, jsonRequest("PATCH", { role: "admin" }, admin));

    const res = await get(`/api/v1/auditEvents?targetType=user&targetId=${ana.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { action: string; actor: { fullName: string } }[] };
    expect(body.data.map((e) => e.action)).toEqual(["user.roleChanged", "user.created"]);
    expect(body.data[0].actor.fullName).toBe("Administrador");
  });

  it("usuário comum recebe 403", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await get("/api/v1/auditEvents", user)).status).toBe(403);
  });
});
