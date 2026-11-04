import type { RouteHandler } from "@hono/zod-openapi";
import {
  desfazerImportacao,
  importarPlanilha,
  listImportacoes,
} from "../../services/importacao/importacao.service";
import type { HonoEnv } from "../../types";
import type {
  createImportacaoRoute,
  createRestauracaoRoute,
  listImportacoesRoute,
} from "./importacoes.routes";

export const listImportacoesHandler: RouteHandler<typeof listImportacoesRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await listImportacoes(c.req.valid("query")), 200);
};

export const createImportacaoHandler: RouteHandler<typeof createImportacaoRoute, HonoEnv> = async (
  c,
) => {
  const { arquivo, modo } = c.req.valid("form");
  const user = c.get("user");
  const resultado = await importarPlanilha({
    buffer: Buffer.from(await arquivo.arrayBuffer()),
    nomeArquivo: arquivo.name,
    modo,
    ator: { id: user.id, fullName: user.fullName },
  });
  c.header("Location", `/api/v1/importacoes/${resultado.importacao.id}`);
  return c.json(resultado, 201);
};

// Sem Location: a restauração não tem endereço próprio para consultar depois.
export const createRestauracaoHandler: RouteHandler<
  typeof createRestauracaoRoute,
  HonoEnv
> = async (c) => {
  return c.json(await desfazerImportacao(c.get("user").id, c.req.valid("param").id), 201);
};
