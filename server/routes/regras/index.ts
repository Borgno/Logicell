import { createRouter } from "../../lib/router";
import { createRegraHandler, deleteRegraHandler, listRegrasHandler } from "./regras.handlers";
import { createRegraRoute, deleteRegraRoute, listRegrasRoute } from "./regras.routes";

const regras = createRouter();
regras.openapi(listRegrasRoute, listRegrasHandler);
regras.openapi(createRegraRoute, createRegraHandler);
regras.openapi(deleteRegraRoute, deleteRegraHandler);

export default regras;
