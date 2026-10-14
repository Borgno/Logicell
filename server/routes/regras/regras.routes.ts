import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import { CreateRegraSchema, PastaComRegrasListSchema, RegraSchema } from "./regras.schemas";

// Automações são de supervisor e admin.
const canManage = [requireAuth(), requireRole("admin", "gestor")];

export const listRegrasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Automações"],
  summary: "Todas as pastas com as regras de automação e a marca de conflito",
  middleware: canManage,
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: PastaComRegrasListSchema } },
    },
    ...problemResponses(401, 403),
  },
});

export const createRegraRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Automações"],
  summary: "Adiciona uma regra (agência, cliente ou produto) a uma pasta",
  middleware: canManage,
  request: {
    body: { required: true, content: { "application/json": { schema: CreateRegraSchema } } },
  },
  responses: {
    201: { description: "Criada", content: { "application/json": { schema: RegraSchema } } },
    ...problemResponses(400, 401, 403, 404, 409, 422),
  },
});

export const deleteRegraRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Automações"],
  summary: "Remove uma regra",
  middleware: canManage,
  request: { params: IntIdParamSchema },
  responses: {
    204: { description: "Removida" },
    ...problemResponses(401, 403, 404, 422),
  },
});
