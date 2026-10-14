import { prisma } from "../../db/client";

// Ordem das colunas da grid de operações, global para todos os usuários (OrdemColunas, id 1). O
// banco guarda o JSON como texto.

let cache: Promise<string[] | null> | null = null;

export function invalidateColunas() {
  cache = null;
}

function parse(ordem: string): string[] | null {
  try {
    const value: unknown = JSON.parse(ordem);
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
  } catch {
    return null;
  }
}

export async function getOrdemColunas() {
  cache ??= prisma.ordemColunas
    .findUnique({ where: { id: 1 } })
    .then((row) => (row ? parse(row.ordem) : null))
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return { ordem: await cache };
}

export async function setOrdemColunas(ordem: string[]) {
  const value = JSON.stringify(ordem);
  await prisma.ordemColunas.upsert({
    where: { id: 1 },
    update: { ordem: value },
    create: { id: 1, ordem: value },
  });
  cache = Promise.resolve(ordem);
  return { ordem };
}
