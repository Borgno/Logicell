import type { RouteHandler } from "@hono/zod-openapi";
import {
  createPrazoCliente,
  deletePrazoCliente,
  getPrazos,
  setPadrao,
  sugerirClientes,
  updatePrazoCliente,
} from "../../services/prazos/prazos.service";
import type { HonoEnv } from "../../types";
import type {
  createPrazoClienteRoute,
  deletePrazoClienteRoute,
  getPrazosRoute,
  listSugestoesRoute,
  updatePadraoRoute,
  updatePrazoClienteRoute,
} from "./prazos.routes";

export const getPrazosHandler: RouteHandler<typeof getPrazosRoute, HonoEnv> = async (c) => {
  return c.json(await getPrazos(), 200);
};

export const updatePadraoHandler: RouteHandler<typeof updatePadraoRoute, HonoEnv> = async (c) => {
  return c.json(await setPadrao(c.req.valid("json").prazoDias), 200);
};

export const listSugestoesHandler: RouteHandler<typeof listSugestoesRoute, HonoEnv> = async (c) => {
  return c.json(await sugerirClientes(c.req.valid("query").search), 200);
};

// Sem Location: a exceção não tem GET próprio, é lida em GET /prazos.
export const createPrazoClienteHandler: RouteHandler<
  typeof createPrazoClienteRoute,
  HonoEnv
> = async (c) => {
  return c.json(await createPrazoCliente(c.req.valid("json")), 201);
};

export const updatePrazoClienteHandler: RouteHandler<
  typeof updatePrazoClienteRoute,
  HonoEnv
> = async (c) => {
  const prazo = await updatePrazoCliente(c.req.valid("param").id, c.req.valid("json").prazoDias);
  return c.json(prazo, 200);
};

export const deletePrazoClienteHandler: RouteHandler<
  typeof deletePrazoClienteRoute,
  HonoEnv
> = async (c) => {
  await deletePrazoCliente(c.req.valid("param").id);
  return c.body(null, 204);
};
