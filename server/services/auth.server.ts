import { getSession } from "./session.server";

export interface AuthedUser {
  id: string;
  email?: string;
  app_metadata: { role: string };
  user_metadata: { nome: string };
}

//Resolve o usuário direto do cookie de sessão (HMAC, ver session.server.ts):
//nenhuma chamada de rede ao Supabase por request. Cookie ausente, inválido ou
//com `exp` vencido (sessão de 30 dias) resolve para null — sem sessão remota
//para renovar, o cliente decide o redirect para o login.
export function resolveAuth(cookieHeader?: string | null): AuthedUser | null {
  const session = getSession(cookieHeader);
  if (!session.sub || !session.exp) return null;

  const agora = Math.floor(Date.now() / 1000);
  if (session.exp < agora) return null;

  return {
    id: session.sub,
    email: session.email,
    app_metadata: { role: session.role === "admin" ? "admin" : "usuario" },
    user_metadata: { nome: session.nome || "" },
  };
}
