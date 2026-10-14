import { z } from "zod";

// Em desenvolvimento as variáveis vêm do .env da raiz. Em produção vêm do ambiente do container, e o
// arquivo não existe.
try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Porta que o navegador acessa. Em dev é a do Vite; em produção é a do Hono, que serve SPA e API.
  PORT: z.coerce.number().int().positive().default(3000),
  // Porta do Hono em dev, atrás do proxy do Vite. Em produção não é usada.
  API_PORT: z.coerce.number().int().positive().default(3001),
  // Chave do HMAC que assina o cookie de sessão. Trocar invalida todas as sessões abertas.
  SESSION_SECRET: z.string().min(32, "use ao menos 32 caracteres"),
  // Postgres. Em dev, o do docker-compose.dev.yml; em produção, o pooler do Supabase em modo sessão.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Conexões do pool por processo. O pooler em modo sessão limita o total de clientes (15 no plano
  // atual): produção fica com 10, e fora dela 2, para não disputar slot com o container.
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

// Dev e teste nunca falam com o banco de produção: um `bun run dev` escreveria nele, e um
// `prisma migrate dev` pediria para resetá-lo.
if (
  parsed.data.NODE_ENV !== "production" &&
  /\.supabase\.(com|co)$/.test(new URL(parsed.data.DATABASE_URL).hostname)
) {
  console.error("DATABASE_URL aponta para o Supabase fora de produção. Use o Postgres local.");
  process.exit(1);
}

export const env = {
  ...parsed.data,
  DB_CONNECTION_LIMIT:
    parsed.data.DB_CONNECTION_LIMIT ?? (parsed.data.NODE_ENV === "production" ? 10 : 2),
};

// Em produção há um processo só (SPA e API na mesma porta); em dev o Hono fica atrás do Vite.
export const listenPort = env.NODE_ENV === "production" ? env.PORT : env.API_PORT;
