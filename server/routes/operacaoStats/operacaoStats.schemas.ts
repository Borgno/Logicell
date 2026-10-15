import { z } from "@hono/zod-openapi";

const ContagemSchema = z.object({
  total: z.number().int(),
  emissoesAntigas: z.number().int(),
  valorEmissoesAntigas: z.number(),
});

export const OperacaoStatsSchema = z
  .object({
    caixaDeEntrada: ContagemSchema,
    pastas: z.array(ContagemSchema.extend({ pastaId: z.number().int() })).openapi({
      description: "Só as pastas com ao menos uma operação.",
    }),
  })
  .openapi("OperacaoStats");
