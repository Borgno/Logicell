import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { OperacaoStatsSchema } from "./operacaoStats.schemas";

export const getOperacaoStatsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Operações"],
  summary: "Total e emissões antigas da Caixa de Entrada e de cada pasta",
  middleware: [requireAuth()],
  responses: {
    200: { description: "OK", content: { "application/json": { schema: OperacaoStatsSchema } } },
    ...problemResponses(401, 403),
  },
});
