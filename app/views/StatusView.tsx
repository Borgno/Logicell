import { ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, Info, ListChecks, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useUI } from "~/hooks/use-ui";
import { api, errorMessage } from "~/lib/api";
import { queryClient, queryKeys, useStatus, type StatusItem } from "~/lib/query";
import { Skeleton } from "~/components/Skeleton";

export function StatusView() {
  const { data, isFetching } = useStatus();
  const { confirm, alert: showAlert } = useUI();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<{ id: number; nomeAntigo: string; nome: string } | null>(null);

  const lista = data?.status || [];
  const ativos = lista.filter((s) => s.ativo).length;

  //O init carrega as opções ativas usadas pelo editor da grid.
  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.status });
    queryClient.invalidateQueries({ queryKey: queryKeys.init });
  }, []);

  const executar = async (acao: () => Promise<unknown>, sucesso?: { title: string; message: string }) => {
    setCarregando(true);
    setErro(null);
    try {
      await acao();
      invalidar();
      if (sucesso) showAlert({ ...sucesso, variant: "success" });
      return true;
    } catch (err) {
      setErro(errorMessage(err));
      return false;
    } finally {
      setCarregando(false);
    }
  };

  const adicionar = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      setErro("Informe o nome do status.");
      return;
    }
    const ok = await executar(() => api.post("/status", { nome }), {
      title: "Status adicionado",
      message: `"${nome}" já aparece na coluna Status da grid.`,
    });
    if (ok) setNovoNome("");
  };

  const salvarNome = () => {
    if (!editando) return;
    const nome = editando.nome.trim();
    if (!nome || nome === editando.nomeAntigo) {
      setEditando(null);
      return;
    }
    confirm({
      title: "Renomear status",
      message: `Renomear "${editando.nomeAntigo}" para "${nome}"?\n\nAs operações com o nome antigo passam a usar o novo.`,
      variant: "primary",
      onConfirm: async () => {
        const ok = await executar(() => api.patch(`/status/${editando.id}`, { nome }), {
          title: "Status renomeado",
          message: `"${editando.nomeAntigo}" agora é "${nome}".`,
        });
        if (ok) setEditando(null);
      },
    });
  };

  const alternarAtivo = (s: StatusItem) => {
    executar(() => api.patch(`/status/${s.id}`, { ativo: !s.ativo }));
  };

  const mover = (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= lista.length) return;
    const ids = lista.map((s) => s.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    executar(() => api.put("/status/ordem", { ids }));
  };

  const excluir = (s: StatusItem) => {
    confirm({
      title: "Excluir status",
      message: `Excluir o status "${s.nome}"?\n\nSó é possível quando nenhuma operação o usa. Se estiver em uso, desative.`,
      variant: "danger",
      onConfirm: () =>
        executar(() => api.del(`/status/${s.id}`), {
          title: "Status excluído",
          message: `"${s.nome}" foi removido da lista.`,
        }),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-text overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="max-w-[900px] mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-text tracking-tight">Status</h1>
          <p className="text-xs font-medium text-text-muted mt-1">Opções disponíveis na coluna Status das operações</p>
        </div>

        <div className="flex items-start gap-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl p-4 text-xs font-medium leading-relaxed">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            A coluna Status da grid só aceita os status <strong>ativos</strong> desta lista, na ordem abaixo. Desativar
            tira a opção da grid sem mexer nas operações que já a usam. Renomear atualiza essas operações também. Status
            fora da lista (texto livre antigo ou opção desativada) aparece em roxo na grid até ser trocado.
          </p>
        </div>

        <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight text-text">Lista de status</h2>
            <p className="text-[11px] font-medium text-text-muted mt-1">
              {lista.length} status, {ativos} ativo{ativos !== 1 ? "s" : ""}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              adicionar();
            }}
            className="flex gap-2 items-stretch"
          >
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do novo status"
              className="flex-1 h-11 px-3 bg-surface border border-glass-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:font-medium placeholder:text-text-dim transition-all outline-none"
            />
            <button
              type="submit"
              disabled={carregando}
              className="h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0"
            >
              {carregando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.5} />}
              Adicionar
            </button>
          </form>

          {erro && (
            <div className="bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
              {erro}
            </div>
          )}

          {isFetching && lista.length === 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-glass-border rounded-xl">
              <ListChecks size={28} className="text-text-dim mb-3" />
              <p className="text-sm font-bold text-text">Nenhum status cadastrado</p>
              <p className="text-xs text-text-muted max-w-sm mt-1">Sem status na lista, a coluna Status da grid só pode ficar vazia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {lista.map((s, i) => {
                const emEdicao = editando?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className="group flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-light border border-glass-border transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-right text-[11px] font-mono font-bold text-text-dim shrink-0">{i + 1}</span>
                      {emEdicao ? (
                        <input
                          type="text"
                          autoFocus
                          value={editando.nome}
                          onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarNome();
                            if (e.key === "Escape") setEditando(null);
                          }}
                          className="flex-1 h-8 bg-card-bg border border-primary rounded-lg px-2 text-xs font-bold text-text focus:outline-none"
                        />
                      ) : (
                        <span className={`text-sm font-bold truncate ${s.ativo ? "text-text" : "text-text-dim line-through"}`} title={s.nome}>
                          {s.nome}
                        </span>
                      )}
                      {!s.ativo && !emEdicao && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim shrink-0">Inativo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => mover(i, -1)}
                        disabled={carregando || i === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-light disabled:opacity-30 transition-all"
                        title="Subir"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => mover(i, 1)}
                        disabled={carregando || i === lista.length - 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-light disabled:opacity-30 transition-all"
                        title="Descer"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => (emEdicao ? salvarNome() : setEditando({ id: s.id, nomeAntigo: s.nome, nome: s.nome }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                        title={emEdicao ? "Salvar" : "Renomear"}
                      >
                        {emEdicao ? <CheckCircle2 size={15} /> : <Pencil size={14} />}
                      </button>
                      {emEdicao ? (
                        <button
                          onClick={() => setEditando(null)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-light transition-all"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => alternarAtivo(s)}
                          disabled={carregando}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-light disabled:opacity-30 transition-all"
                          title={s.ativo ? "Desativar" : "Ativar"}
                        >
                          {s.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => excluir(s)}
                        disabled={carregando}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-error hover:bg-red-500/10 disabled:opacity-30 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
