import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { OrdemColunasSchema, UpdateOrdemColunasSchema } from "./colunas.schemas";

// A ordem é global: quem arrasta uma coluna muda a grid de todo mundo.

export const getColunasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Operações"],
  summary: "Ordem das colunas da grid de operações",
  middleware: [requireAuth()] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: OrdemColunasSchema } } },
    ...problemResponses(401, 403),
  },
});

export const updateColunasRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Operações"],
  summary: "Grava a ordem das colunas",
  middleware: [requireAuth()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateOrdemColunasSchema } },
    },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: OrdemColunasSchema } } },
    ...problemResponses(400, 401, 403, 422),
  },
});
