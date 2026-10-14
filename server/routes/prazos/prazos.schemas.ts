import { z } from "@hono/zod-openapi";
import { upperText } from "../../schemas/cadastro";

const PrazoDiasSchema = z
  .number()
  .int("Use um número inteiro de dias.")
  .min(1, "Use de 1 a 3650 dias.")
  .max(3650, "Use de 1 a 3650 dias.");

export const PrazoClienteSchema = z
  .object({ id: z.number().int(), cliente: z.string(), prazoDias: z.number().int() })
  .openapi("PrazoCliente");

export const PrazosSchema = z
  .object({
    padraoDias: z.number().int().openapi({ description: "Prazo de quem não tem exceção." }),
    clientes: z.array(PrazoClienteSchema),
  })
  .openapi("Prazos");

export const UpdatePadraoSchema = z.object({ prazoDias: PrazoDiasSchema }).openapi("UpdatePadrao");

export const CreatePrazoClienteSchema = z
  .object({
    cliente: upperText(200, "Informe o cliente."),
    prazoDias: PrazoDiasSchema,
  })
  .openapi("CreatePrazoCliente");

export const UpdatePrazoClienteSchema = z
  .object({ prazoDias: PrazoDiasSchema })
  .openapi("UpdatePrazoCliente");

export const SugestoesQuerySchema = z.object({
  search: z.string().trim().max(200).default("").openapi({ description: "Parte do nome" }),
});

export const SugestoesSchema = z.object({ data: z.array(z.string()) }).openapi("SugestoesCliente");
