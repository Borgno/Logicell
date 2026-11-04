import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import {
  CreatePrazoClienteSchema,
  PrazoClienteSchema,
  PrazosSchema,
  SugestoesQuerySchema,
  SugestoesSchema,
  UpdatePadraoSchema,
  UpdatePrazoClienteSchema,
} from "./prazos.schemas";

// Prazos de emissão são de supervisor e admin.
const canManage = [requireAuth(), requireRole("admin", "gestor")];
const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

export const getPrazosRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Prazos"],
  summary: "Prazo padrão e exceções por cliente",
  middleware: canManage,
  responses: {
    200: { description: "OK", ...json(PrazosSchema) },
    ...problemResponses(401, 403),
  },
});

export const updatePadraoRoute = createRoute({
  method: "put",
  path: "/padrao",
  tags: ["Prazos"],
  summary: "Troca o prazo padrão",
  middleware: canManage,
  request: { body: { required: true, ...json(UpdatePadraoSchema) } },
  responses: {
    200: { description: "OK", ...json(PrazosSchema) },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const listSugestoesRoute = createRoute({
  method: "get",
  path: "/sugestoes",
  tags: ["Prazos"],
  summary: "Clientes das operações que contêm o texto, os mais frequentes primeiro",
  middleware: canManage,
  request: { query: SugestoesQuerySchema },
  responses: {
    200: { description: "OK", ...json(SugestoesSchema) },
    ...problemResponses(401, 403, 422),
  },
});

export const createPrazoClienteRoute = createRoute({
  method: "post",
  path: "/clientes",
  tags: ["Prazos"],
  summary: "Cria a exceção de prazo de um cliente",
  middleware: canManage,
  request: { body: { required: true, ...json(CreatePrazoClienteSchema) } },
  responses: {
    201: { description: "Criado", ...json(PrazoClienteSchema) },
    ...problemResponses(400, 401, 403, 409, 422),
  },
});

export const updatePrazoClienteRoute = createRoute({
  method: "patch",
  path: "/clientes/{id}",
  tags: ["Prazos"],
  summary: "Troca o prazo de um cliente",
  middleware: canManage,
  request: {
    params: IntIdParamSchema,
    body: { required: true, ...json(UpdatePrazoClienteSchema) },
  },
  responses: {
    200: { description: "OK", ...json(PrazoClienteSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const deletePrazoClienteRoute = createRoute({
  method: "delete",
  path: "/clientes/{id}",
  tags: ["Prazos"],
  summary: "Remove a exceção: o cliente volta ao prazo padrão",
  middleware: canManage,
  request: { params: IntIdParamSchema },
  responses: {
    204: { description: "Removido" },
    ...problemResponses(401, 403, 404, 422),
  },
});
