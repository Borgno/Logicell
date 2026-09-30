import { Router } from "express";
import { PastaService } from "../services/pasta.server";
import { SupabaseAdminService } from "../services/supabase-admin.server";
import { ehGestor, getUser, requireGestor, type AuthedResponse } from "../middlewares/auth";

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

//Criar e editar pasta é liberado a qualquer usuário, mas vincular faturista é
//só de gestor ou admin. Sem o campo no body, a pasta mantém o faturista atual
//(edição) ou fica sem (criação); um usuário comum mandando o campo recebe 403.
async function lerFaturista(req: any, res: AuthedResponse): Promise<string | null | undefined> {
  if (req.body?.faturistaId === undefined) return undefined;
  if (!(await ehGestor(getUser(res)))) {
    const err: any = new Error("Apenas gestores e administradores podem vincular faturistas.");
    err.status = 403;
    throw err;
  }
  return String(req.body.faturistaId || "").trim() || null;
}

// Lista usuários ativos disponíveis para serem faturistas de uma pasta (gestor ou admin).
pastasRouter.get("/faturistas", requireGestor, async (_req, res, next) => {
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

pastasRouter.post("/", async (req, res: AuthedResponse, next) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const faturistaId = await lerFaturista(req, res);
    const pasta = await PastaService.criar(nome, cor, faturistaId ?? null);
    res.json({ success: true, pasta });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

pastasRouter.patch("/:id", async (req, res: AuthedResponse, next) => {
  try {
    const id = parseId(req.params.id);
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const faturistaId = await lerFaturista(req, res);
    const pasta = await PastaService.atualizar(id, nome, cor, faturistaId);
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
