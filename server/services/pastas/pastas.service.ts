import { prisma } from "../../db/client";
import type { Prisma } from "../../db/generated/client";
import { changedFields } from "../../lib/changes";
import { ApiProblem } from "../../lib/problem";
import { recordAudit } from "../audit/audit.service";
import { guard, KINDS, notFound } from "../cadastros/guard";
import { invalidateOpcoes } from "../dashboard/dashboard.service";
import { invalidateRegras } from "../regras/regras.service";
import { findUserById, type RoleCode } from "../users/users.service";

const select = {
  id: true,
  nome: true,
  cor: true,
  faturista: { select: { id: true, name: true } },
} as const;
type Row = Prisma.PastaGetPayload<{ select: typeof select }>;

export type PublicPasta = {
  id: number;
  nome: string;
  cor: string | null;
  faturista: { id: string; fullName: string } | null;
};

function toPublic(row: Row): PublicPasta {
  return {
    id: row.id,
    nome: row.nome,
    cor: row.cor,
    faturista: row.faturista && { id: row.faturista.id, fullName: row.faturista.name },
  };
}

// --- Cache ---------------------------------------------------------------------------------------

// A lista inteira vai para a sidebar em todo boot e muda pouco. Toda escrita em pasta passa por aqui e
// limpa o cache; renomear ou desativar um faturista também (ver invalidatePastas).
let cache: Promise<PublicPasta[]> | null = null;

export function invalidatePastas() {
  cache = null;
  // As opções do dashboard trazem as pastas e os faturistas delas.
  invalidateOpcoes();
}

function allPastas() {
  cache ??= prisma.pasta
    .findMany({ select, orderBy: { nome: "asc" } })
    .then((rows) => rows.map(toPublic))
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return cache;
}

// Sem diferenciar caixa nem acento.
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Cor de quem nunca escolheu uma: a mesma que a tela mostra.
const COR_PADRAO = "#64748b";

// Busca e cor filtram a lista do cache: são poucas centenas de pastas, sem ida ao banco.
export async function listPastas(filters: { search?: string; cor?: string } = {}) {
  const pastas = await allPastas();
  const query = filters.search && fold(filters.search.trim());
  const cor = filters.cor?.toLowerCase();
  return pastas.filter(
    (pasta) =>
      (!query || fold(pasta.nome).includes(query)) &&
      (!cor || (pasta.cor ?? COR_PADRAO).toLowerCase() === cor),
  );
}

// --- Escrita -------------------------------------------------------------------------------------

export type PastaInput = { nome: string; cor: string | null; faturistaId?: string | null };
type Actor = { id: string; role: RoleCode };

// Qualquer usuário cria e edita pasta; só supervisor e admin vinculam faturista, que precisa ser
// usuário ativo.
async function checkFaturista(actor: Actor, faturistaId: string | null | undefined) {
  if (faturistaId === undefined) return;
  if (actor.role === "user") {
    throw new ApiProblem(
      403,
      "FORBIDDEN",
      "Apenas supervisores e administradores vinculam faturista.",
    );
  }
  if (faturistaId === null) return;
  const faturista = await findUserById(faturistaId);
  if (!faturista?.active) {
    throw new ApiProblem(422, "VALIDATION_FAILED", "Escolha um usuário ativo como faturista.", {
      errors: [{ field: "faturistaId", message: "Escolha um usuário ativo como faturista." }],
    });
  }
}

async function getRow(id: number) {
  const row = await prisma.pasta.findUnique({ where: { id }, select });
  if (!row) throw notFound(KINDS.pasta);
  return row;
}

export async function getPasta(id: number) {
  return toPublic(await getRow(id));
}

export async function createPasta(actor: Actor, input: PastaInput) {
  await checkFaturista(actor, input.faturistaId);
  const row = await guard(KINDS.pasta, () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.pasta.create({
        data: { nome: input.nome, cor: input.cor, faturistaId: input.faturistaId ?? null },
        select,
      });
      await recordAudit(
        {
          actorId: actor.id,
          action: "pasta.created",
          targetType: "pasta",
          targetId: String(created.id),
          data: {
            nome: created.nome,
            cor: created.cor,
            faturista: created.faturista?.name ?? null,
          },
        },
        tx,
      );
      return created;
    }),
  );
  invalidatePastas();
  return toPublic(row);
}

export async function updatePasta(actor: Actor, id: number, patch: Partial<PastaInput>) {
  const before = await getRow(id);
  await checkFaturista(actor, patch.faturistaId);

  const changes = changedFields(before, { nome: patch.nome, cor: patch.cor });
  const faturistaChanged =
    patch.faturistaId !== undefined && patch.faturistaId !== (before.faturista?.id ?? null);
  if (Object.keys(changes).length === 0 && !faturistaChanged) return toPublic(before);

  const row = await guard(KINDS.pasta, () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.pasta.update({
        where: { id },
        data: {
          nome: patch.nome,
          cor: patch.cor,
          faturistaId: faturistaChanged ? patch.faturistaId : undefined,
        },
        select,
      });
      if (faturistaChanged) {
        changes.faturista = {
          from: before.faturista?.name ?? null,
          to: updated.faturista?.name ?? null,
        };
      }
      await recordAudit(
        {
          actorId: actor.id,
          action: "pasta.updated",
          targetType: "pasta",
          targetId: String(id),
          data: changes as Prisma.InputJsonObject,
        },
        tx,
      );
      return updated;
    }),
  );
  invalidatePastas();
  invalidateRegras();
  return toPublic(row);
}

// Excluir a pasta apaga as operações dela, como no sistema antigo. As regras saem junto (cascade).
export async function deletePasta(actorId: string, id: number) {
  const before = await getRow(id);
  await guard(KINDS.pasta, () =>
    prisma.$transaction(async (tx) => {
      const operacoes = await tx.operacao.deleteMany({ where: { pastaId: id } });
      await tx.pasta.delete({ where: { id } });
      await recordAudit(
        {
          actorId,
          action: "pasta.deleted",
          targetType: "pasta",
          targetId: String(id),
          data: { nome: before.nome, operacoesApagadas: operacoes.count },
        },
        tx,
      );
    }),
  );
  invalidatePastas();
  invalidateRegras();
}

// Faturistas que podem ser escolhidos: usuários ativos, de qualquer cargo.
export async function listFaturistas() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return { data: users.map((user) => ({ id: user.id, fullName: user.name })) };
}
