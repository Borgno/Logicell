import { z } from "@hono/zod-openapi";

export const StatusItemSchema = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    ordem: z.number().int(),
    ativo: z.boolean().openapi({ description: "Inativo não aparece na grid, mas segue gravado." }),
  })
  .openapi("StatusOperacao");

export const StatusListSchema = z
  .object({ data: z.array(StatusItemSchema) })
  .openapi("StatusOperacaoList");

const NomeStatusSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do status.")
  .max(60, "Use no máximo 60 caracteres.");

export const CreateStatusSchema = z.object({ nome: NomeStatusSchema }).openapi("CreateStatus");

export const UpdateStatusSchema = z
  .object({
    nome: NomeStatusSchema.optional().openapi({
      description: "Renomear leva junto as operações com o nome antigo.",
    }),
    ativo: z.boolean().optional(),
  })
  .refine((body) => body.nome !== undefined || body.ativo !== undefined, {
    message: "Envie nome ou ativo.",
  })
  .openapi("UpdateStatus");

export const ReorderStatusSchema = z
  .object({
    ids: z
      .array(z.number().int().positive())
      .min(1)
      .openapi({ description: "Todos os status, na ordem nova." }),
  })
  .openapi("ReorderStatus");
