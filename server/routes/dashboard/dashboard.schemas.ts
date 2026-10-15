import { z } from "@hono/zod-openapi";

const texto = z.string().trim().min(1).max(300).optional();

// Data AAAA-MM-DD que existe de fato: 2026-02-30 é recusado aqui, e não pelo Postgres.
const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    "Data inválida.",
  )
  .optional();

export const DashboardFiltrosSchema = z.object({
  faturista: texto.openapi({
    description: "Id do faturista, ou sem (Caixa de Entrada e pastas sem faturista)",
  }),
  pasta: z
    .string()
    .regex(/^(inbox|[1-9]\d*)$/)
    .optional()
    .openapi({ description: "Id da pasta, ou inbox" }),
  cliente: texto,
  status: texto.openapi({ description: "__vazio__ para sem status" }),
  tipo: texto,
  tipoCte: texto,
  agencia: texto,
  antigas: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
    .openapi({ type: "string", enum: ["true", "false"], description: "Só as emissões antigas" }),
  de: data.openapi({ description: "Emissão a partir de (AAAA-MM-DD)" }),
  ate: data.openapi({ description: "Emissão até (AAAA-MM-DD), inclusive" }),
});

const FaturistaResumoSchema = z.object({
  faturistaId: z.uuid().nullable(),
  nome: z.string(),
  supervisor: z.string().nullable(),
  valor: z.number(),
  quantidade: z.number().int(),
});

export const DashboardResumoSchema = z
  .object({
    total: z.object({ valor: z.number(), quantidade: z.number().int() }),
    faturistas: z.array(FaturistaResumoSchema).openapi({
      description: "Soma das operações por faturista da pasta, do maior valor para o menor.",
    }),
  })
  .openapi("DashboardResumo");

export const DashboardOpcoesSchema = z
  .object({
    faturistas: z.array(z.object({ id: z.uuid(), nome: z.string() })),
    pastas: z.array(
      z.object({ id: z.number().int(), nome: z.string(), faturistaId: z.uuid().nullable() }),
    ),
    clientes: z.array(z.string()),
    status: z.array(z.string()),
    tipos: z.array(z.string()),
    tiposCte: z.array(z.string()),
    agencias: z.array(z.string()),
  })
  .openapi("DashboardOpcoes");

export const FaturistaParamSchema = z.object({
  faturistaId: z.union([z.uuid(), z.literal("sem")]).openapi({
    param: { name: "faturistaId", in: "path" },
    description: "Id do faturista, ou sem",
  }),
});

export const DashboardCuboSchema = z
  .object({
    faturistaId: z.uuid().nullable(),
    linhas: z.array(
      z.object({
        status: z.string().nullable(),
        tipo: z.string().nullable(),
        agencia: z.string().nullable(),
        tipoCte: z.string().nullable(),
        cliente: z.string().nullable(),
        pastaId: z.number().int().nullable(),
        valor: z.number(),
        quantidade: z.number().int(),
        primeira: z.string().nullable(),
        ultima: z.string().nullable(),
        antigas: z.number().int(),
        valorAntigas: z.number(),
      }),
    ),
    pastas: z.array(
      z.object({ id: z.number().int(), nome: z.string(), cor: z.string().nullable() }),
    ),
  })
  .openapi("DashboardCubo");
