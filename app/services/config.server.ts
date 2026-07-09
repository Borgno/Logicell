import { createCookie } from "react-router";
import db from "~/lib/prisma.server";

export const themeCookie = createCookie("app_theme", {
  maxAge: 31536000, // 1 year
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
});

export const OrdemColunasService = {
  get: async () => {
    const conf = await db.ordemColunas.findUnique({ where: { id: 1 } });
    if (!conf) return null;
    try {
      return JSON.parse(conf.ordem);
    } catch {
      return conf.ordem;
    }
  },
  
  set: async (valor: any) => {
    const v = typeof valor === 'string' ? valor : JSON.stringify(valor);
    return db.ordemColunas.upsert({
      where: { id: 1 },
      update: { ordem: v },
      create: { id: 1, ordem: v }
    });
  }
};
