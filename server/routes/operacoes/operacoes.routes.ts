import { createRoute, z } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import {
  AfetadasSchema,
  DeleteOperacoesSchema,
  ListOperacoesQuerySchema,
  OperacaoListSchema,
  OperacaoSchema,
  PlanilhaQuerySchema,
  UpdateOperacaoSchema,
  UpdateOperacoesSchema,
} from "./operacoes.schemas";

// Qualquer usuário trabalha a Caixa de Entrada e as pastas.
const auth = [requireAuth()];
const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

export const listOperacoesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Operações"],
  summary: "Operações da Caixa de Entrada ou de uma pasta, filtradas, ordenadas e paginadas",
  middleware: auth,
  request: { query: ListOperacoesQuerySchema },
  responses: {
    200: { description: "OK", ...json(OperacaoListSchema) },
    ...problemResponses(401, 403, 404, 422),
  },
});

export const updateOperacoesRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Operações"],
  summary: "Move para uma pasta, ou troca status, observação ou ID de solicitação, em lote",
  middleware: auth,
  request: { body: { required: true, ...json(UpdateOperacoesSchema) } },
  responses: {
    200: { description: "OK", ...json(AfetadasSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const deleteOperacoesRoute = createRoute({
  method: "delete",
  path: "/",
  tags: ["Operações"],
  summary: "Exclui operações em lote",
  middleware: auth,
  request: { body: { required: true, ...json(DeleteOperacoesSchema) } },
  responses: {
    200: { description: "OK", ...json(AfetadasSchema) },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const updateOperacaoRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Operações"],
  summary: "Edita uma célula da grid",
  middleware: auth,
  request: { params: IntIdParamSchema, body: { required: true, ...json(UpdateOperacaoSchema) } },
  responses: {
    200: { description: "OK", ...json(OperacaoSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const getPlanilhaRoute = createRoute({
  method: "get",
  path: "/planilha",
  tags: ["Operações"],
  summary: "A lista filtrada em XLSX, com todas as linhas e não só as carregadas na tela",
  middleware: auth,
  request: { query: PlanilhaQuerySchema },
  responses: {
    200: {
      description: "Arquivo XLSX",
      content: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: z.string().openapi({ format: "binary" }),
        },
      },
    },
    ...problemResponses(401, 403, 404, 422),
  },
});
