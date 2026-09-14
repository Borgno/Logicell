import { Router } from "express";
import { PastaService } from "../services/pasta.server";
import { SupabaseAdminService } from "../services/supabase-admin.server";

export const pastasRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

// Lista usuários ativos disponíveis para serem faturistas de uma pasta.
// Acessível a qualquer usuário autenticado (mesmo não-admin), pois a criação
// e edição de pastas não é restrita a administradores.
pastasRouter.get("/faturistas", async (_req, res, next) => {
  try {
    const { usuarios } = await SupabaseAdminService.listarUsuarios(1, 1000);
    const faturistas = usuarios
      .filter(u => !u.bloqueado)
      .map(u => ({ id: u.id, nome: u.nome, email: u.email }));
    res.json({ faturistas });
  } catch (err) {
    next(err);
  }
});

pastasRouter.post("/", async (req, res, next) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    const faturistaId = String(req.body?.faturistaId || "").trim();
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const pasta = await PastaService.criar(nome, cor, faturistaId || null);
    res.json({ success: true, pasta });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

pastasRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    const faturistaId = String(req.body?.faturistaId || "").trim();
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const pasta = await PastaService.atualizar(id, nome, cor, faturistaId || null);
    res.json({ success: true, pasta });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

pastasRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await PastaService.excluir(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
