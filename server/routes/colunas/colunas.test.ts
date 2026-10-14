import { beforeEach, describe, expect, it } from "vitest";
import { jsonRequest, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
});

describe("ordem das colunas", () => {
  it("null antes de salvar; qualquer usuário grava a ordem global", async () => {
    const get = () => app.request("/api/v1/colunas", { headers: { Cookie: user } });
    expect(await (await get()).json()).toEqual({ ordem: null });
    const res = await app.request(
      "/api/v1/colunas",
      jsonRequest("PUT", { ordem: ["nr_ctrc", "vl_total"] }, user),
    );
    expect(res.status).toBe(200);
    expect(await (await get()).json()).toEqual({ ordem: ["nr_ctrc", "vl_total"] });
    expect(
      (await app.request("/api/v1/colunas", jsonRequest("PUT", { ordem: [] }, user))).status,
    ).toBe(422);
  });
});
