import { z } from "@hono/zod-openapi";

const OrdemSchema = z.array(z.string().min(1).max(100)).max(200);

export const OrdemColunasSchema = z
  .object({
    ordem: OrdemSchema.nullable().openapi({
      description: "Chaves das colunas da grid, na ordem. null quando nunca foi salva.",
    }),
  })
  .openapi("OrdemColunas");

export const UpdateOrdemColunasSchema = z
  .object({ ordem: OrdemSchema.min(1, "Informe a ordem das colunas.") })
  .openapi("UpdateOrdemColunas");
