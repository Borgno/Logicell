import { Ban, Pencil, ShieldCheck, Trash2, Users } from "lucide-react";
import { formatarData } from "~/utils/formatters";

interface UsuariosTableProps {
  usuarios: any[];
  currentUserId: string;
  carregando: boolean;
  onEditar: (u: any) => void;
  onBloquear: (u: any) => void;
  onAtivar: (u: any) => void;
  onExcluir: (u: any) => void;
}

const acaoBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0 border border-transparent";

export function UsuariosTable({
  usuarios,
  currentUserId,
  carregando,
  onEditar,
  onBloquear,
  onAtivar,
  onExcluir,
}: UsuariosTableProps) {
  if (usuarios.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center bg-card-bg border border-glass-border rounded-2xl">
        <Users size={48} className="text-text-dim mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-text mb-2">Nenhum usuário encontrado</h3>
        <p className="text-text-muted max-w-md">Ajuste a busca ou crie um novo usuário para começar.</p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg border border-glass-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-glass-border bg-surface">
              {["Usuário", "E-mail", "Cargo", "Status", "Criado em", "Ações"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u: any) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className="border-b border-glass-border last:border-0 hover:bg-surface-light/60 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isSelf ? "bg-primary/10 text-primary" : "bg-surface text-text-muted border border-glass-border"
                        }`}
                      >
                        {(u.nome || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text whitespace-nowrap">
                          {u.nome || "—"}
                          {isSelf && (
                            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-primary">Você</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-text-muted whitespace-nowrap">{u.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap ${
                        u.role === "admin"
                          ? "bg-badge-primary-bg text-badge-primary-text"
                          : "bg-surface text-text-muted border border-glass-border"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap ${
                        u.bloqueado
                          ? "bg-badge-error-bg text-badge-error-text"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {u.bloqueado ? "Bloqueado" : "Ativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-text-muted whitespace-nowrap">
                      {formatarData(u.criadoEm)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        className={`${acaoBtnCls} text-text-muted hover:text-primary hover:bg-primary/10`}
                        title="Editar nome, cargo e senha"
                        onClick={() => onEditar(u)}
                        disabled={carregando}
                      >
                        <Pencil size={15} />
                      </button>
                      {u.bloqueado ? (
                        <button
                          className={`${acaoBtnCls} text-text-muted hover:text-emerald-600 hover:bg-emerald-500/10`}
                          title="Ativar usuário"
                          onClick={() => onAtivar(u)}
                          disabled={carregando || isSelf}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      ) : (
                        <button
                          className={`${acaoBtnCls} text-text-muted hover:text-warning hover:bg-warning/10`}
                          title={isSelf ? "Você não pode bloquear o próprio acesso" : "Bloquear usuário"}
                          onClick={() => onBloquear(u)}
                          disabled={carregando || isSelf}
                        >
                          <Ban size={15} />
                        </button>
                      )}
                      <button
                        className={`${acaoBtnCls} text-text-muted hover:text-error hover:bg-error/10`}
                        title={isSelf ? "Você não pode excluir a própria conta" : "Excluir usuário"}
                        onClick={() => onExcluir(u)}
                        disabled={carregando || isSelf}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}