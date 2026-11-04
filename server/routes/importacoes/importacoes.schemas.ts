import { z } from "@hono/zod-openapi";

// Planilhas do ERP passam de 2 MB com 7 mil linhas; 25 MB deixa folga sem aceitar qualquer coisa.
export const TAMANHO_MAXIMO = 25 * 1024 * 1024;

export const ImportacaoSchema = z
  .object({
    id: z.number().int(),
    nomeArquivo: z.string(),
    usuario: z.string(),
    qtdRegistros: z.number().int().openapi({ description: "Linhas lidas da planilha." }),
    createdAt: z.iso.datetime(),
    podeDesfazer: z.boolean().openapi({
      description: "Tem foto guardada e não é a importação mais recente.",
    }),
  })
  .openapi("Importacao");

export const ImportacaoListSchema = z
  .object({
    data: z.array(ImportacaoSchema),
    meta: z.object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int() }),
  })
  .openapi("ImportacaoList");

export const ListImportacoesQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .openapi({ description: "Parte do nome do arquivo ou de quem importou" }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateImportacaoSchema = z
  .object({
    arquivo: z
      .custom<File>((value) => value instanceof File, "Envie a planilha.")
      .refine((file) => file.size <= TAMANHO_MAXIMO, "A planilha passa de 25 MB.")
      .refine((file) => /\.xlsx?$/i.test(file.name), "Envie a planilha em .xls ou .xlsx.")
      .openapi({ type: "string", format: "binary" }),
    modo: z.enum(["SUBSTITUIR", "ADICIONAR"]).default("SUBSTITUIR").openapi({
      description:
        "SUBSTITUIR apaga as operações que não vieram na planilha; ADICIONAR só insere as novas.",
    }),
  })
  .openapi("CreateImportacao");

export const ResultadoImportacaoSchema = z
  .object({
    importacao: ImportacaoSchema,
    modo: z.enum(["SUBSTITUIR", "ADICIONAR"]),
    totalLido: z.number().int(),
    adicionadas: z.number().int(),
    ignoradas: z.number().int().openapi({ description: "Já existiam, ou eram CE zerado." }),
    removidas: z.number().int(),
  })
  .openapi("ResultadoImportacao");

export const RestauracaoSchema = z
  .object({
    importacaoId: z.number().int(),
    importacoesDesfeitas: z.number().int(),
  })
  .openapi("Restauracao");
