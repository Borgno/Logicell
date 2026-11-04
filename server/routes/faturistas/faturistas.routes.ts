import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { FaturistaListSchema } from "./faturistas.schemas";

// Opções do select de faturista da pasta: usuários ativos. Só quem pode vincular vê.
export const listFaturistasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Pastas"],
  summary: "Usuários ativos que podem ser faturista de uma pasta",
  middleware: [requireAuth(), requireRole("admin", "gestor")] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: FaturistaListSchema } } },
    ...problemResponses(401, 403),
  },
});
