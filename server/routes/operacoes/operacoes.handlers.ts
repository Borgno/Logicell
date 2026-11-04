import type { RouteHandler } from "@hono/zod-openapi";
import {
  deleteOperacoes,
  listOperacoes,
  rowsParaPlanilha,
  updateOperacao,
  updateOperacoes,
  type Selecao,
} from "../../services/operacoes/operacoes.service";
import type { Escopo } from "../../services/operacoes/filtros";
import { montarPlanilha } from "../../services/operacoes/planilha";
import type { HonoEnv } from "../../types";
import type {
  deleteOperacoesRoute,
  getPlanilhaRoute,
  listOperacoesRoute,
  updateOperacaoRoute,
  updateOperacoesRoute,
} from "./operacoes.routes";

type SelecaoBody =
  | { ids: number[] }
  | { todas: { pasta: Escopo; filtro: string[]; search?: string; excluidos: number[] } };

function selecao(body: SelecaoBody): Selecao {
  if ("ids" in body) return { ids: body.ids };
  const { pasta, ...resto } = body.todas;
  return { escopo: pasta, ...resto };
}

export const listOperacoesHandler: RouteHandler<typeof listOperacoesRoute, HonoEnv> = async (c) => {
  const { pasta, ...query } = c.req.valid("query");
  return c.json(await listOperacoes({ escopo: pasta, ...query }), 200);
};

export const updateOperacoesHandler: RouteHandler<typeof updateOperacoesRoute, HonoEnv> = async (
  c,
) => {
  const { selecao: body, ...alteracao } = c.req.valid("json");
  return c.json(await updateOperacoes(selecao(body), alteracao), 200);
};

export const deleteOperacoesHandler: RouteHandler<typeof deleteOperacoesRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await deleteOperacoes(selecao(c.req.valid("json").selecao)), 200);
};

export const updateOperacaoHandler: RouteHandler<typeof updateOperacaoRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await updateOperacao(c.req.valid("param").id, c.req.valid("json")), 200);
};

export const getPlanilhaHandler: RouteHandler<typeof getPlanilhaRoute, HonoEnv> = async (c) => {
  const { pasta, ordem, ...query } = c.req.valid("query");
  const rows = await rowsParaPlanilha({ escopo: pasta, ...query });
  const buffer = await montarPlanilha(rows, ordem);
  const nome = pasta === "inbox" ? "caixa-de-entrada" : `pasta-${pasta}`;
  return c.body(new Uint8Array(buffer), 200, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="operacoes-${nome}.xlsx"`,
  });
};
