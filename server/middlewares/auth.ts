import type { NextFunction, Request, Response } from "express";
import { resolveAuth, type AuthedUser } from "../services/auth.server";
import { SupabaseAdminService } from "../services/supabase-admin.server";

export interface AuthedResponse extends Response {
  locals: { user?: AuthedUser; [key: string]: any };
}

export function getCookieHeader(req: Request): string | null {
  return req.headers.cookie ?? null;
}

export function getUser(res: AuthedResponse): AuthedUser {
  if (!res.locals.user) {
    const err: any = new Error("Não autenticado");
    err.status = 401;
    throw err;
  }
  return res.locals.user;
}

//A sessão é local (cookie de 30 dias, sem rede). Para um bloqueio ou exclusão
//feitos depois do login valerem antes disso, confere o usuário na lista
//cacheada do Supabase: sem rede na maioria das requests (cache de 10 min,
//invalidado na hora pelas telas de usuários). Se o Supabase estiver fora, a
//consulta devolve undefined e a request segue só com o cookie.
export async function requireUser(req: Request, res: AuthedResponse, next: NextFunction) {
  try {
    const user = resolveAuth(getCookieHeader(req));
    if (!user) {
      const err: any = new Error("Não autenticado");
      err.status = 401;
      throw err;
    }

    const conta = await SupabaseAdminService.buscarPorId(user.id);
    if (conta === null || conta?.bloqueado) {
      const err: any = new Error("Sessão encerrada. Entre novamente.");
      err.status = 401;
      throw err;
    }

    res.locals.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

//Além do cookie dizer "admin", confere na lista cacheada que o usuário continua
//admin — rebaixamento pelo app vale na hora (invalidação), pelo painel do
//Supabase em até 10 min (TTL do cache), sem chamada remota por request.
export async function requireAdmin(req: Request, res: AuthedResponse, next: NextFunction) {
  try {
    const user = resolveAuth(getCookieHeader(req));
    if (!user || user.app_metadata.role !== "admin") {
      const err: any = new Error("Acesso restrito a administradores");
      err.status = 403;
      throw err;
    }

    const admin = await SupabaseAdminService.buscarPorId(user.id);
    if (!admin || admin.bloqueado || admin.role !== "admin") {
      const err: any = new Error("Acesso restrito a administradores");
      err.status = 403;
      throw err;
    }

    res.locals.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
