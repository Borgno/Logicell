import { prisma } from "../../db/client";
import { ApiProblem } from "../../lib/problem";
import {
  findUserByEmail,
  findUserById,
  normalizeEmail,
  toPublicUser,
  touchLastLogin,
  type PublicUser,
} from "../users/users.service";
import { recordFailure, recordSuccess, retryAfterSeconds } from "./loginThrottle.service";
import { getDummyHash, verifyPassword } from "./password.service";
import { createSessionToken, readSessionToken } from "./session.service";

const INVALID_CREDENTIALS = "Usuário ou senha incorretos.";

// O login é o nome de usuário (a parte antes do "@" do e-mail) ou o e-mail completo. Se o mesmo nome
// existe em domínios diferentes, a busca por nome falha para não entrar na conta errada.
export async function findUserByLogin(login: string) {
  if (login.includes("@")) return findUserByEmail(login);
  const prefix = `${login}@`;
  const candidates = await prisma.user.findMany({ where: { email: { startsWith: prefix } } });
  // O startsWith do banco trata "_" e "%" como curinga; a conferência exata fica aqui.
  const matches = candidates.filter((user) => user.email.startsWith(prefix));
  return matches.length === 1 ? matches[0] : null;
}

export async function login(input: { email: string; password: string; ip: string }) {
  const email = normalizeEmail(input.email);

  const retryAfter = retryAfterSeconds(email, input.ip);
  if (retryAfter !== null) {
    throw new ApiProblem(429, "TOO_MANY_ATTEMPTS", "Muitas tentativas. Tente de novo mais tarde.", {
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  const user = await findUserByLogin(email);
  // E-mail inexistente também paga o custo do bcrypt: a resposta leva o mesmo tempo nos dois casos.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));

  if (!user || !valid) {
    recordFailure(email, input.ip);
    throw new ApiProblem(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
  }

  recordSuccess(email);

  // Só quem acertou a senha descobre que a conta está desativada.
  if (!user.active) {
    throw new ApiProblem(403, "USER_INACTIVE", "Este usuário está desativado.");
  }

  const updated = await touchLastLogin(user.id);
  return { user: toPublicUser(updated), token: createSessionToken(user.id, user.sessionVersion) };
}

// Usuário da sessão, ou null se o token é inválido, o usuário sumiu, foi desativado ou teve a senha
// resetada depois do login (sessionVersion mudou). Lê do cache por id: sem ida ao banco na maioria
// das requests.
export async function resolveSession(token: string | undefined): Promise<PublicUser | null> {
  const session = readSessionToken(token);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return toPublicUser(user);
}

// Token novo para o próprio usuário, depois de uma troca de senha que derrubou as outras sessões.
export async function issueSessionToken(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "Usuário não encontrado.");
  return createSessionToken(user.id, user.sessionVersion);
}
