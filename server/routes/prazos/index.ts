import { createRouter } from "../../lib/router";
import {
  createPrazoClienteHandler,
  deletePrazoClienteHandler,
  getPrazosHandler,
  listSugestoesHandler,
  updatePadraoHandler,
  updatePrazoClienteHandler,
} from "./prazos.handlers";
import {
  createPrazoClienteRoute,
  deletePrazoClienteRoute,
  getPrazosRoute,
  listSugestoesRoute,
  updatePadraoRoute,
  updatePrazoClienteRoute,
} from "./prazos.routes";

const prazos = createRouter();
prazos.openapi(getPrazosRoute, getPrazosHandler);
prazos.openapi(updatePadraoRoute, updatePadraoHandler);
prazos.openapi(listSugestoesRoute, listSugestoesHandler);
prazos.openapi(createPrazoClienteRoute, createPrazoClienteHandler);
prazos.openapi(updatePrazoClienteRoute, updatePrazoClienteHandler);
prazos.openapi(deletePrazoClienteRoute, deletePrazoClienteHandler);

export default prazos;
