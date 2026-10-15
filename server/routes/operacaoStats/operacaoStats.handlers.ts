import type { RouteHandler } from "@hono/zod-openapi";
import { getOperacaoStats } from "../../services/operacoes/operacoes.service";
import type { HonoEnv } from "../../types";
import type { getOperacaoStatsRoute } from "./operacaoStats.routes";

export const getOperacaoStatsHandler: RouteHandler<typeof getOperacaoStatsRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await getOperacaoStats(), 200);
};
