// Cria um usuário pelo terminal, sem precisar de um admin logado. Serve para o primeiro admin de um
// banco novo e para recuperar o acesso quando nenhum admin consegue entrar. A senha é temporária,
// impressa uma vez aqui, e o usuário troca no primeiro login. O audit registra a criação sem autor.
//
//   bun run user:create -- --email <e-mail> --role <role> [--name "Nome Completo"]
//
// Em produção, dentro do container do app:
//
//   docker exec -it <container> node build/api/createUser.js --email <e-mail> --role admin
import { z } from "zod";
import { generateTemporaryPassword } from "../services/auth/password.service";
import { createUser, ROLE_CODES } from "../services/users/users.service";

const USAGE = `Uso: createUser --email <e-mail> --role <${ROLE_CODES.join("|")}> [--name "Nome Completo"]`;

const argsSchema = z.object({
  email: z.email("e-mail inválido"),
  role: z.enum(ROLE_CODES, `use ${ROLE_CODES.join(", ")}`),
  name: z.string().trim().min(1, "nome vazio").optional(),
});

function arg(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = argsSchema.safeParse({
    email: arg(args, "--email")?.trim(),
    role: arg(args, "--role")?.trim().toLowerCase(),
    name: arg(args, "--name"),
  });
  if (!parsed.success) {
    console.error(`${z.prettifyError(parsed.error)}\n${USAGE}`);
    process.exit(1);
  }

  const { email, role, name } = parsed.data;
  const password = generateTemporaryPassword();
  const user = await createUser(null, {
    email,
    role,
    fullName: name ?? email.split("@")[0],
    password,
  });

  console.log(`Usuário criado: ${user.email} (${user.role})`);
  console.log(`Senha temporária: ${password}`);
  console.log("A senha não aparece de novo. O usuário troca no primeiro login.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
