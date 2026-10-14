import { prisma } from "../../db/client";
import { recordAudit } from "../audit/audit.service";
import { duplicate, guard, KINDS, notFound } from "../cadastros/guard";
import { regrasEmConflito } from "./conflitos";
import { montarMapas, type MapasRoteamento } from "./roteamento";

export type TipoRegra = "agencia" | "cliente" | "produto";

const regraSelect = {
  id: true,
  pastaId: true,
  agencia: true,
  cliente: true,
  produto: true,
} as const;

type RegraRow = {
  id: number;
  pastaId: number;
  agencia: string | null;
  cliente: string | null;
  produto: string | null;
};

function tipoValor(regra: RegraRow): { tipo: TipoRegra; valor: string } {
  if (regra.cliente) return { tipo: "cliente", valor: regra.cliente };
  if (regra.agencia) return { tipo: "agencia", valor: regra.agencia };
  return { tipo: "produto", valor: regra.produto ?? "" };
}

// --- Cache ---------------------------------------------------------------------------------------

// As regras mudam pouco e são lidas pela tela de automações e pela importação. Toda escrita em regra,
// e renomear ou excluir pasta, limpa o cache.
let cache: Promise<RegraRow[]> | null = null;

export function invalidateRegras() {
  cache = null;
}

function allRegras() {
  cache ??= prisma.regraAutomacao
    .findMany({ select: regraSelect, orderBy: { id: "asc" } })
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return cache;
}

// Mapas do motor de roteamento, para a importação.
export async function mapasRoteamento(): Promise<MapasRoteamento> {
  return montarMapas(await allRegras());
}

// --- Leitura -------------------------------------------------------------------------------------

export type PublicRegra = { id: number; tipo: TipoRegra; valor: string; conflito: boolean };
export type PastaComRegras = {
  id: number;
  nome: string;
  cor: string | null;
  regras: PublicRegra[];
};

// Todas as pastas, cada uma com as regras dela e a marca de conflito.
export async function listRegras(): Promise<{ data: PastaComRegras[] }> {
  const [pastas, regras] = await Promise.all([
    prisma.pasta.findMany({
      select: { id: true, nome: true, cor: true },
      orderBy: { nome: "asc" },
    }),
    allRegras(),
  ]);
  const conflitos = regrasEmConflito(regras);
  const porPasta = new Map<number, PublicRegra[]>();
  for (const regra of regras) {
    const list = porPasta.get(regra.pastaId) ?? [];
    list.push({ id: regra.id, ...tipoValor(regra), conflito: conflitos.has(regra.id) });
    porPasta.set(regra.pastaId, list);
  }
  return { data: pastas.map((pasta) => ({ ...pasta, regras: porPasta.get(pasta.id) ?? [] })) };
}

// --- Escrita -------------------------------------------------------------------------------------

export async function createRegra(
  actorId: string,
  input: { pastaId: number; tipo: TipoRegra; valor: string },
) {
  const pasta = await prisma.pasta.findUnique({
    where: { id: input.pastaId },
    select: { id: true },
  });
  if (!pasta) {
    throw notFound(KINDS.pasta);
  }
  const existing = await prisma.regraAutomacao.findFirst({
    where: {
      pastaId: input.pastaId,
      [input.tipo]: { equals: input.valor, mode: "insensitive" },
    },
  });
  if (existing) throw duplicate(KINDS.regra, "Esta regra já existe nesta pasta.");

  const regra = await prisma.$transaction(async (tx) => {
    const created = await tx.regraAutomacao.create({
      data: { pastaId: input.pastaId, [input.tipo]: input.valor },
      select: regraSelect,
    });
    await recordAudit(
      {
        actorId,
        action: "regra.created",
        targetType: "pasta",
        targetId: String(input.pastaId),
        data: { tipo: input.tipo, valor: input.valor },
      },
      tx,
    );
    return created;
  });
  invalidateRegras();
  const conflitos = regrasEmConflito(await allRegras());
  return { id: regra.id, ...tipoValor(regra), conflito: conflitos.has(regra.id) };
}

export async function deleteRegra(actorId: string, id: number) {
  await guard(KINDS.regra, () =>
    prisma.$transaction(async (tx) => {
      const regra = await tx.regraAutomacao.delete({ where: { id }, select: regraSelect });
      await recordAudit(
        {
          actorId,
          action: "regra.deleted",
          targetType: "pasta",
          targetId: String(regra.pastaId),
          data: tipoValor(regra),
        },
        tx,
      );
    }),
  );
  invalidateRegras();
}
