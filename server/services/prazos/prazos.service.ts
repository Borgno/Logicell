import { prisma } from "../../db/client";
import { duplicate, guard, KINDS } from "../cadastros/guard";
import { normalizar } from "../regras/roteamento";

// Prazo de emissão: um padrão global (Configuracao, id 1) e exceções por cliente (PrazoCliente). A
// operação emitida antes de hoje menos o prazo do cliente é "emissão antiga" na grid.

const PADRAO_INICIAL = 10;

export type PrazoCliente = { id: number; cliente: string; prazoDias: number };
export type Prazos = { padraoDias: number; clientes: PrazoCliente[] };

const clienteSelect = { id: true, cliente: true, prazoDias: true } as const;

// --- Cache ---------------------------------------------------------------------------------------

// Lido em toda listagem de operações e alterado pouco. Toda escrita limpa.
let cache: Promise<Prazos> | null = null;

export function invalidatePrazos() {
  cache = null;
}

export function getPrazos() {
  cache ??= Promise.all([
    prisma.configuracao.findUnique({ where: { id: 1 } }),
    prisma.prazoCliente.findMany({ select: clienteSelect, orderBy: { cliente: "asc" } }),
  ])
    .then(([config, clientes]) => ({
      padraoDias: config?.prazoPadraoDias ?? PADRAO_INICIAL,
      clientes,
    }))
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return cache;
}

// Prazo de cada cliente, pela chave normalizada, para consultar linha a linha.
export async function prazoDoCliente() {
  const { padraoDias, clientes } = await getPrazos();
  const porCliente = new Map(clientes.map((item) => [normalizar(item.cliente)!, item.prazoDias]));
  return (cliente: string | null | undefined) =>
    porCliente.get(normalizar(cliente) ?? "") ?? padraoDias;
}

// --- Escrita -------------------------------------------------------------------------------------

export async function setPadrao(prazoDias: number) {
  await prisma.configuracao.upsert({
    where: { id: 1 },
    update: { prazoPadraoDias: prazoDias },
    create: { id: 1, prazoPadraoDias: prazoDias },
  });
  invalidatePrazos();
  return getPrazos();
}

export async function createPrazoCliente(input: { cliente: string; prazoDias: number }) {
  const existing = await prisma.prazoCliente.findFirst({
    where: { cliente: { equals: input.cliente, mode: "insensitive" } },
  });
  if (existing) throw duplicate(KINDS.prazoCliente, "Já existe um prazo para este cliente.");
  const created = await guard(KINDS.prazoCliente, () =>
    prisma.prazoCliente.create({ data: input, select: clienteSelect }),
  );
  invalidatePrazos();
  return created;
}

export async function updatePrazoCliente(id: number, prazoDias: number) {
  const updated = await guard(KINDS.prazoCliente, () =>
    prisma.prazoCliente.update({ where: { id }, data: { prazoDias }, select: clienteSelect }),
  );
  invalidatePrazos();
  return updated;
}

export async function deletePrazoCliente(id: number) {
  await guard(KINDS.prazoCliente, () => prisma.prazoCliente.delete({ where: { id } }));
  invalidatePrazos();
}

// Clientes que aparecem nas operações e contêm o texto, os mais frequentes primeiro: o autocomplete
// da tela de prazos.
export async function sugerirClientes(busca: string, limite = 20) {
  const termo = normalizar(busca)?.replace(/[%_\\]/g, "");
  if (!termo) return { data: [] };
  const rows = await prisma.$queryRaw<{ cliente: string }[]>`
    SELECT UPPER(TRIM(nm_pessoa_pagador)) AS cliente
      FROM "Operacao"
     WHERE nm_pessoa_pagador IS NOT NULL
       AND nm_pessoa_pagador ILIKE ${`%${termo}%`}
     GROUP BY 1
     ORDER BY COUNT(*) DESC
     LIMIT ${limite}`;
  return { data: rows.map((row) => row.cliente) };
}
