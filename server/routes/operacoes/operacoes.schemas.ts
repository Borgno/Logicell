import { z } from "@hono/zod-openapi";
import { CAMPOS_EM_LOTE, COLUNA_KEYS, COLUNAS } from "../../services/operacoes/colunas";
import type { Escopo } from "../../services/operacoes/filtros";

const ordenaveis = COLUNAS.filter((coluna) => coluna.ordenavel).map((coluna) => coluna.key);

export const OperacaoSchema = z
  .object({
    id: z.number().int(),
    pastaId: z.number().int().nullable(),
    emissaoAntiga: z.boolean().openapi({ description: "Emitida antes do prazo do cliente." }),
    placaDuplicada: z
      .boolean()
      .openapi({ description: "A placa aparece em outra operação da pasta." }),
    ...Object.fromEntries(
      COLUNAS.map((coluna) => [
        coluna.key,
        coluna.tipo === "numero"
          ? z.number().nullable()
          : coluna.tipo === "data"
            ? z.iso.datetime().nullable()
            : z.string().nullable(),
      ]),
    ),
  })
  .openapi("Operacao");

// "inbox" para a Caixa de Entrada, ou o id da pasta.
const EscopoSchema = z
  .string()
  .regex(/^(inbox|[1-9]\d*)$/, "Use inbox ou o id da pasta.")
  .transform((value): Escopo => (value === "inbox" ? "inbox" : Number(value)))
  .openapi({ example: "inbox", description: "inbox (Caixa de Entrada) ou o id da pasta" });

// Repetível: ?filtro=cliente:contains:ACME&filtro=placa:duplicados
const FiltroSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]))
  .openapi({
    type: "array",
    items: { type: "string" },
    description:
      "coluna:tipo:valor. Tipos: contains, equals, blank, notBlank, period (DD/MM/AAAA;DD/MM/AAAA), antigos (dataEmissao) e duplicados (placa). Valores separados por vírgula valem como OU.",
  });

const SearchSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .openapi({ description: "CTe, NF, cliente, placa, remetente ou destinatário" });

const SortSchema = z
  .enum(ordenaveis.flatMap((key) => [key, `-${key}`]) as [string, ...string[]])
  .optional()
  .openapi({
    description:
      "Coluna ordenável, com - na frente para decrescente. Sem sort, as mais novas primeiro.",
  });

export const ListOperacoesQuerySchema = z.object({
  pasta: EscopoSchema,
  filtro: FiltroSchema,
  search: SearchSchema,
  sort: SortSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(200),
});

export const OperacaoListSchema = z
  .object({
    data: z.array(OperacaoSchema),
    meta: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalValor: z
        .number()
        .openapi({ description: "Soma do total de todas as linhas filtradas." }),
    }),
  })
  .openapi("OperacaoList");

export const PlanilhaQuerySchema = ListOperacoesQuerySchema.omit({
  page: true,
  pageSize: true,
}).extend({
  ordem: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "").split(",").filter((key) => (COLUNA_KEYS as string[]).includes(key)),
    )
    .openapi({ description: "Chaves das colunas separadas por vírgula, na ordem da tela." }),
});

export const UpdateOperacaoSchema = z
  .object({
    campo: z.enum(COLUNA_KEYS),
    valor: z.string().max(2000).nullable().openapi({
      description: "Texto como na célula: datas em DD/MM/AAAA, números como 1.234,56. Vazio limpa.",
    }),
  })
  .openapi("UpdateOperacao");

const IdsSchema = z.array(z.number().int().positive()).max(5000);

// As linhas marcadas uma a uma, ou todas as da lista filtrada menos as desmarcadas.
export const SelecaoSchema = z
  .union([
    z.object({ ids: IdsSchema.min(1, "Selecione ao menos uma operação.") }),
    z.object({
      todas: z.object({
        pasta: EscopoSchema,
        filtro: z.array(z.string()).max(50).default([]),
        search: SearchSchema,
        excluidos: IdsSchema.default([]),
      }),
    }),
  ])
  .openapi("SelecaoOperacoes");

export const UpdateOperacoesSchema = z
  .union([
    z.object({
      selecao: SelecaoSchema,
      pastaId: z
        .number()
        .int()
        .positive()
        .nullable()
        .openapi({ description: "null move para a Caixa de Entrada." }),
    }),
    z.object({
      selecao: SelecaoSchema,
      campo: z.enum(CAMPOS_EM_LOTE),
      valor: z.string().max(2000).nullable(),
    }),
  ])
  .openapi("UpdateOperacoes");

export const DeleteOperacoesSchema = z
  .object({ selecao: SelecaoSchema })
  .openapi("DeleteOperacoes");

export const AfetadasSchema = z.object({ afetadas: z.number().int() }).openapi("OperacoesAfetadas");
