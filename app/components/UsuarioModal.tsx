import { Loader2, Pencil, UserPlus, X } from "lucide-react";
import { useState } from "react";

export type UsuarioModalMode = "criar" | "editar";

interface UsuarioModalProps {
  mode: UsuarioModalMode;
  usuario?: any;
  carregando: boolean;
  erro?: string | null;
  onSubmit: (dados: Record<string, string>) => void;
  onClose: () => void;
}

const MODAL_CONFIG: Record<UsuarioModalMode, { titulo: string; subtitulo: string; icone: any }> = {
  criar: { titulo: "Novo Usuário", subtitulo: "Crie o acesso para um novo colaborador", icone: UserPlus },
  editar: { titulo: "Editar Usuário", subtitulo: "Atualize nome, cargo e senha do usuário", icone: Pencil },
};

export function UsuarioModal({ mode, usuario, carregando, erro, onSubmit, onClose }: UsuarioModalProps) {
  const [nome, setNome] = useState(usuario?.nome || "");
  const [email, setEmail] = useState(usuario?.email || "");
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [role, setRole] = useState<"admin" | "usuario">(usuario?.role === "admin" ? "admin" : "usuario");

  const config = MODAL_CONFIG[mode];
  const Icon = config.icone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "criar") onSubmit({ nome, email, senha, role });
    else onSubmit({ nome, role, novaSenha });
  };

  const inputCls =
    "w-full h-11 bg-surface border border-glass-border rounded-xl px-4 text-sm font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:font-medium placeholder:text-text-dim transition-all outline-none";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={carregando ? undefined : onClose}
    >
      <div
        className="bg-card-bg w-full max-w-md rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-glass-border animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 pb-5 border-b border-glass-border bg-surface shrink-0">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text tracking-tight mb-0.5">{config.titulo}</h2>
                <p className="text-xs font-medium text-text-muted">{config.subtitulo}</p>
              </div>
            </div>
            <button
              className="text-text-muted hover:text-text bg-surface-light hover:bg-glass-border p-2 rounded-lg transition-colors border border-transparent"
              onClick={onClose}
              disabled={carregando}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-card-bg overflow-y-auto custom-scrollbar">
          {(mode === "criar" || mode === "editar") && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className={inputCls}
                disabled={carregando}
                autoFocus
                required
              />
            </div>
          )}

          {mode === "criar" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  className={inputCls}
                  disabled={carregando}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputCls}
                  disabled={carregando}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {mode === "editar" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Nova Senha <span className="normal-case font-medium text-text-dim">(opcional)</span>
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Deixe em branco para manter a atual"
                className={inputCls}
                disabled={carregando}
              />
              <p className="text-[11px] font-medium text-text-muted">
                O usuário precisará usar a nova senha no próximo login.
              </p>
            </div>
          )}

          {(mode === "criar" || mode === "editar") && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cargo</label>
              <div className="flex bg-surface p-1 rounded-xl border border-glass-border h-11 items-center self-start">
                <button
                  type="button"
                  onClick={() => setRole("usuario")}
                  disabled={carregando}
                  className={`px-4 h-full flex items-center justify-center text-sm font-bold rounded-lg transition-all ${role === "usuario" ? "bg-card-bg text-text shadow-sm border border-glass-border" : "text-text-muted hover:text-text border border-transparent"}`}
                >
                  Usuário
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  disabled={carregando}
                  className={`px-4 h-full flex items-center justify-center text-sm font-bold rounded-lg transition-all ${role === "admin" ? "bg-card-bg text-text shadow-sm border border-glass-border" : "text-text-muted hover:text-text border border-transparent"}`}
                >
                  Administrador
                </button>
              </div>
            </div>
          )}

          {erro && (
            <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {carregando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Icon size={18} strokeWidth={2.5} />
                {mode === "criar" ? "Criar Usuário" : "Salvar Alterações"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}