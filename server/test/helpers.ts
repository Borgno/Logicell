import { createApp } from "../app";
import { prisma } from "../db/client";
import type { Prisma } from "../db/generated/client";
import { resetLoginThrottle } from "../services/auth/loginThrottle.service";
import { invalidateColunas } from "../services/colunas/colunas.service";
import { clearDashboardCache } from "../services/dashboard/dashboard.service";
import { invalidatePastas } from "../services/pastas/pastas.service";
import { invalidatePrazos } from "../services/prazos/prazos.service";
import { invalidateRegras } from "../services/regras/regras.service";
import { invalidateStatus } from "../services/status/status.service";
import { hashPassword } from "../services/auth/password.service";
import { clearUserCache, forgetCachedUser } from "../services/users/users.service";
import { resetDatabase } from "./db";

export const SEED_PASSWORD = "seed-password";
export const ADMIN_EMAIL = "admin@local.test";
export const USER_EMAIL = "user@local.test";

// O bcrypt é lento de propósito: o hash da senha comum é calculado uma vez por arquivo de teste.
let seedHash: Promise<string> | null = null;

// Banco vazio com um admin e um usuário comum, os dois com SEED_PASSWORD.
export async function setupApp() {
  await resetDatabase();
  // Os caches do processo guardam o que o TRUNCATE acabou de apagar.
  clearUserCache();
  invalidatePastas();
  invalidateRegras();
  invalidatePrazos();
  invalidateStatus();
  invalidateColunas();
  clearDashboardCache();
  resetLoginThrottle();
  seedHash ??= hashPassword(SEED_PASSWORD);
  const passwordHash = await seedHash;
  await prisma.user.createMany({
    data: [
      { email: ADMIN_EMAIL, name: "Administrador", role: "admin", passwordHash },
      { email: USER_EMAIL, name: "Usuário Comum", role: "user", passwordHash },
    ],
  });
  return createApp();
}

export function findUser(email: string) {
  return prisma.user.findUniqueOrThrow({ where: { email } });
}

export function lastAuditEvent() {
  return prisma.auditEvent.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}

type App = Awaited<ReturnType<typeof setupApp>>;

export function jsonRequest(method: string, body?: unknown, cookie?: string): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
}

// Faz login e devolve o cookie "session=..." pronto para o header Cookie.
export async function loginAs(app: App, email: string, password = SEED_PASSWORD) {
  const res = await app.request("/api/v1/sessions", jsonRequest("POST", { email, password }));
  if (res.status !== 201) throw new Error(`login falhou: ${res.status}`);
  const setCookie = res.headers.get("Set-Cookie") ?? "";
  return setCookie.split(";")[0];
}

// Muda o usuário direto no banco, para montar o cenário sem passar pela API. Tira a entrada do cache,
// como faria o TTL.
export async function setUser(email: string, data: Prisma.UserUpdateInput) {
  const user = await prisma.user.update({ where: { email }, data });
  forgetCachedUser(user.id);
  return user;
}
