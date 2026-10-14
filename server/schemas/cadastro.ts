import { z } from "@hono/zod-openapi";

// Pedaços de schema dos recursos de organização (pastas, regras, prazos).

export const IntIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .openapi({ param: { name: "id", in: "path" }, type: "integer" }),
});

export const NomeSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome.")
  .max(100, "Use no máximo 100 caracteres.");

// Valor comparado em caixa alta e sem espaço nas pontas, como o motor de roteamento e os prazos
// comparam: gravar já normalizado evita duas regras que só diferem na caixa.
export function upperText(max: number, message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((value) => value.toUpperCase());
}
