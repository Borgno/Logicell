import db from "../lib/prisma.server";
import { getOrSet, invalidate } from "../lib/cache";

const ORDEM_CACHE_KEY = "ordemColunas";
const ORDEM_TTL = 1000 * 60 * 10; // 10 minutos

export const OrdemColunasService = {
  get: async () => {
    return getOrSet(ORDEM_CACHE_KEY, ORDEM_TTL, async () => {
      const conf = await db.ordemColunas.findUnique({ where: { id: 1 } });
      if (!conf) return null;
      try {
        return JSON.parse(conf.ordem);
      } catch {
        return conf.ordem;
      }
    });
  },

  set: async (valor: any) => {
    const v = typeof valor === 'string' ? valor : JSON.stringify(valor);
    const resultado = await db.ordemColunas.upsert({
      where: { id: 1 },
      update: { ordem: v },
      create: { id: 1, ordem: v }
    });
    invalidate(ORDEM_CACHE_KEY);
    return resultado;
  }
};
