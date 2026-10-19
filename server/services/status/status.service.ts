import { prisma } from "../../db/client";
import { ApiProblem } from "../../lib/problem";
import { recordAudit } from "../audit/audit.service";
import { duplicate, guard, KINDS, notFound } from "../cadastros/guard";
import { invalidateOpcoes } from "../dashboard/dashboard.service";

// Lista fechada do campo status das operações. Operacao.status continua texto, sem FK: a trava é
// daqui. Status gravado antes da lista, ou de opção desativada depois, fica como está e aparece
// marcado na grid até alguém trocar.

export type StatusItem = { id: number; nome: string; ordem: number; ativo: boolean };

const select = { id: true, nome: true, ordem: true, ativo: true } as const;

// Comparação de nome: sem diferença de caixa nem de espaço nas pontas.
export function chaveStatus(valor: string) {
  return valor.trim().toUpperCase();
}

// --- Cache ---------------------------------------------------------------------------------------

// Lido em toda edição de status e em toda importação, e alterado pouco. Toda escrita limpa.
let cache: Promise<StatusItem[]> | null = null;

export function invalidateStatus() {
  cache = null;
}

export function listStatus() {
  cache ??= prisma.statusOperacao
    .findMany({ select, orderBy: [{ ordem: "asc" }, { id: "asc" }] })
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return cache;
}

// Nome cadastrado e ativo equivalente ao valor, ou null.
export async function statusAtivo(valor: string) {
  const chave = chaveStatus(valor);
  const item = (await listStatus()).find((s) => s.ativo && chaveStatus(s.nome) === chave);
  return item?.nome ?? null;
}

// Valor que a edição grava: vazio limpa; fora da lista ativa é 422 no campo.
export async function validarStatus(valor: string | null) {
  if (valor === null || !valor.trim()) return null;
  const nome = await statusAtivo(valor);
  if (!nome) {
    const detail = `"${valor.trim()}" não é um status ativo. Escolha uma opção da lista.`;
    throw new ApiProblem(422, "VALIDATION_FAILED", detail, {
      errors: [{ field: "valor", message: detail }],
    });
  }
  return nome;
}

// Status da planilha para o nome cadastrado, inclusive opção inativa. O que não bate fica como veio.
export async function normalizadorDeStatus() {
  const porChave = new Map((await listStatus()).map((s) => [chaveStatus(s.nome), s.nome]));
  return (valor: string | null) => (valor ? (porChave.get(chaveStatus(valor)) ?? valor) : valor);
}

// --- Escrita -------------------------------------------------------------------------------------

async function getRow(id: number) {
  const row = await prisma.statusOperacao.findUnique({ where: { id }, select });
  if (!row) throw notFound(KINDS.status);
  return row;
}

async function garantirNomeLivre(nome: string, ignorarId?: number) {
  const existente = await prisma.statusOperacao.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { id: true },
  });
  if (existente) throw duplicate(KINDS.status, "Já existe um status com este nome.");
}

export async function createStatus(actorId: string, nome: string) {
  await garantirNomeLivre(nome);
  const created = await guard(KINDS.status, () =>
    prisma.$transaction(async (tx) => {
      const ultimo = await tx.statusOperacao.aggregate({ _max: { ordem: true } });
      const row = await tx.statusOperacao.create({
        data: { nome, ordem: (ultimo._max.ordem ?? 0) + 1 },
        select,
      });
      await recordAudit(
        {
          actorId,
          action: "status.created",
          targetType: "status",
          targetId: String(row.id),
          data: { nome },
        },
        tx,
      );
      return row;
    }),
  );
  invalidateStatus();
  return created;
}

// Renomear leva junto as operações que estavam com o nome antigo, na mesma transação.
export async function updateStatus(
  actorId: string,
  id: number,
  patch: { nome?: string; ativo?: boolean },
) {
  const before = await getRow(id);
  const renomear = patch.nome !== undefined && patch.nome !== before.nome;
  const ativar = patch.ativo !== undefined && patch.ativo !== before.ativo;
  if (!renomear && !ativar) return before;
  if (renomear) await garantirNomeLivre(patch.nome!, id);

  const updated = await guard(KINDS.status, () =>
    prisma.$transaction(async (tx) => {
      const row = await tx.statusOperacao.update({
        where: { id },
        data: { nome: renomear ? patch.nome : undefined, ativo: ativar ? patch.ativo : undefined },
        select,
      });
      const operacoes = renomear
        ? await tx.operacao.updateMany({
            where: { status: before.nome },
            data: { status: patch.nome },
          })
        : null;
      await recordAudit(
        {
          actorId,
          action: "status.updated",
          targetType: "status",
          targetId: String(id),
          data: {
            ...(renomear ? { nome: { from: before.nome, to: patch.nome } } : {}),
            ...(ativar ? { ativo: { from: before.ativo, to: patch.ativo } } : {}),
            ...(operacoes ? { operacoesRenomeadas: operacoes.count } : {}),
          },
        },
        tx,
      );
      return row;
    }),
  );
  invalidateStatus();
  // O filtro de status do dashboard lista os valores das operações.
  if (renomear) invalidateOpcoes();
  return updated;
}

// Recebe todos os ids na ordem final e grava ordem 1..n.
export async function reorderStatus(ids: number[]) {
  const atuais = await listStatus();
  const mesmos =
    ids.length === atuais.length &&
    new Set(ids).size === ids.length &&
    atuais.every((s) => ids.includes(s.id));
  if (!mesmos) {
    throw new ApiProblem(422, "STATUS_ORDEM_INCOMPLETA", "Envie todos os status, uma vez cada.", {
      errors: [{ field: "ids", message: "A lista precisa ter todos os status, sem repetir." }],
    });
  }
  await prisma.$transaction(
    ids.map((id, i) => prisma.statusOperacao.update({ where: { id }, data: { ordem: i + 1 } })),
  );
  invalidateStatus();
  return listStatus();
}

// Só sai status que nenhuma operação usa. O que está em uso é desativado.
export async function deleteStatus(actorId: string, id: number) {
  const before = await getRow(id);
  const emUso = await prisma.operacao.count({ where: { status: before.nome } });
  if (emUso > 0) {
    throw new ApiProblem(
      409,
      "STATUS_EM_USO",
      `Este status está em ${emUso} operação(ões). Desative em vez de excluir.`,
    );
  }
  await guard(KINDS.status, () =>
    prisma.$transaction(async (tx) => {
      await tx.statusOperacao.delete({ where: { id } });
      await recordAudit(
        {
          actorId,
          action: "status.deleted",
          targetType: "status",
          targetId: String(id),
          data: { nome: before.nome },
        },
        tx,
      );
    }),
  );
  invalidateStatus();
}
