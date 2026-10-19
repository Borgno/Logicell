import type { RouteHandler } from "@hono/zod-openapi";
import {
  createStatus,
  deleteStatus,
  listStatus,
  reorderStatus,
  updateStatus,
} from "../../services/status/status.service";
import type { HonoEnv } from "../../types";
import type {
  createStatusRoute,
  deleteStatusRoute,
  listStatusRoute,
  reorderStatusRoute,
  updateStatusRoute,
} from "./status.routes";

export const listStatusHandler: RouteHandler<typeof listStatusRoute, HonoEnv> = async (c) => {
  return c.json({ data: await listStatus() }, 200);
};

// Sem Location: o status não tem GET próprio, é lido em GET /status.
export const createStatusHandler: RouteHandler<typeof createStatusRoute, HonoEnv> = async (c) => {
  return c.json(await createStatus(c.get("user").id, c.req.valid("json").nome), 201);
};

export const reorderStatusHandler: RouteHandler<typeof reorderStatusRoute, HonoEnv> = async (c) => {
  return c.json({ data: await reorderStatus(c.req.valid("json").ids) }, 200);
};

export const updateStatusHandler: RouteHandler<typeof updateStatusRoute, HonoEnv> = async (c) => {
  const status = await updateStatus(c.get("user").id, c.req.valid("param").id, c.req.valid("json"));
  return c.json(status, 200);
};

export const deleteStatusHandler: RouteHandler<typeof deleteStatusRoute, HonoEnv> = async (c) => {
  await deleteStatus(c.get("user").id, c.req.valid("param").id);
  return c.body(null, 204);
};
