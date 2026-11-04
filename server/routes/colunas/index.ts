import { createRouter } from "../../lib/router";
import { getColunasHandler, updateColunasHandler } from "./colunas.handlers";
import { getColunasRoute, updateColunasRoute } from "./colunas.routes";

const colunas = createRouter();
colunas.openapi(getColunasRoute, getColunasHandler);
colunas.openapi(updateColunasRoute, updateColunasHandler);

export default colunas;
