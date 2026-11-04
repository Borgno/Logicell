import { createRouter } from "../../lib/router";
import { listFaturistasHandler } from "./faturistas.handlers";
import { listFaturistasRoute } from "./faturistas.routes";

const faturistas = createRouter();
faturistas.openapi(listFaturistasRoute, listFaturistasHandler);

export default faturistas;
