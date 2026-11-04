import type { RouteHandler } from "@hono/zod-openapi";
import { getCubo, getOpcoes, getResumo } from "../../services/dashboard/dashboard.service";
import type { HonoEnv } from "../../types";
import type { getCuboRoute, getOpcoesRoute, getResumoRoute } from "./dashboard.routes";

export const getResumoHandler: RouteHandler<typeof getResumoRoute, HonoEnv> = async (c) => {
  return c.json(await getResumo(c.get("user"), c.req.valid("query")), 200);
};

export const getOpcoesHandler: RouteHandler<typeof getOpcoesRoute, HonoEnv> = async (c) => {
  return c.json(await getOpcoes(c.get("user")), 200);
};

export const getCuboHandler: RouteHandler<typeof getCuboRoute, HonoEnv> = async (c) => {
  const { faturistaId } = c.req.valid("param");
  const cubo = await getCubo(
    c.get("user"),
    faturistaId === "sem" ? null : faturistaId,
    c.req.valid("query"),
  );
  return c.json(cubo, 200);
};
