import { prisma, type TransactionClient } from "../../db/client";
import type { Prisma } from "../../db/generated/client";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.roleChanged"
  | "user.supervisorChanged"
  | "user.deactivated"
  | "user.activated"
  | "user.passwordReset"
  | "user.passwordChanged"
  | "pasta.created"
  | "pasta.updated"
  | "pasta.deleted"
  | "regra.created"
  | "regra.deleted"
  | "importacao.created"
  | "importacao.restored";

export type AuditTargetType = "user" | "pasta" | "importacao";

type AuditInput = {
  actorId: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  data?: Prisma.InputJsonObject;
};

// Recebe o client da transação quando a mudança e o audit precisam gravar juntos.
export async function recordAudit(input: AuditInput, db: TransactionClient = prisma) {
  await db.auditEvent.create({ data: { ...input, data: input.data ?? {} } });
}

export type PublicAuditEvent = {
  id: string;
  action: string;
  actor: { id: string; fullName: string } | null;
  targetType: string;
  targetId: string;
  data: Record<string, unknown>;
  createdAt: string;
};

// Mais recentes primeiro.
export async function listAuditEvents(query: {
  targetType?: string;
  targetId?: string;
  page: number;
  pageSize: number;
}) {
  const where = { targetType: query.targetType, targetId: query.targetId };
  const [events, total] = await prisma.$transaction([
    prisma.auditEvent.findMany({
      where,
      include: { actor: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  const data: PublicAuditEvent[] = events.map((event) => ({
    id: event.id,
    action: event.action,
    actor: event.actor ? { id: event.actor.id, fullName: event.actor.name } : null,
    targetType: event.targetType,
    targetId: event.targetId,
    data: event.data as Record<string, unknown>,
    createdAt: event.createdAt.toISOString(),
  }));
  return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
}
