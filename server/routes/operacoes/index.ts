import { createRouter } from "../../lib/router";
import {
  deleteOperacoesHandler,
  getPlanilhaHandler,
  listOperacoesHandler,
  updateOperacaoHandler,
  updateOperacoesHandler,
} from "./operacoes.handlers";
import {
  deleteOperacoesRoute,
  getPlanilhaRoute,
  listOperacoesRoute,
  updateOperacaoRoute,
  updateOperacoesRoute,
} from "./operacoes.routes";

const operacoes = createRouter();
operacoes.openapi(listOperacoesRoute, listOperacoesHandler);
operacoes.openapi(getPlanilhaRoute, getPlanilhaHandler);
operacoes.openapi(updateOperacoesRoute, updateOperacoesHandler);
operacoes.openapi(deleteOperacoesRoute, deleteOperacoesHandler);
operacoes.openapi(updateOperacaoRoute, updateOperacaoHandler);

export default operacoes;
