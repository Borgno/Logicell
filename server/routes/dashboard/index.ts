import { createRouter } from "../../lib/router";
import { getCuboHandler, getOpcoesHandler, getResumoHandler } from "./dashboard.handlers";
import { getCuboRoute, getOpcoesRoute, getResumoRoute } from "./dashboard.routes";

const dashboard = createRouter();
dashboard.openapi(getResumoRoute, getResumoHandler);
dashboard.openapi(getOpcoesRoute, getOpcoesHandler);
dashboard.openapi(getCuboRoute, getCuboHandler);

export default dashboard;
