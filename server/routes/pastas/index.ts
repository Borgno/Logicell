import { createRouter } from "../../lib/router";
import {
  createPastaHandler,
  deletePastaHandler,
  getPastaHandler,
  listPastasHandler,
  updatePastaHandler,
} from "./pastas.handlers";
import {
  createPastaRoute,
  deletePastaRoute,
  getPastaRoute,
  listPastasRoute,
  updatePastaRoute,
} from "./pastas.routes";

const pastas = createRouter();
pastas.openapi(listPastasRoute, listPastasHandler);
pastas.openapi(createPastaRoute, createPastaHandler);
pastas.openapi(getPastaRoute, getPastaHandler);
pastas.openapi(updatePastaRoute, updatePastaHandler);
pastas.openapi(deletePastaRoute, deletePastaHandler);

export default pastas;
