import { CheckCircle2, Clock3, Info, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUI } from "~/hooks/use-ui";
import { api, errorMessage } from "~/lib/api";
import { queryClient, queryKeys, usePrazos } from "~/lib/query";
import { Skeleton } from "~/components/Skeleton";

export function PrazosView() {
  const { data, isFetching } = usePrazos();
  const { confirm, alert: showAlert } = useUI();

  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [padraoDias, setPadraoDias] = useState(10);
  const [padraoDirty, setPadraoDirty] = useState(false);
  const [salvandoPadrao, setSalvandoPadrao] = useState(false);

  const [novoCliente, setNovoCliente] = useState("");
  const [novoDias, setNovoDias] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [editando, setEditando] = useState<{ id: number; cliente: string; dias: string } | null>(null);

  useEffect(() => {
    if (data?.padrao != null) setPadraoDias(data.padrao);
  }, [data?.padrao]);

  const clientes = data?.clientes || [];

  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.cliente.toLowerCase().includes(q));
  }, [clientes, busca]);

  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.prazos });
    queryClient.invalidateQueries({ queryKey: queryKeys.init });
  }, []);

  const salvarPadrao = async () => {
    if (salvandoPadrao) return;
    setSalvandoPadrao(true);
    setErro(null);
    try {
      await api.put("/prazos/padrao", { prazoDias: padraoDias });
      setPadraoDirty(false);
      invalidar();
      showAlert({ title: "Prazo salvo", message: "Prazo padrão de emissão atualizado.", variant: "success" });
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setSalvandoPadrao(false);
    }
  };

  const buscarSugestoes = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSugestoes([]);
      return;
    }
    try {
      const res = await api.get<{ clientes: string[] }>(`/prazos/clientes/sugestoes?q=${encodeURIComponent(q)}`);
      setSugestoes(res.clientes || []);
    } catch {
      setSugestoes([]);
    }
  }, []);

  useEffect(() => {
    if (editando || novoCliente.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(() => buscarSugestoes(novoCliente), 300);
    return () => clearTimeout(t);
  }, [novoCliente, editando, buscarSugestoes]);

  const validarDias = (valor: string): number | null => {
    const n = Number(valor);
    return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : null;
  };

  const adicionarCliente = async () => {
    const dias = validarDias(novoDias);
    if (!novoCliente.trim() || dias === null) {
      setErro("Informe o cliente e um prazo válido (1 a 3650 dias).");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      await api.post("/prazos/clientes", { cliente: novoCliente.trim(), prazoDias: dias });
      setNovoCliente("");
      setNovoDias("");
      invalidar();
      showAlert({ title: "Prazo adicionado", message: `Prazo configurado para o cliente.`, variant: "success" });
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setCarregando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    const dias = validarDias(editando.dias);
    if (dias === null) {
      setErro("Informe um prazo válido (1 a 3650 dias).");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      await api.patch(`/prazos/clientes/${editando.id}`, { prazoDias: dias });
      setEditando(null);
      invalidar();
      showAlert({ title: "Prazo atualizado", message: `Prazo de "${editando.cliente}" alterado.`, variant: "success" });
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setCarregando(false);
    }
  };

  const excluirCliente = (c: { id: number; cliente: string }) => {
    confirm({
      title: "Remover prazo do cliente",
      message: `Remover a exceção de prazo do cliente\n"${c.cliente}"?\n\nEle voltará a usar o prazo padrão global.`,
      variant: "danger",
      onConfirm: async () => {
        setCarregando(true);
        setErro(null);
        try {
          await api.del(`/prazos/clientes/${c.id}`);
          invalidar();
          showAlert({ title: "Prazo removido", message: `O cliente "${c.cliente}" voltou a usar o prazo padrão.`, variant: "success" });
        } catch (err) {
          setErro(errorMessage(err));
        } finally {
          setCarregando(false);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold uppercase tracking-tight text-text">Prazos de Emissão</h2>
        <p className="text-xs font-medium text-text-muted">
          Define quando uma operação passa a ser considerada "emissão antiga"
        </p>
      </div>

        <div className="flex items-start gap-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl p-4 text-xs font-medium leading-relaxed">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            Operações com data de emissão <strong>mais antiga que o prazo</strong> são sinalizadas como antigas: a
            coluna Emissão fica destacada em vermelho e o contador âmbar aparece ao lado de cada pasta (e da Caixa de
            Entrada) na barra lateral. Clientes sem exceção abaixo usam o prazo padrão global.
          </p>
        </div>

        <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-text">Prazo padrão global</h2>
              <p className="text-[11px] font-medium text-text-muted mt-1">
                Aplicado a todos os clientes sem exceção cadastrada abaixo.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Dias</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={padraoDias}
                  onChange={(e) => {
                    setPadraoDias(Number(e.target.value));
                    setPadraoDirty(true);
                  }}
                  className="w-28 h-10 bg-surface border border-glass-border rounded-xl px-3 text-sm font-mono font-bold text-text focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </label>
              <button
                onClick={salvarPadrao}
                disabled={!padraoDirty || salvandoPadrao}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                {salvandoPadrao ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-text">Prazos por cliente</h2>
              <p className="text-[11px] font-medium text-text-muted mt-1">
                {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} com exceção cadastrada
              </p>
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar clientes..."
                className="w-full h-10 pl-9 pr-3 bg-surface border border-glass-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:font-medium placeholder:text-text-dim transition-all outline-none"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editando ? salvarEdicao() : adicionarCliente();
            }}
            className="flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                list="clientes-sugestoes"
                value={editando ? editando.cliente : novoCliente}
                disabled={!!editando}
                onChange={(e) => setNovoCliente(e.target.value)}
                placeholder="Nome do cliente "
                className="w-full h-11 pl-9 pr-3 bg-surface border border-glass-border rounded-xl text-xs font-bold uppercase focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:normal-case placeholder:font-medium placeholder:text-text-dim transition-all outline-none disabled:opacity-60"
              />
              <datalist id="clientes-sugestoes">
                {sugestoes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={3650}
                value={editando ? editando.dias : novoDias}
                onChange={(e) =>
                  editando ? setEditando({ ...editando, dias: e.target.value }) : setNovoDias(e.target.value)
                }
                placeholder="Dias"
                className="w-24 h-11 bg-surface border border-glass-border rounded-xl px-3 text-sm font-mono font-bold text-text focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              />
              <button
                type="submit"
                disabled={carregando}
                className="h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0"
              >
                {carregando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.5} />}
                {editando ? "Salvar" : "Adicionar"}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="h-11 w-11 rounded-xl bg-surface border border-glass-border text-text-muted hover:text-text hover:bg-surface-light flex items-center justify-center transition-all shrink-0"
                  title="Cancelar edição"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </form>

          {erro && (
            <div className="bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
              {erro}
            </div>
          )}

          {isFetching && clientes.length === 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-glass-border rounded-xl">
              <Clock3 size={28} className="text-text-dim mb-3" />
              <p className="text-sm font-bold text-text">Nenhum cliente com exceção</p>
              <p className="text-xs text-text-muted max-w-sm mt-1">
                Adicione clientes que precisam de um prazo diferente do padrão global (10 dias).
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {clientesFiltrados.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-light border border-glass-border transition-all"
                >
                  <span className="text-sm font-bold truncate text-text" title={c.cliente}>
                    {c.cliente}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    {editando?.id === c.id ? (
                      <input
                        type="number"
                        autoFocus
                        min={1}
                        max={3650}
                        value={editando.dias}
                        onChange={(e) => setEditando({ ...editando, dias: e.target.value })}
                        className="w-20 h-8 bg-card-bg border border-primary rounded-lg px-2 text-xs font-mono font-bold text-text focus:outline-none"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-badge-warning-bg text-badge-warning-text border border-amber-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        <Clock3 size={11} />
                        até {c.prazoDias} dia{c.prazoDias !== 1 ? "s" : ""}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        editando?.id === c.id ? salvarEdicao() : setEditando({ id: c.id, cliente: c.cliente, dias: String(c.prazoDias) })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                      title={editando?.id === c.id ? "Salvar" : "Editar prazo"}
                    >
                      {editando?.id === c.id ? <CheckCircle2 size={15} /> : <Pencil size={14} />}
                    </button>
                    <button
                      onClick={() => excluirCliente(c)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-error hover:bg-red-500/10 transition-all"
                      title="Remover exceção"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
