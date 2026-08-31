import { createClient } from "@supabase/supabase-js";

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string;
  role: "admin" | "usuario";
  criadoEm: string | null;
  bloqueado: boolean;
}

const ROLE_ADMIN = "admin";
const ROLE_USUARIO = "usuario";
const BAN_PERMANENTE = "876000h"; // 100 anos = banimento efetivamente permanente

//Client administrativo do Supabase (service_role).
//IMPORTANTE: Este arquivo é exclusivo do servidor. A service role key
//concede acesso total à API de administração e NUNCA deve ser exposta ao browser.
function createSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function mapearUsuario(u: any): UsuarioAdmin {
  const role = u.app_metadata?.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USUARIO;
  const bloqueado = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
  return {
    id: u.id,
    email: u.email || "",
    nome: u.user_metadata?.nome || u.user_metadata?.nickname || "",
    role,
    criadoEm: u.created_at || null,
    bloqueado,
  };
}

export const SupabaseAdminService = {
  async listarUsuarios(page = 1, perPage = 200) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) throw error;

    const usuarios = (data?.users || []).map(mapearUsuario);
    return { usuarios, total: data?.total ?? 0 };
  },

  async criarUsuario(dados: { email: string; senha: string; nome: string; role: string }) {
    const supabase = createSupabaseAdminClient();
    const role = dados.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USUARIO;

    const { data, error } = await supabase.auth.admin.createUser({
      email: dados.email,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nome },
      app_metadata: { role },
    });

    if (error) throw error;
    return mapearUsuario(data.user);
  },

  async atualizarCargo(usuarioId: string, role: string) {
    const supabase = createSupabaseAdminClient();
    const novoRole = role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USUARIO;

    const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
      app_metadata: { role: novoRole },
    });

    if (error) throw error;
    return novoRole;
  },

  async renomear(usuarioId: string, nome: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
      user_metadata: { nome },
    });

    if (error) throw error;
  },

  async redefinirSenha(usuarioId: string, novaSenha: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
      password: novaSenha,
    });

    if (error) throw error;
  },

  async bloquear(usuarioId: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
      ban_duration: BAN_PERMANENTE,
    });

    if (error) throw error;
  },

  async ativar(usuarioId: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
      ban_duration: "none",
    });

    if (error) throw error;
  },

  async excluir(usuarioId: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(usuarioId);

    if (error) throw error;
  },

  //Conta quantos usuários são admin consultando todas as páginas (máx. 1000 por página).
  async contarAdmins() {
    const supabase = createSupabaseAdminClient();
    let pagina = 1;
    let totalAdmins = 0;

    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
      if (error) throw error;

      const users = data?.users || [];
      totalAdmins += users.filter((u: any) => u.app_metadata?.role === ROLE_ADMIN).length;

      if (!users.length || (data?.total ?? 0) <= pagina * 1000) break;
      pagina += 1;
    }

    return totalAdmins;
  },
};