import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import {
  ADMIN_EMAIL,
  findUser,
  jsonRequest,
  SEED_PASSWORD,
  setUser,
  setupApp,
} from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
beforeEach(async () => {
  app = await setupApp();
});

const login = (email: string, password: string) =>
  app.request("/api/v1/sessions", jsonRequest("POST", { email, password }));

describe("POST /api/v1/sessions", () => {
  it("cria a sessão: 201, cookie HttpOnly, Location e usuário sem hash", async () => {
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe("/api/v1/sessions/current");

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ email: ADMIN_EMAIL, role: "admin" });
    expect(body).not.toHaveProperty("passwordHash");
    expect((await findUser(ADMIN_EMAIL)).lastLoginAt).toBeInstanceOf(Date);
  });

  it("aceita e-mail com maiúsculas e espaços", async () => {
    const res = await login("  Admin@Local.Test ", SEED_PASSWORD);
    expect(res.status).toBe(201);
  });

  it("aceita só o nome de usuário, sem o domínio", async () => {
    const res = await login("Admin", SEED_PASSWORD);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: ADMIN_EMAIL });
  });

  it("recusa o nome quando ele existe em dois domínios", async () => {
    await prisma.user.create({
      data: { email: "admin@outro.test", name: "Outro", passwordHash: "x" },
    });
    expect((await login("admin", SEED_PASSWORD)).status).toBe(401);
    expect((await login(ADMIN_EMAIL, SEED_PASSWORD)).status).toBe(201);
  });

  it("não trata _ no nome como curinga", async () => {
    await setUser(ADMIN_EMAIL, { email: "ana.paula@local.test" });
    expect((await login("ana_paula", SEED_PASSWORD)).status).toBe(401);
    expect((await login("ana.paula", SEED_PASSWORD)).status).toBe(201);
  });

  it("responde igual para senha errada e para e-mail inexistente", async () => {
    const wrongPassword = await login(ADMIN_EMAIL, "senha-errada");
    const unknownEmail = await login("ninguem@local.test", "senha-errada");
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("responde 403 para usuário desativado que acerta a senha", async () => {
    await setUser(ADMIN_EMAIL, { active: false });
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "USER_INACTIVE" });
  });

  it("bloqueia com 429 e Retry-After depois de 5 falhas no mesmo e-mail", async () => {
    for (let i = 0; i < 5; i++) await login(ADMIN_EMAIL, "senha-errada");
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res.json()).toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  });

  it("responde 422 com os campos quando o corpo é inválido", async () => {
    const res = await login("  ", "");
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { field: string }[] };
    expect(body.errors.map((e) => e.field).sort()).toEqual(["email", "password"]);
  });

  it("não guarda senha em texto no banco", async () => {
    for (const user of await prisma.user.findMany()) {
      expect(user.passwordHash).not.toContain(SEED_PASSWORD);
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    }
  });
});

describe("DELETE /api/v1/sessions/current", () => {
  it("encerra a sessão com 204 e expira o cookie", async () => {
    const res = await app.request("/api/v1/sessions/current", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toMatch(/session=;.*Max-Age=0/);
  });
});
