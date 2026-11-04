import { createRoute } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { ApiProblem, problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { IntIdParamSchema } from "../../schemas/cadastro";
import {
  CreateImportacaoSchema,
  ImportacaoListSchema,
  ListImportacoesQuerySchema,
  ResultadoImportacaoSchema,
  RestauracaoSchema,
  TAMANHO_MAXIMO,
} from "./importacoes.schemas";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

// O limite vale antes de o corpo ser lido: um arquivo enorme não chega a ocupar a memória.
const limiteDoArquivo = bodyLimit({
  maxSize: TAMANHO_MAXIMO + 1024 * 1024,
  onError: () => {
    throw new ApiProblem(413, "PAYLOAD_TOO_LARGE", "A planilha passa de 25 MB.");
  },
});

export const listImportacoesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Importações"],
  summary: "Importações, das mais recentes para as mais antigas",
  middleware: [requireAuth()],
  request: { query: ListImportacoesQuerySchema },
  responses: {
    200: { description: "OK", ...json(ImportacaoListSchema) },
    ...problemResponses(401, 403, 422),
  },
});

// Qualquer usuário importa: é o trabalho do dia a dia da equipe de faturamento.
export const createImportacaoRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Importações"],
  summary: "Importa a planilha do ERP, com roteamento pelas regras de automação",
  middleware: [requireAuth(), limiteDoArquivo],
  request: {
    body: {
      required: true,
      content: { "multipart/form-data": { schema: CreateImportacaoSchema } },
    },
  },
  responses: {
    201: { description: "Importada", ...json(ResultadoImportacaoSchema) },
    ...problemResponses(400, 401, 403, 413, 422),
  },
});

// Desfazer volta o sistema inteiro: só supervisor e admin.
export const createRestauracaoRoute = createRoute({
  method: "post",
  path: "/{id}/restauracoes",
  tags: ["Importações"],
  summary: "Desfaz as importações seguintes, restaurando a foto guardada desta",
  middleware: [requireAuth(), requireRole("admin", "gestor")],
  request: { params: IntIdParamSchema },
  responses: {
    201: { description: "Restaurada", ...json(RestauracaoSchema) },
    ...problemResponses(401, 403, 404, 409, 422),
  },
});
