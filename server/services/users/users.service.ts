import { prisma } from "../../db/client";
import type { Prisma, User } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";
import { parseSort } from "../../lib/sort";
import { recordAudit } from "../audit/audit.service";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../auth/password.service";
import { invalidatePastas } from "../pastas/pastas.service";

// `gestor` aparece como "Supervisor" na tela.
export const ROLE_CODES = ["admin", "gestor", "user"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

// Toda leitura de usuário que vira PublicUser traz o nome do supervisor junto, na mesma query.
const withSupervisor = { supervisor: { select: { id: true, name: true } } } as const;
type UserRecord = User & { supervisor: { id: string; name: string } | null };

// O que sai do servidor. Nunca inclui o hash da senha nem o sessionVersion.
export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleCode;
  supervisor: { id: string; fullName: string } | null;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.name,
    role: user.role,
    supervisor: user.supervisor && { id: user.supervisor.id, fullName: user.supervisor.name },
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// --- Cache por id ------------------------------------------------------------------------------

// O requireAuth lê o usuário em toda request: o cache poupa essa ida ao banco. Ele guarda o
// registro por id; toda escrita em usuário passa por este arquivo e troca a entrada. O TTL só cobre
// mudança feita fora do app (SQL direto no banco). Vale para um processo só, que é o deploy de hoje.
const CACHE_TTL_MS = 10 * 60 * 1000;
const userCache = new Map<string, { user: UserRecord; expiresAt: number }>();

function cacheUser(user: UserRecord) {
  userCache.set(user.id, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  return user;
}

export function forgetCachedUser(id: string) {
  userCache.delete(id);
}

export function clearUserCache() {
  userCache.clear();
}

export async function findUserById(id: string) {
  const hit = userCache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  const user = await prisma.user.findUnique({ where: { id }, include: withSupervisor });
  if (!user) {
    userCache.delete(id);
    return null;
  }
  return cacheUser(user);
}

// --- Leitura ----------------------------------------------------------------------------------

// A migration grava o e-mail normalizado, então a busca é exata.
export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function getUserRecord(id: string) {
  const user = await findUserById(id);
  if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "Usuário não encontrado.");
  return user;
}

export async function getUser(id: string) {
  return toPublicUser(await getUserRecord(id));
}

// Último acesso, gravado no login. Atualiza o cache com o registro novo.
export async function touchLastLogin(id: string) {
  return cacheUser(
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      include: withSupervisor,
    }),
  );
}

// --- Gestão (admin) -------------------------------------------------------------------------

export type ListUsersQuery = {
  search?: string;
  role?: RoleCode;
  active?: boolean;
  sort: string;
  page: number;
  pageSize: number;
};

function userOrderBy(sort: string): Prisma.UserOrderByWithRelationInput[] {
  const { field, direction } = parseSort(sort);
  switch (field) {
    case "fullName":
      return [{ name: direction }, { email: "asc" }];
    case "email":
      return [{ email: direction }];
    case "lastLoginAt":
      return [{ lastLoginAt: { sort: direction, nulls: "last" } }, { email: "asc" }];
    default:
      return [{ createdAt: direction }, { email: "asc" }];
  }
}

export async function listUsers(query: ListUsersQuery) {
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    role: query.role,
    active: query.active,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: withSupervisor,
      orderBy: userOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    data: users.map(toPublicUser),
    meta: { page: query.page, pageSize: query.pageSize, total },
  };
}

const INVALID_SUPERVISOR = "Escolha um usuário ativo com o cargo Supervisor.";

// Só o cargo comum tem supervisor, e ele precisa ser outro usuário, ativo, com o cargo `gestor`.
async function assertSupervisor(role: RoleCode, supervisorId: string, userId?: string) {
  if (role !== "user") {
    throw new ApiProblem(422, "VALIDATION_FAILED", "Só o cargo Usuário tem supervisor.", {
      errors: [{ field: "supervisorId", message: "Só o cargo Usuário tem supervisor." }],
    });
  }
  const supervisor = await findUserById(supervisorId);
  if (supervisorId === userId || !supervisor?.active || supervisor.role !== "gestor") {
    throw new ApiProblem(422, "VALIDATION_FAILED", INVALID_SUPERVISOR, {
      errors: [{ field: "supervisorId", message: INVALID_SUPERVISOR }],
    });
  }
  return supervisor;
}

// O usuário criado entra com a senha definida pelo admin e troca no primeiro login.
// actorId nulo: criado pelo terminal (`user:create`), sem um admin logado.
export async function createUser(
  actorId: string | null,
  input: {
    email: string;
    fullName: string;
    role: RoleCode;
    password: string;
    supervisorId?: string | null;
  },
) {
  if (await findUserByEmail(input.email)) {
    throw new ApiProblem(409, "EMAIL_TAKEN", "Já existe um usuário com este e-mail.", {
      errors: [{ field: "email", message: "Já existe um usuário com este e-mail." }],
    });
  }
  const supervisor = input.supervisorId
    ? await assertSupervisor(input.role, input.supervisorId)
    : null;
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: normalizeEmail(input.email),
        name: input.fullName.trim(),
        passwordHash,
        role: input.role,
        supervisor: supervisor ? { connect: { id: supervisor.id } } : undefined,
        mustChangePassword: true,
      },
      include: withSupervisor,
    });
    await recordAudit(
      {
        actorId,
        action: "user.created",
        targetType: "user",
        targetId: created.id,
        data: { email: created.email, role: created.role, supervisor: supervisor?.name ?? null },
      },
      tx,
    );
    return created;
  });
  return toPublicUser(cacheUser(user));
}

export async function updateUser(
  actorId: string,
  id: string,
  patch: { fullName?: string; role?: RoleCode; active?: boolean; supervisorId?: string | null },
) {
  const user = await getUserRecord(id);
  const losesAdmin =
    user.role === "admin" &&
    user.active &&
    ((patch.role !== undefined && patch.role !== "admin") || patch.active === false);

  // O admin não tira o próprio acesso: sem essa trava, um clique errado tranca a pessoa para fora.
  // Isso também garante que sempre sobra ao menos um admin ativo: quem chama já é um, então o último
  // admin nunca perde o cargo.
  if (id === actorId && losesAdmin) {
    throw new ApiProblem(
      409,
      "SELF_LOCKOUT",
      "Você não pode desativar nem remover o próprio acesso de admin.",
    );
  }

  const role = patch.role ?? user.role;
  // Sair do cargo comum desfaz o vínculo com o supervisor. Só valida quando o vínculo muda: manter um
  // supervisor que foi desativado depois não pode impedir de salvar o resto.
  if (role !== "user" && patch.supervisorId) await assertSupervisor(role, patch.supervisorId, id);
  const supervisorId =
    role !== "user"
      ? null
      : patch.supervisorId === undefined
        ? user.supervisorId
        : patch.supervisorId;
  const supervisorChanged = supervisorId !== user.supervisorId;
  const supervisor =
    supervisorChanged && supervisorId ? await assertSupervisor(role, supervisorId, id) : null;

  const deactivating = patch.active === false && user.active;
  // Quem deixa de ser supervisor, por cargo ou desativação, solta os atendentes.
  const releasesAttendants = user.role === "gestor" && (role !== "gestor" || deactivating);

  const fullName = patch.fullName?.trim();
  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.UserUpdateInput = {};
    if (fullName !== undefined && fullName !== user.name) {
      data.name = fullName;
      await recordAudit(
        {
          actorId,
          action: "user.updated",
          targetType: "user",
          targetId: id,
          data: { from: user.name, to: fullName },
        },
        tx,
      );
    }
    if (role !== user.role) {
      data.role = role;
      await recordAudit(
        {
          actorId,
          action: "user.roleChanged",
          targetType: "user",
          targetId: id,
          data: { from: user.role, to: role },
        },
        tx,
      );
    }
    if (supervisorChanged) {
      data.supervisor = supervisor ? { connect: { id: supervisor.id } } : { disconnect: true };
      await recordAudit(
        {
          actorId,
          action: "user.supervisorChanged",
          targetType: "user",
          targetId: id,
          data: { from: user.supervisor?.name ?? null, to: supervisor?.name ?? null },
        },
        tx,
      );
    }
    if (patch.active !== undefined && patch.active !== user.active) {
      data.active = patch.active;
      const extra: Record<string, number> = {};
      if (deactivating) {
        // Desativar derruba as sessões: sem isso, reativar devolveria a vida aos cookies antigos.
        data.sessionVersion = { increment: 1 };
        // Faturista precisa ser usuário ativo: as pastas dele ficam sem responsável.
        const pastas = await tx.pasta.updateMany({
          where: { faturistaId: id },
          data: { faturistaId: null },
        });
        if (pastas.count > 0) extra.pastasSemFaturista = pastas.count;
      }
      await recordAudit(
        {
          actorId,
          action: patch.active ? "user.activated" : "user.deactivated",
          targetType: "user",
          targetId: id,
          data: extra,
        },
        tx,
      );
    }
    if (releasesAttendants) {
      const attendants = await tx.user.findMany({
        where: { supervisorId: id },
        select: { id: true },
      });
      await tx.user.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } });
      for (const attendant of attendants) {
        await recordAudit(
          {
            actorId,
            action: "user.supervisorChanged",
            targetType: "user",
            targetId: attendant.id,
            data: { from: user.name, to: null },
          },
          tx,
        );
      }
    }
    return tx.user.update({ where: { id }, data, include: withSupervisor });
  });

  // A lista de pastas mostra o nome do faturista, e desativar tira a pessoa das pastas.
  if (deactivating || updated.name !== user.name) invalidatePastas();
  // O cache dos atendentes guarda o nome e o vínculo do supervisor: quando eles mudam, tudo é relido.
  if (user.role === "gestor" && (releasesAttendants || updated.name !== user.name)) {
    clearUserCache();
  }
  return toPublicUser(cacheUser(updated));
}

// Gera uma senha temporária, obriga a troca no próximo login e derruba as sessões abertas do usuário.
// A senha é devolvida uma única vez: o servidor só guarda o hash.
export async function resetPassword(actorId: string, id: string) {
  await getUserRecord(id);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
      include: withSupervisor,
    });
    await recordAudit(
      { actorId, action: "user.passwordReset", targetType: "user", targetId: id },
      tx,
    );
    return user;
  });
  cacheUser(updated);
  return { temporaryPassword };
}

// --- Próprio usuário ------------------------------------------------------------------------

export function updateOwnProfile(userId: string, input: { fullName: string }) {
  return updateUser(userId, userId, { fullName: input.fullName });
}

// Derruba as outras sessões do usuário. Quem trocou recebe um token novo (o handler reemite o cookie).
export async function changeOwnPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const user = await getUserRecord(userId);

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiProblem(422, "INVALID_CURRENT_PASSWORD", "A senha atual não confere.", {
      errors: [{ field: "currentPassword", message: "A senha atual não confere." }],
    });
  }
  if (input.currentPassword === input.newPassword) {
    throw new ApiProblem(422, "SAME_PASSWORD", "A nova senha precisa ser diferente da atual.", {
      errors: [{ field: "newPassword", message: "A nova senha precisa ser diferente da atual." }],
    });
  }

  const passwordHash = await hashPassword(input.newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      include: withSupervisor,
    });
    await recordAudit(
      { actorId: userId, action: "user.passwordChanged", targetType: "user", targetId: userId },
      tx,
    );
    return changed;
  });
  cacheUser(updated);
}

// --- Números para o dashboard ------------------------------------------------------------------

export async function getUserStats() {
  const [byStatus, byRole, recent] = await Promise.all([
    prisma.user.groupBy({
      by: ["active", "mustChangePassword"],
      _count: { _all: true },
      orderBy: [{ active: "asc" }, { mustChangePassword: "asc" }],
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true }, orderBy: { role: "asc" } }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 5,
    }),
  ]);
  const count = (match: (row: (typeof byStatus)[number]) => boolean) =>
    byStatus.filter(match).reduce((sum, row) => sum + row._count._all, 0);
  const total = count(() => true);
  const active = count((row) => row.active);
  return {
    total,
    active,
    inactive: total - active,
    pendingPasswordChange: count((row) => row.active && row.mustChangePassword),
    byRole: ROLE_CODES.map((role) => ({
      role,
      count: byRole.find((row) => row.role === role)?._count._all ?? 0,
    })),
    recentLogins: recent.map((user) => ({
      id: user.id,
      fullName: user.name,
      email: user.email,
      lastLoginAt: user.lastLoginAt!.toISOString(),
    })),
  };
}
