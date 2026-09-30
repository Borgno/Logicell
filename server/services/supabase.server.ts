import { createClient } from "@supabase/supabase-js";

//Client do Supabase usado exclusivamente pelo login: valida e-mail/senha e
//devolve os dados do usuário (id, e-mail, role, nome) para montar o cookie de
//sessão próprio (ver session.server.ts). Sem sincronização de cookies do
//Supabase — a sessão da aplicação é local, resolvida sem rede (A9).
export function createSupabaseAuthClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
