import { createClient } from "@supabase/supabase-js";
import { getOrSet, renovar } from "../lib/cache";

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string;
  role: Cargo;
  criadoEm: string | null;
  bloqueado: boolean;
}

//Cargos em ordem crescente de acesso: usuário (caixa de entrada e pastas),
//gestor (+ dashboard e automações) e admin (+ gestão de usuários).
export const CARGOS = ["usuario", "gestor", "admin"] as const;
export type Cargo = (typeof CARGOS)[number];

const ROLE_ADMIN: Cargo = "admin";

//Qualquer valor desconhecido (ou ausente) cai no cargo de menor acesso.
export function normalizarCargo(role: unknown): Cargo {
  return CARGOS.includes(role as Cargo) ? (role as Cargo) : "usuario";
}
const BAN_PERMANENTE = "876000h"; // 100 anos = banimento efetivamente permanente
//Lista completa de usuários do Supabase muda pouco: cacheada 10 min e paginada
//em memória (listarUsuarios, contarAdmins e quem mais precisar da lista toda).
const USUARIOS_CACHE_KEY = "usuarios";
const USUARIOS_TTL = 1000 * 60 * 10; // 10 minutos

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
  const role = normalizarCargo(u.app_metadata?.role);
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

//Busca todas as páginas do Supabase, já mapeadas e ordenadas por nome —
//chamada só pelo getOrSet abaixo, no máximo 1x a cada TTL.
async function carregarUsuarios(): Promise<UsuarioAdmin[]> {
  const supabase = createSupabaseAdminClient();
  const totalUsuarios: any[] = [];

  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;

    const users = data?.users || [];
    totalUsuarios.push(...users);

    if (!users.length || (data?.total ?? 0) <= pagina * 1000) break;
  }

  const chave = (u: any) => {
    const nome = (u.user_metadata?.nome || u.user_metadata?.nickname || u.email || "")
      .trim()
      .toLowerCase();
    return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  totalUsuarios.sort((a, b) => chave(a).localeCompare(chave(b)));
  return totalUsuarios.map(mapearUsuario);
}

//Recarrega a lista antes do TTL vencer (chamado por um setInterval de 5 min em
//produção) — assim o cache nunca fica frio e ninguém paga a ida ao Supabase
//Auth só por má sorte de horário.
export async function renovarUsuarios(): Promise<UsuarioAdmin[]> {
  return renovar(USUARIOS_CACHE_KEY, USUARIOS_TTL, carregarUsuarios);
}

export const SupabaseAdminService = {
  //Lista completa vem do cache (getOrSet); a paginação pedida é só uma fatia
  //em memória — a ordenação continua correta mesmo com a base > 1 página.
  async listarUsuarios(page = 1, perPage = 200) {
    const totalUsuarios = await getOrSet(USUARIOS_CACHE_KEY, USUARIOS_TTL, carregarUsuarios);
    const inicio = (page - 1) * perPage;
    const usuarios = totalUsuarios.slice(inicio, inicio + perPage);
    return { usuarios, total: totalUsuarios.length };
  },

  //Procura um usuário na lista cacheada (sem rede na maioria das vezes).
  //null = não existe mais; undefined = não deu para consultar (Supabase fora),
  //e quem chama decide se segue só com o cookie.
  async buscarPorId(id: string): Promise<UsuarioAdmin | null | undefined> {
    try {
      const totalUsuarios = await getOrSet(USUARIOS_CACHE_KEY, USUARIOS_TTL, carregarUsuarios);
      return totalUsuarios.find((u) => u.id === id) ?? null;
    } catch (err) {
      console.error("[Auth] não foi possível consultar a lista de usuários:", err);
      return undefined;
    }
  },

  async criarUsuario(dados: { email: string; senha: string; nome: string; role: string }) {
    const supabase = createSupabaseAdminClient();
    const role = normalizarCargo(dados.role);

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
    const novoRole = normalizarCargo(role);

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

  //Conta quantos usuários são admin sobre a lista cacheada (sem ida ao Supabase).
  async contarAdmins() {
    const totalUsuarios = await getOrSet(USUARIOS_CACHE_KEY, USUARIOS_TTL, carregarUsuarios);
    return totalUsuarios.filter((u) => u.role === ROLE_ADMIN).length;
  },
};