import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireAdmin } from "~/services/auth.server";
import { SupabaseAdminService } from "~/services/supabase-admin.server";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { UsuariosView } from "~/views/UsuariosView";

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

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, response } = await requireAdmin(request);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const { usuarios, total } = await SupabaseAdminService.listarUsuarios(page);

  return data(
    { usuarios, total, page, currentUserId: user.id },
    { headers: response?.headers }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, response } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const usuarioId = String(formData.get("usuarioId") || "");
  const currentUserId = user.id;

  const retornarErro = (message: string, status = 400) =>
    data({ error: message }, { status, headers: response?.headers });

  try {
    if (intent === "criar") {
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const senha = String(formData.get("senha") || "");
      const nome = String(formData.get("nome") || "").trim();
      const role = String(formData.get("role") || "usuario");

      if (!email || !validarEmail(email)) return retornarErro("Informe um e-mail válido.");
      if (senha.length < 6) return retornarErro("A senha deve ter pelo menos 6 caracteres.");
      if (!nome) return retornarErro("Informe o nome do usuário.");
      if (role !== "admin" && role !== "usuario") return retornarErro("Cargo inválido.");

      const usuario = await SupabaseAdminService.criarUsuario({ email, senha, nome, role });
      return data(
        { success: true, mensagem: `Usuário "${usuario.email}" criado com sucesso.` },
        { headers: response?.headers }
      );
    }

    if (!usuarioId) return retornarErro("Usuário não informado.");

    if (intent === "editar") {
      const nome = String(formData.get("nome") || "").trim();
      const role = String(formData.get("role") || "");
      const novaSenha = String(formData.get("novaSenha") || "");
      if (!nome) return retornarErro("Informe o nome do usuário.");
      if (role !== "admin" && role !== "usuario") return retornarErro("Cargo inválido.");
      if (novaSenha && novaSenha.length < 6) return retornarErro("A senha deve ter pelo menos 6 caracteres.");
      if (usuarioId === currentUserId && role !== "admin") {
        return retornarErro("Você não pode rebaixar o próprio cargo.");
      }

      const totalAdmins = await SupabaseAdminService.contarAdmins();
      if (totalAdmins <= 1 && role !== "admin") {
        return retornarErro("Não é possível rebaixar o último administrador do sistema.");
      }

      await SupabaseAdminService.renomear(usuarioId, nome);
      await SupabaseAdminService.atualizarCargo(usuarioId, role);
      if (novaSenha) await SupabaseAdminService.redefinirSenha(usuarioId, novaSenha);
      return data(
        { success: true, mensagem: `Usuário atualizado com cargo de ${role === "admin" ? "Administrador" : "Usuário"}.` },
        { headers: response?.headers }
      );
    }

    if (intent === "bloquear") {
      if (usuarioId === currentUserId) {
        return retornarErro("Você não pode bloquear o próprio acesso.");
      }

      await SupabaseAdminService.bloquear(usuarioId);
      return data(
        { success: true, mensagem: "Usuário bloqueado com sucesso." },
        { headers: response?.headers }
      );
    }

    if (intent === "ativar") {
      await SupabaseAdminService.ativar(usuarioId);
      return data(
        { success: true, mensagem: "Usuário ativado com sucesso." },
        { headers: response?.headers }
      );
    }

    if (intent === "excluir") {
      if (usuarioId === currentUserId) {
        return retornarErro("Você não pode excluir a própria conta.");
      }

      const totalAdmins = await SupabaseAdminService.contarAdmins();
      if (totalAdmins <= 1) {
        return retornarErro("Não é possível excluir o último administrador do sistema.");
      }

      await SupabaseAdminService.excluir(usuarioId);
      return data(
        { success: true, mensagem: "Usuário excluído com sucesso." },
        { headers: response?.headers }
      );
    }

    return retornarErro("Ação inválida.");
  } catch (err) {
    return retornarErro(traduzirErroSupabase(err));
  }
}

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Erro na Gestão de Usuários" />;
}

export default function AdminUsuariosPage() {
  return <UsuariosView />;
}