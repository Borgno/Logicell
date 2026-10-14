import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiProblem } from "../lib/problem";
import { ADMIN_EMAIL, loginAs, setUser, setupApp, USER_EMAIL } from "../test/helpers";
import type { HonoEnv } from "../types";
import { requireAuth, requireRole } from "./auth";

let app: Awaited<ReturnType<typeof setupApp>>;
beforeEach(async () => {
  app = await setupApp();
});

// Rota de teste liberada para admin e gestor, como as telas de automações e prazos do E4.
const probe = new Hono<HonoEnv>()
  .get("/probe", requireAuth(), requireRole("admin", "gestor"), (c) => c.text(c.get("user").role))
  .onError((error, c) =>
    error instanceof ApiProblem ? c.text(error.code, error.status) : c.text("erro", 500),
  );

const call = (cookie: string) => probe.request("/probe", { headers: { Cookie: cookie } });

describe("requireRole com mais de um cargo", () => {
  it("libera qualquer um dos cargos e barra o resto", async () => {
    expect((await call(await loginAs(app, ADMIN_EMAIL))).status).toBe(200);
    expect((await call(await loginAs(app, USER_EMAIL))).status).toBe(403);

    await setUser(USER_EMAIL, { role: "gestor" });
    const res = await call(await loginAs(app, USER_EMAIL));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("gestor");
  });
});
