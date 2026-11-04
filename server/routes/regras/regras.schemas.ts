import { z } from "@hono/zod-openapi";
import { upperText } from "../../schemas/cadastro";

export const TipoRegraSchema = z.enum(["agencia", "cliente", "produto"]).openapi("TipoRegra");

export const RegraSchema = z
  .object({
    id: z.number().int(),
    tipo: TipoRegraSchema,
    valor: z.string(),
    conflito: z.boolean().openapi({
      description:
        "Outra pasta disputa as mesmas operações: o motor as manda para a Caixa de Entrada.",
    }),
  })
  .openapi("Regra");

export const PastaComRegrasListSchema = z
  .object({
    data: z.array(
      z.object({
        id: z.number().int(),
        nome: z.string(),
        cor: z.string().nullable(),
        regras: z.array(RegraSchema),
      }),
    ),
  })
  .openapi("PastaComRegrasList");

export const CreateRegraSchema = z
  .object({
    pastaId: z.number().int().positive(),
    tipo: TipoRegraSchema,
    valor: upperText(200, "Informe o valor."),
  })
  .openapi("CreateRegra");
