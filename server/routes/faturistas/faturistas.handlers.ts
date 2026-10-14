import type { RouteHandler } from "@hono/zod-openapi";
import { listFaturistas } from "../../services/pastas/pastas.service";
import type { HonoEnv } from "../../types";
import type { listFaturistasRoute } from "./faturistas.routes";

export const listFaturistasHandler: RouteHandler<typeof listFaturistasRoute, HonoEnv> = async (
  c,
) => {
  return c.json(await listFaturistas(), 200);
};
