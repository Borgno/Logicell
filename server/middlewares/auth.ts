import type { NextFunction, Request, Response } from "express";
import { resolveAuth, type AuthedUser } from "../services/auth.server";
import { SupabaseAdminService, type Cargo } from "../services/supabase-admin.server";
import { getSession, sessionStorage } from "../services/session.server";
import { marcar } from "../lib/timing";

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

    const inicio = Date.now();
    const conta = await SupabaseAdminService.buscarPorId(user.id);
    marcar(res, "auth", inicio);
    if (conta === null || conta?.bloqueado) {
      const err: any = new Error("Sessão encerrada. Entre novamente.");
      err.status = 401;
      throw err;
    }

    //Cargo mudou depois do login (promoção ou rebaixamento): vale o da lista e
    //o cookie é regravado, sem exigir novo login.
    if (conta && conta.role !== user.app_metadata.role) {
      user.app_metadata.role = conta.role;
      const session = getSession(getCookieHeader(req));
      res.append("Set-Cookie", sessionStorage.commitSession({ ...session, role: conta.role }));
    }

    res.locals.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

//O cargo que vale é o da lista cacheada, não o do cookie — mudança pelo app
//vale na hora (invalidação), pelo painel do Supabase em até 10 min (TTL do
//cache), sem chamada remota por request. Supabase fora do ar nega o acesso.
async function temCargo(user: AuthedUser | null | undefined, cargos: Cargo[]): Promise<boolean> {
  if (!user) return false;
  const conta = await SupabaseAdminService.buscarPorId(user.id);
  return !!conta && !conta.bloqueado && cargos.includes(conta.role);
}

export function ehAdmin(user: AuthedUser | null | undefined): Promise<boolean> {
  return temCargo(user, ["admin"]);
}

//Gestor ou acima (admin herda tudo que o gestor pode).
export function ehGestor(user: AuthedUser | null | undefined): Promise<boolean> {
  return temCargo(user, ["admin", "gestor"]);
}

function exigir(verificar: (user: AuthedUser | null) => Promise<boolean>, mensagem: string) {
  return async (req: Request, res: AuthedResponse, next: NextFunction) => {
    try {
      //Normalmente já resolvido (e com o cargo atualizado) pelo requireUser.
      const user = res.locals.user ?? resolveAuth(getCookieHeader(req));
      if (!user || !(await verificar(user))) {
        const err: any = new Error(mensagem);
        err.status = 403;
        throw err;
      }

      res.locals.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const requireAdmin = exigir(ehAdmin, "Acesso restrito a administradores");
export const requireGestor = exigir(ehGestor, "Acesso restrito a gestores e administradores");
