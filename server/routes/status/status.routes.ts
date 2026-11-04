import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import {
  CreateStatusSchema,
  ReorderStatusSchema,
  StatusItemSchema,
  StatusListSchema,
  UpdateStatusSchema,
} from "./status.schemas";

// Todo usuário lê a lista (o select da grid); só supervisor e admin mudam.
const canManage = [requireAuth(), requireRole("admin", "gestor")];
const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

export const listStatusRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Status"],
  summary: "Status das operações, inclusive inativos, na ordem cadastrada",
  middleware: [requireAuth()],
  responses: {
    200: { description: "OK", ...json(StatusListSchema) },
    ...problemResponses(401, 403),
  },
});

export const createStatusRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Status"],
  summary: "Cria um status no fim da lista",
  middleware: canManage,
  request: { body: { required: true, ...json(CreateStatusSchema) } },
  responses: {
    201: { description: "Criado", ...json(StatusItemSchema) },
    ...problemResponses(400, 401, 403, 409, 422),
  },
});

export const reorderStatusRoute = createRoute({
  method: "put",
  path: "/ordem",
  tags: ["Status"],
  summary: "Grava a ordem da lista",
  middleware: canManage,
  request: { body: { required: true, ...json(ReorderStatusSchema) } },
  responses: {
    200: { description: "OK", ...json(StatusListSchema) },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const updateStatusRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Status"],
  summary: "Renomeia, ativa ou desativa um status",
  middleware: canManage,
  request: { params: IntIdParamSchema, body: { required: true, ...json(UpdateStatusSchema) } },
  responses: {
    200: { description: "OK", ...json(StatusItemSchema) },
    ...problemResponses(400, 401, 403, 404, 409, 422),
  },
});

export const deleteStatusRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Status"],
  summary: "Exclui um status que nenhuma operação usa",
  middleware: canManage,
  request: { params: IntIdParamSchema },
  responses: {
    204: { description: "Excluído" },
    ...problemResponses(401, 403, 404, 409, 422),
  },
});
