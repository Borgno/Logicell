import db from "~/lib/prisma.server";

export const ConfigService = {
  get: async (chave: string) => {
    const conf = await db.configuracao.findUnique({ where: { chave } });
    if (!conf) return null;
    try {
      return JSON.parse(conf.valor);
    } catch {
      return conf.valor;
    }
  },
  
  set: async (chave: string, valor: any) => {
    const v = typeof valor === 'string' ? valor : JSON.stringify(valor);
    return db.configuracao.upsert({
      where: { chave },
      update: { valor: v },
      create: { chave, valor: v }
    });
  }
};
