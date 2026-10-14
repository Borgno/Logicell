import type { RouteHandler } from "@hono/zod-openapi";
import {
  createPasta,
  deletePasta,
  getPasta,
  listPastas,
  updatePasta,
} from "../../services/pastas/pastas.service";
import type { HonoEnv } from "../../types";
import type {
  createPastaRoute,
  deletePastaRoute,
  getPastaRoute,
  listPastasRoute,
  updatePastaRoute,
} from "./pastas.routes";

export const listPastasHandler: RouteHandler<typeof listPastasRoute, HonoEnv> = async (c) => {
  return c.json({ data: await listPastas(c.req.valid("query")) }, 200);
};

export const createPastaHandler: RouteHandler<typeof createPastaRoute, HonoEnv> = async (c) => {
  const pasta = await createPasta(c.get("user"), c.req.valid("json"));
  c.header("Location", `/api/v1/pastas/${pasta.id}`);
  return c.json(pasta, 201);
};

export const getPastaHandler: RouteHandler<typeof getPastaRoute, HonoEnv> = async (c) => {
  return c.json(await getPasta(c.req.valid("param").id), 200);
};

export const updatePastaHandler: RouteHandler<typeof updatePastaRoute, HonoEnv> = async (c) => {
  const pasta = await updatePasta(c.get("user"), c.req.valid("param").id, c.req.valid("json"));
  return c.json(pasta, 200);
};

export const deletePastaHandler: RouteHandler<typeof deletePastaRoute, HonoEnv> = async (c) => {
  await deletePasta(c.get("user").id, c.req.valid("param").id);
  return c.body(null, 204);
};
