import { createRouter } from "../../lib/router";
import {
  createImportacaoHandler,
  createRestauracaoHandler,
  listImportacoesHandler,
} from "./importacoes.handlers";
import {
  createImportacaoRoute,
  createRestauracaoRoute,
  listImportacoesRoute,
} from "./importacoes.routes";

const importacoes = createRouter();
importacoes.openapi(listImportacoesRoute, listImportacoesHandler);
importacoes.openapi(createImportacaoRoute, createImportacaoHandler);
importacoes.openapi(createRestauracaoRoute, createRestauracaoHandler);

export default importacoes;
