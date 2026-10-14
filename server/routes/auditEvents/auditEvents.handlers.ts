import type { RouteHandler } from "@hono/zod-openapi";
import { listAuditEvents } from "../../services/audit/audit.service";
import type { HonoEnv } from "../../types";
import type { listAuditEventsRoute } from "./auditEvents.routes";

export const listAuditEventsHandler: RouteHandler<typeof listAuditEventsRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await listAuditEvents(c.req.valid("query")), 200);
};
