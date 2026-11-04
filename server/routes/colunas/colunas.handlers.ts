import type { RouteHandler } from "@hono/zod-openapi";
import { getOrdemColunas, setOrdemColunas } from "../../services/colunas/colunas.service";
import type { HonoEnv } from "../../types";
import type { getColunasRoute, updateColunasRoute } from "./colunas.routes";

export const getColunasHandler: RouteHandler<typeof getColunasRoute, HonoEnv> = async (c) => {
  return c.json(await getOrdemColunas(), 200);
};

export const updateColunasHandler: RouteHandler<typeof updateColunasRoute, HonoEnv> = async (c) => {
  return c.json(await setOrdemColunas(c.req.valid("json").ordem), 200);
};
