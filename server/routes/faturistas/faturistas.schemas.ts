import { z } from "@hono/zod-openapi";

export const FaturistaListSchema = z
  .object({ data: z.array(z.object({ id: z.uuid(), fullName: z.string() })) })
  .openapi("FaturistaList");
