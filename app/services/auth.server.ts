import { redirect } from "react-router";
import { getSession } from "./session.server";
import { createSupabaseServerClient } from "./supabase.server";
export { createSupabaseServerClient };

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}


//Helper para garantir que o usuário está logado no lado do servidor.
// Se não houver sessão ativa, dispara um redirect para /login.
export async function requireUser(request: Request) {
  // 1. Tentar validação local ultra-rápida (0ms de rede)
  const cookieHeader = request.headers.get("Cookie");
  const session = await getSession(cookieHeader);
  const accessToken = session.get("access_token");

  if (accessToken) {
    const decoded = parseJwt(accessToken);
    const now = Math.floor(Date.now() / 1000);
    
    // Se o token ainda é válido por pelo menos 30 segundos
    if (decoded && decoded.exp > now + 30) {
      const user = {
        id: decoded.sub,
        aud: decoded.aud || "authenticated",
        role: decoded.role || "authenticated",
        email: decoded.email,
        app_metadata: decoded.app_metadata || {},
        user_metadata: decoded.user_metadata || {},
        created_at: "",
      };
      
      // Criamos o client do Supabase sem sincronizar o token (latência zero de rede!)
      const { supabase, response } = await createSupabaseServerClient(request, { skipSessionSync: true });
      return { user, supabase, response };
    }
  }

  // 2. Fallback para verificação remota se o token estiver expirado ou prestes a expirar
  const { supabase, response } = await createSupabaseServerClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams([["redirectTo", url.pathname]]);
    throw redirect(`/login?${searchParams}`);
  }

  return { user, supabase, response };
}


//Apenas verifica se há um usuário sem disparar redirect.
export async function getUser(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const session = await getSession(cookieHeader);
  const accessToken = session.get("access_token");

  if (accessToken) {
    const decoded = parseJwt(accessToken);
    const now = Math.floor(Date.now() / 1000);
    if (decoded && decoded.exp > now + 30) {
      return {
        id: decoded.sub,
        aud: decoded.aud || "authenticated",
        role: decoded.role || "authenticated",
        email: decoded.email,
        app_metadata: decoded.app_metadata || {},
        user_metadata: decoded.user_metadata || {},
        created_at: "",
      };
    }
  }

  const { supabase } = await createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
