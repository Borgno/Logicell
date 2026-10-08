import { ChevronLeft, ChevronRight, Loader2, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useUI } from "~/hooks/use-ui";
import { UsuariosTable } from "~/components/UsuariosTable";
import { UsuarioModal, UsuarioModalMode } from "~/components/UsuarioModal";
import { api, errorMessage } from "~/lib/api";
import { queryClient, queryKeys } from "~/lib/query";

const POR_PAGINA = 200;

export function UsuariosView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, alert: showAlert } = useUI();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const { data, isFetching } = useQuery({
    queryKey: ["usuarios", page],
    queryFn: () => api.get<{ usuarios: any[]; total: number; page: number; currentUserId: string }>(`/usuarios?page=${page}`),
  });
  const usuarios = data?.usuarios || [];
  const total = data?.total || 0;
  const currentUserId = data?.currentUserId || "";

  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<{ mode: UsuarioModalMode; usuario?: any } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u: any) =>
        (u.email || "").toLowerCase().includes(q) || (u.nome || "").toLowerCase().includes(q)
    );
  }, [usuarios, busca]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const executar = async (fn: () => Promise<any>, fecharModal = false) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fn();
      if (res?.mensagem) {
        showAlert({ title: "Sucesso", message: res.mensagem, variant: "success" });
      }
      if (fecharModal) setModal(null);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.faturistas });
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setCarregando(false);
    }
  };

  const enviar = (intent: string, dados: Record<string, string>) => {
    const fecharModal = intent === "criar" || intent === "editar";
    return executar(async () => {
      if (intent === "criar") {
        return api.post("/usuarios", {
          email: dados.email,
          senha: dados.senha,
          nome: dados.nome,
          role: dados.role,
          supervisorId: dados.supervisorId,
        });
      }
      if (intent === "editar") {
        return api.patch(`/usuarios/${dados.usuarioId}`, {
          nome: dados.nome,
          role: dados.role,
          supervisorId: dados.supervisorId,
          novaSenha: dados.novaSenha || "",
        });
      }
      if (intent === "bloquear") return api.post(`/usuarios/${dados.usuarioId}/bloquear`);
      if (intent === "ativar") return api.post(`/usuarios/${dados.usuarioId}/ativar`);
      if (intent === "excluir") return api.del(`/usuarios/${dados.usuarioId}`);
      throw new Error("Ação inválida.");
    }, fecharModal);
  };

  const mudarPagina = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  const abrirModal = (mode: UsuarioModalMode, usuario?: any) => {
    setErro(null);
    setModal({ mode, usuario });
  };

  const handleExcluir = (u: any) => {
    confirm({
      title: "Excluir Usuário",
      message: `Tem certeza que deseja excluir permanentemente o usuário\n"${u.email}"?\n\nEsta ação não pode ser desfeita.`,
      variant: "danger",
      onConfirm: () => enviar("excluir", { usuarioId: u.id }),
    });
  };

  const handleBloquear = (u: any) => {
    confirm({
      title: "Bloquear Usuário",
      message: `Bloquear o acesso de "${u.email}"?\n\nO usuário será desconectado e não poderá mais entrar no sistema.`,
      variant: "danger",
      onConfirm: () => enviar("bloquear", { usuarioId: u.id }),
    });
  };

  const handleAtivar = (u: any) => enviar("ativar", { usuarioId: u.id });

  const handleModalSubmit = (dados: Record<string, string>) => {
    if (!modal) return;
    if (modal.mode === "criar") {
      enviar("criar", dados);
    } else {
      enviar("editar", { usuarioId: modal.usuario.id, ...dados });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-text overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text tracking-tight">Gestão de Usuários</h1>
            <p className="text-xs font-medium text-text-muted mt-1">Administre acessos e cargos da plataforma</p>
          </div>
          <button
            onClick={() => abrirModal("criar")}
            disabled={carregando}
            className="h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl px-5 font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
          >
            {carregando ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} strokeWidth={2.5} />}
            Novo Usuário
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
            <Users size={16} />
            {total} usuário{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full h-10 pl-9 pr-3 bg-surface border border-glass-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:font-medium placeholder:text-text-dim transition-all outline-none"
            />
          </div>
        </div>

        {erro && !modal && (
          <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
            {erro}
          </div>
        )}

        <UsuariosTable
          usuarios={usuariosFiltrados}
          currentUserId={currentUserId}
          carregando={carregando || isFetching}
          onEditar={(u) => abrirModal("editar", u)}
          onBloquear={handleBloquear}
          onAtivar={handleAtivar}
          onExcluir={handleExcluir}
        />

        {total > POR_PAGINA && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">
              Página {page} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => mudarPagina(page - 1)}
                disabled={page <= 1 || carregando}
                className="h-9 px-3 bg-surface border border-glass-border rounded-lg text-xs font-bold text-text-muted hover:text-text hover:bg-surface-light disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <ChevronLeft size={15} />
                Anterior
              </button>
              <button
                onClick={() => mudarPagina(page + 1)}
                disabled={page >= totalPaginas || carregando}
                className="h-9 px-3 bg-surface border border-glass-border rounded-lg text-xs font-bold text-text-muted hover:text-text hover:bg-surface-light disabled:opacity-40 transition-all flex items-center gap-1"
              >
                Próxima
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <UsuarioModal
          mode={modal.mode}
          usuario={modal.usuario}
          carregando={carregando}
          erro={erro}
          onSubmit={handleModalSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
