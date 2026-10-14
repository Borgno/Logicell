import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import {
  CreatePastaSchema,
  ListPastasQuerySchema,
  PastaListSchema,
  PastaSchema,
  UpdatePastaSchema,
} from "./pastas.schemas";

// Qualquer usuário lista, cria, edita e exclui pasta. O vínculo de faturista é barrado no service.

export const listPastasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Pastas"],
  summary: "Lista todas as pastas, em ordem de nome",
  middleware: [requireAuth()] as const,
  request: { query: ListPastasQuerySchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: PastaListSchema } } },
    ...problemResponses(401, 403, 422),
  },
});

export const createPastaRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Pastas"],
  summary: "Cria uma pasta",
  middleware: [requireAuth()] as const,
  request: {
    body: { required: true, content: { "application/json": { schema: CreatePastaSchema } } },
  },
  responses: {
    201: { description: "Criada", content: { "application/json": { schema: PastaSchema } } },
    ...problemResponses(400, 401, 403, 409, 422),
  },
});

export const getPastaRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Pastas"],
  summary: "Detalhe de uma pasta",
  middleware: [requireAuth()] as const,
  request: { params: IntIdParamSchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: PastaSchema } } },
    ...problemResponses(401, 403, 404, 422),
  },
});

export const updatePastaRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Pastas"],
  summary: "Edita nome, cor ou faturista de uma pasta",
  middleware: [requireAuth()] as const,
  request: {
    params: IntIdParamSchema,
    body: { required: true, content: { "application/json": { schema: UpdatePastaSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: PastaSchema } } },
    ...problemResponses(400, 401, 403, 404, 409, 422),
  },
});

export const deletePastaRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Pastas"],
  summary: "Exclui a pasta e as operações dela",
  middleware: [requireAuth()] as const,
  request: { params: IntIdParamSchema },
  responses: {
    204: { description: "Excluída" },
    ...problemResponses(401, 403, 404, 422),
  },
});
