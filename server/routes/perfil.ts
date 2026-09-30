import { Router } from "express";
import prisma from "../lib/prisma.server";
import { SupabaseAdminService } from "../services/supabase-admin.server";
import { sessionStorage, getSession } from "../services/session.server";
import { getUser, getCookieHeader, type AuthedResponse } from "../middlewares/auth";

export const perfilRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID de importação inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

perfilRouter.get("/", async (_req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    const [totalPlanilhas, ultimasImportacoes] = await Promise.all([
      prisma.importacao.count(),
      prisma.importacao.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    res.json({ user, ultimasImportacoes, stats: { totalPlanilhas } });
  } catch (err) {
    next(err);
  }
});

perfilRouter.patch("/", async (req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    const nome = String(req.body?.nome || "").trim();
    if (!nome) {
      res.status(400).json({ error: "Nome não pode estar vazio" });
      return;
    }

    await SupabaseAdminService.renomear(user.id, nome);

    // Atualiza o cookie de sessão com o novo nome — sem isso, o nome só
    // mudaria no próximo login (a sessão é local, ver session.server.ts).
    const session = getSession(getCookieHeader(req));
    res.append("Set-Cookie", sessionStorage.commitSession({ ...session, nome }));

    res.json({ success: true, user: { ...user, user_metadata: { ...user.user_metadata, nome } } });
  } catch (err) {
    next(err);
  }
});

perfilRouter.post("/importacoes/:id/desfazer", async (req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    const importacaoId = parseId(req.params.id);
    const { OperacaoImportService } = await import("../services/operacao-import.server");
    await OperacaoImportService.desfazerImportacao(importacaoId);
    res.json({ success: true, message: "Importação desfeita com sucesso!" });
  } catch (err: any) {
    next(err);
  }
});
