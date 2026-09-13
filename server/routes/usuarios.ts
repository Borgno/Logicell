import { Router } from "express";
import { SupabaseAdminService } from "../services/supabase-admin.server";
import { PastaService } from "../services/pasta.server";
import { getUser, type AuthedResponse } from "../middlewares/auth";
import { invalidate } from "../lib/cache";

export const usuariosRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function traduzirErroSupabase(err: any): string {
  const msg = String(err?.message || err || "Erro desconhecido");

  const mapa: Record<string, string> = {
    "User already registered": "E-mail já cadastrado.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "User not found": "Usuário não encontrado.",
    "Invalid email": "E-mail inválido.",
    "Password cannot be empty": "A senha não pode estar vazia.",
    "A user with this email address has already been registered": "E-mail já cadastrado.",
  };

  for (const [chave, traducao] of Object.entries(mapa)) {
    if (msg.includes(chave)) return traducao;
  }

  return msg;
}

function validarEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

function parseId(value: any): string {
  const id = String(value || "");
  if (!id) {
    const err: any = new Error("Usuário não informado.");
    err.status = 400;
    throw err;
  }
  return id;
}

usuariosRouter.get("/", async (req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    const page = Math.max(1, Number(req.query.page) || 1);
    const { usuarios, total } = await SupabaseAdminService.listarUsuarios(page);
    res.json({ usuarios, total, page, currentUserId: user.id });
  } catch (err) {
    next(err);
  }
});

usuariosRouter.post("/", async (req, res: AuthedResponse, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    const nome = String(req.body?.nome || "").trim();
    const role = String(req.body?.role || "usuario");

    if (!email || !validarEmail(email)) {
      res.status(400).json({ error: "Informe um e-mail válido." });
      return;
    }
    if (senha.length < 6) {
      res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (!nome) {
      res.status(400).json({ error: "Informe o nome do usuário." });
      return;
    }
    if (role !== "admin" && role !== "usuario") {
      res.status(400).json({ error: "Cargo inválido." });
      return;
    }

    const usuario = await SupabaseAdminService.criarUsuario({ email, senha, nome, role });
    invalidate("usuarios");
    res.json({ success: true, mensagem: `Usuário "${usuario.email}" criado com sucesso.` });
  } catch (err) {
    next(traduzirErroSupabase(err));
  }
});

usuariosRouter.patch("/:id", async (req, res: AuthedResponse, next) => {
  try {
    const usuarioId = parseId(req.params.id);
    const currentUserId = getUser(res).id;
    const nome = String(req.body?.nome || "").trim();
    const role = String(req.body?.role || "");
    const novaSenha = String(req.body?.novaSenha || "");

    if (!nome) {
      res.status(400).json({ error: "Informe o nome do usuário." });
      return;
    }
    if (role !== "admin" && role !== "usuario") {
      res.status(400).json({ error: "Cargo inválido." });
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (usuarioId === currentUserId && role !== "admin") {
      res.status(400).json({ error: "Você não pode rebaixar o próprio cargo." });
      return;
    }

    const totalAdmins = await SupabaseAdminService.contarAdmins();
    if (totalAdmins <= 1 && role !== "admin") {
      res.status(400).json({ error: "Não é possível rebaixar o último administrador do sistema." });
      return;
    }

    await SupabaseAdminService.renomear(usuarioId, nome);
    await SupabaseAdminService.atualizarCargo(usuarioId, role);
    if (novaSenha) await SupabaseAdminService.redefinirSenha(usuarioId, novaSenha);
    invalidate("usuarios");

    res.json({
      success: true,
      mensagem: `Usuário atualizado com cargo de ${role === "admin" ? "Administrador" : "Usuário"}.`,
    });
  } catch (err) {
    next(traduzirErroSupabase(err));
  }
});

usuariosRouter.post("/:id/bloquear", async (req, res: AuthedResponse, next) => {
  try {
    const usuarioId = parseId(req.params.id);
    const currentUserId = getUser(res).id;
    if (usuarioId === currentUserId) {
      res.status(400).json({ error: "Você não pode bloquear o próprio acesso." });
      return;
    }
    await PastaService.removerFaturista(usuarioId);
    await SupabaseAdminService.bloquear(usuarioId);
    invalidate("usuarios");
    res.json({ success: true, mensagem: "Usuário bloqueado com sucesso. As pastas em que ele era faturista ficaram sem responsável." });
  } catch (err) {
    next(traduzirErroSupabase(err));
  }
});

usuariosRouter.post("/:id/ativar", async (req, res: AuthedResponse, next) => {
  try {
    const usuarioId = parseId(req.params.id);
    await SupabaseAdminService.ativar(usuarioId);
    invalidate("usuarios");
    res.json({ success: true, mensagem: "Usuário ativado com sucesso." });
  } catch (err) {
    next(traduzirErroSupabase(err));
  }
});

usuariosRouter.delete("/:id", async (req, res: AuthedResponse, next) => {
  try {
    const usuarioId = parseId(req.params.id);
    const currentUserId = getUser(res).id;
    if (usuarioId === currentUserId) {
      res.status(400).json({ error: "Você não pode excluir a própria conta." });
      return;
    }
    const totalAdmins = await SupabaseAdminService.contarAdmins();
    if (totalAdmins <= 1) {
      res.status(400).json({ error: "Não é possível excluir o último administrador do sistema." });
      return;
    }
    await PastaService.removerFaturista(usuarioId);
    await SupabaseAdminService.excluir(usuarioId);
    invalidate("usuarios");
    res.json({ success: true, mensagem: "Usuário excluído com sucesso. As pastas em que ele era faturista ficaram sem responsável." });
  } catch (err) {
    next(traduzirErroSupabase(err));
  }
});
