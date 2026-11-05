import { CheckCircle2, ChevronDown, Clock3, Folder, Info, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "~/hooks/use-ui";
import { api, errorMessage } from "~/lib/api";
import { queryClient, queryKeys, usePrazos, type PrazoPastaItem } from "~/lib/query";
import { Skeleton } from "~/components/Skeleton";
import { normalizarBusca } from "~/utils/formatters";

const rotuloDias = (dias: number) => `${dias} dia${dias !== 1 ? "s" : ""}`;

// Lista de pastas com busca, no mesmo visual do menu "Mover para". Pasta que já tem
// prazo aparece com os dias e não pode ser escolhida: ela é editada na lista abaixo.
function PastaSelect({ pastas, valor, desabilitado, onChange }: {
  pastas: PrazoPastaItem[];
  valor: string;
  desabilitado: boolean;
  onChange: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) fechar();
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const opcoes = useMemo(() => {
    const query = normalizarBusca(busca.trim());
    if (!query) return pastas;
    return pastas.filter((p) => normalizarBusca(p.nome).includes(query));
  }, [pastas, busca]);

  const selecionada = pastas.find((p) => String(p.id) === valor);

  const fechar = () => {
    setAberto(false);
    setBusca("");
  };

  const escolher = (p: PrazoPastaItem) => {
    onChange(String(p.id));
    fechar();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      fechar();
    } else if (e.key === "Enter") {
      // Sem isso o Enter da busca enviaria o formulário.
      e.preventDefault();
      const primeira = opcoes.find((p) => p.prazoDias === null);
      if (primeira) escolher(primeira);
    }
  };

  return (
    <div ref={raiz} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => (aberto ? fechar() : setAberto(true))}
        className="w-full h-11 pl-9 pr-9 bg-surface border border-glass-border rounded-xl text-left text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none disabled:opacity-60"
      >
        <Folder size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <span className={`block truncate ${selecionada ? "text-text" : "font-medium text-text-dim"}`}>
          {selecionada?.nome || "Selecione a pasta"}
        </span>
        <ChevronDown
          size={15}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-text-dim transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-lg bg-card-bg border border-glass-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-3 py-2 text-[11px] font-bold text-text-muted border-b border-glass-border uppercase tracking-widest">
            Escolha a pasta:
          </div>
          <div className="p-2 border-b border-glass-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar pasta..."
                className="w-full bg-card-bg dark:bg-bg rounded-lg pl-7 pr-7 py-1.5 text-xs font-bold outline-none border border-[rgba(0,0,0,0.12)] dark:border-glass-border focus:border-primary text-text placeholder:text-text-dim transition-colors"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors"
                  title="Limpar busca"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {opcoes.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.prazoDias !== null}
                onClick={() => escolher(p)}
                className="w-full flex items-center justify-between gap-3 text-left px-4 py-2 hover:bg-surface-light text-sm font-medium text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className="min-w-0 whitespace-normal break-words">{p.nome}</span>
                {p.prazoDias !== null && (
                  <span className="inline-flex items-center gap-1 bg-badge-warning-bg text-badge-warning-text border border-amber-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                    <Clock3 size={11} />
                    {rotuloDias(p.prazoDias)}
                  </span>
                )}
              </button>
            ))}
            {opcoes.length === 0 && <p className="px-4 py-2 text-xs text-text-muted">Nenhuma pasta encontrada</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function PrazosView() {
  const { data, isFetching } = usePrazos();
  const { confirm, alert: showAlert } = useUI();

  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [padraoDias, setPadraoDias] = useState(10);
  const [padraoDirty, setPadraoDirty] = useState(false);
  const [salvandoPadrao, setSalvandoPadrao] = useState(false);

  const [novaPastaId, setNovaPastaId] = useState("");
  const [novoDias, setNovoDias] = useState("");
  const [editando, setEditando] = useState<{ id: number; nome: string; dias: string } | null>(null);

  useEffect(() => {
    if (data?.padrao != null) setPadraoDias(data.padrao);
  }, [data?.padrao]);

  const pastas = data?.pastas || [];
  const excecoes = useMemo(() => (data?.pastas || []).filter((p) => p.prazoDias !== null), [data?.pastas]);

  const excecoesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return excecoes;
    return excecoes.filter((p) => p.nome.toLowerCase().includes(q));
  }, [excecoes, busca]);

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

  const validarDias = (valor: string): number | null => {
    const n = Number(valor);
    return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : null;
  };

  const adicionarPasta = async () => {
    const dias = validarDias(novoDias);
    if (!novaPastaId || dias === null) {
      setErro("Escolha a pasta e um prazo válido (1 a 3650 dias).");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      await api.put(`/prazos/pastas/${novaPastaId}`, { prazoDias: dias });
      setNovaPastaId("");
      setNovoDias("");
      invalidar();
      showAlert({ title: "Prazo adicionado", message: "Prazo configurado para a pasta.", variant: "success" });
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
      await api.put(`/prazos/pastas/${editando.id}`, { prazoDias: dias });
      setEditando(null);
      invalidar();
      showAlert({ title: "Prazo atualizado", message: `Prazo de "${editando.nome}" alterado.`, variant: "success" });
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setCarregando(false);
    }
  };

  const excluirPasta = (p: { id: number; nome: string }) => {
    confirm({
      title: "Remover prazo da pasta",
      message: `Remover a exceção de prazo da pasta\n"${p.nome}"?\n\nEla voltará a usar o prazo padrão global.`,
      variant: "danger",
      onConfirm: async () => {
        setCarregando(true);
        setErro(null);
        try {
          await api.del(`/prazos/pastas/${p.id}`);
          invalidar();
          showAlert({ title: "Prazo removido", message: `A pasta "${p.nome}" voltou a usar o prazo padrão.`, variant: "success" });
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
            Entrada) na barra lateral. Pastas sem exceção abaixo usam o prazo padrão global.
          </p>
        </div>

        <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-text">Prazo padrão global</h2>
              <p className="text-[11px] font-medium text-text-muted mt-1">
                Aplicado à Caixa de Entrada e às pastas sem exceção cadastrada abaixo.
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
              <h2 className="text-sm font-bold uppercase tracking-tight text-text">Prazos por pasta</h2>
              <p className="text-[11px] font-medium text-text-muted mt-1">
                {excecoes.length} pasta{excecoes.length !== 1 ? "s" : ""} com exceção cadastrada
              </p>
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar pastas..."
                className="w-full h-10 pl-9 pr-3 bg-surface border border-glass-border rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text placeholder:font-medium placeholder:text-text-dim transition-all outline-none"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editando ? salvarEdicao() : adicionarPasta();
            }}
            className="flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <PastaSelect
              pastas={pastas}
              valor={editando ? String(editando.id) : novaPastaId}
              desabilitado={!!editando}
              onChange={setNovaPastaId}
            />
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

          {isFetching && pastas.length === 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : excecoesFiltradas.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-glass-border rounded-xl">
              <Clock3 size={28} className="text-text-dim mb-3" />
              <p className="text-sm font-bold text-text">Nenhuma pasta com exceção</p>
              <p className="text-xs text-text-muted max-w-sm mt-1">
                Adicione pastas que precisam de um prazo diferente do padrão global ({rotuloDias(data?.padrao ?? 10)}).
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {excecoesFiltradas.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-light border border-glass-border transition-all"
                >
                  <span className="text-sm font-bold truncate text-text" title={p.nome}>
                    {p.nome}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    {editando?.id === p.id ? (
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
                        até {rotuloDias(p.prazoDias ?? 0)}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        editando?.id === p.id ? salvarEdicao() : setEditando({ id: p.id, nome: p.nome, dias: String(p.prazoDias) })
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                      title={editando?.id === p.id ? "Salvar" : "Editar prazo"}
                    >
                      {editando?.id === p.id ? <CheckCircle2 size={15} /> : <Pencil size={14} />}
                    </button>
                    <button
                      onClick={() => excluirPasta(p)}
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
