import { Router } from "express";
import { createSupabaseAuthClient } from "../services/supabase.server";
import { sessionStorage } from "../services/session.server";
import { resolveAuth } from "../services/auth.server";
import { getCookieHeader } from "../middlewares/auth";

export const authRouter = Router();

const SESSAO_DURACAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      res.status(400).json({ error: "Informe e-mail e senha." });
      return;
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      res.status(401).json({ error: error?.message || "Não autenticado" });
      return;
    }

    // Sessão própria de 30 dias: só o que cabe no cookie, sem tokens do
    // Supabase e sem renovação remota depois disso (ver session.server.ts).
    res.append("Set-Cookie", sessionStorage.commitSession({
      sub: data.user.id,
      email: data.user.email || "",
      role: data.user.app_metadata?.role === "admin" ? "admin" : "usuario",
      nome: data.user.user_metadata?.nome || "",
      exp: Math.floor(Date.now() / 1000) + SESSAO_DURACAO_SEGUNDOS,
    }));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.append("Set-Cookie", sessionStorage.destroySession());
  res.json({ success: true });
});

//Retorna o usuário autenticado ou null (200) — o cliente decide o redirect.
authRouter.get("/me", (req, res, next) => {
  try {
    const user = resolveAuth(getCookieHeader(req));
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
