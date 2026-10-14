import type { RouteHandler } from "@hono/zod-openapi";
import { createRegra, deleteRegra, listRegras } from "../../services/regras/regras.service";
import type { HonoEnv } from "../../types";
import type { createRegraRoute, deleteRegraRoute, listRegrasRoute } from "./regras.routes";

export const listRegrasHandler: RouteHandler<typeof listRegrasRoute, HonoEnv> = async (c) => {
  return c.json(await listRegras(), 200);
};

// Sem Location: a regra não tem GET próprio, é lida na lista.
export const createRegraHandler: RouteHandler<typeof createRegraRoute, HonoEnv> = async (c) => {
  return c.json(await createRegra(c.get("user").id, c.req.valid("json")), 201);
};

export const deleteRegraHandler: RouteHandler<typeof deleteRegraRoute, HonoEnv> = async (c) => {
  await deleteRegra(c.get("user").id, c.req.valid("param").id);
  return c.body(null, 204);
};
