import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import {
  DashboardCuboSchema,
  DashboardFiltrosSchema,
  DashboardOpcoesSchema,
  DashboardResumoSchema,
  FaturistaParamSchema,
} from "./dashboard.schemas";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

// Todos os cargos veem o dashboard; o usuário comum, só o recorte das pastas dele (no service).

export const getResumoRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Dashboard"],
  summary: "Soma das operações por faturista, com os filtros",
  middleware: [requireAuth()],
  request: { query: DashboardFiltrosSchema },
  responses: {
    200: { description: "OK", ...json(DashboardResumoSchema) },
    ...problemResponses(401, 403, 422),
  },
});

export const getOpcoesRoute = createRoute({
  method: "get",
  path: "/opcoes",
  tags: ["Dashboard"],
  summary: "Valores dos filtros: faturistas, pastas, clientes, status, tipos e agências",
  middleware: [requireAuth()],
  responses: {
    200: { description: "OK", ...json(DashboardOpcoesSchema) },
    ...problemResponses(401, 403),
  },
});

export const getCuboRoute = createRoute({
  method: "get",
  path: "/faturistas/{faturistaId}/cubo",
  tags: ["Dashboard"],
  summary:
    "Operações de um faturista agregadas por status, tipo, agência, tipo de CTe, cliente e pasta",
  middleware: [requireAuth()],
  request: { params: FaturistaParamSchema, query: DashboardFiltrosSchema },
  responses: {
    200: { description: "OK", ...json(DashboardCuboSchema) },
    ...problemResponses(401, 403, 422),
  },
});
