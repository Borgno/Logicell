import { z } from "@hono/zod-openapi";
import { NomeSchema } from "../../schemas/cadastro";

export const PastaSchema = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    cor: z.string().nullable().openapi({ example: "#10b981" }),
    faturista: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  })
  .openapi("Pasta");

export const ListPastasQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .openapi({ description: "Parte do nome, sem diferenciar caixa nem acento" }),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .openapi({ description: "Só as pastas desta cor. Pasta sem cor conta como #64748b." }),
});

export const PastaListSchema = z.object({ data: z.array(PastaSchema) }).openapi("PastaList");

const CorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #rrggbb.")
  .nullable();

const FaturistaIdSchema = z.uuid().nullable().openapi({
  description: "Usuário ativo. Só supervisor e admin enviam; null desfaz o vínculo.",
});

export const CreatePastaSchema = z
  .object({
    nome: NomeSchema,
    cor: CorSchema.optional().transform((value) => value ?? null),
    faturistaId: FaturistaIdSchema.optional(),
  })
  .openapi("CreatePasta");

export const UpdatePastaSchema = z
  .object({
    nome: NomeSchema.optional(),
    cor: CorSchema.optional(),
    faturistaId: FaturistaIdSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: "Informe ao menos um campo." })
  .openapi("UpdatePasta");
