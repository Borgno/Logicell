import { createRouter } from "../../lib/router";
import { getOperacaoStatsHandler } from "./operacaoStats.handlers";
import { getOperacaoStatsRoute } from "./operacaoStats.routes";

const operacaoStats = createRouter();
operacaoStats.openapi(getOperacaoStatsRoute, getOperacaoStatsHandler);

export default operacaoStats;
