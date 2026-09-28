import { Check, ChevronDown, ChevronLeft, ChevronRight, Filter, Plus, Search, Users, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  useDashboard,
  useDashboardFaturista,
  useDashboardOpcoes,
  type DashboardFaturistaGrupo,
  type DashboardFiltros,
  type DashboardGeral,
  type DashboardGrupo,
  type DashboardOpcoes,
} from "~/lib/query";
import { formatarData, formatarMoeda } from "~/utils/formatters";
import { Skeleton } from "~/components/Skeleton";

type ItemBarra = { label: string; valor: number; quantidade: number; cor?: string | null };
type FiltroCampo = keyof DashboardFiltros;
type OnChangeFiltro = (campo: FiltroCampo, valor: string) => void;

// ---------------------------------------------------------------------------
// Blocos reutilizáveis
// ---------------------------------------------------------------------------

function BarList({
  items,
  total,
  vazio,
}: {
  items: ItemBarra[];
  total: number;
  vazio: string;
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);

  if (items.length === 0) {
    return <p className="text-xs font-medium text-text-muted py-6 text-center">{vazio}</p>;
  }

  return (
    <div className="flex flex-col gap-3.5 max-h-[320px] overflow-y-auto pr-1">
      {items.map((item, idx) => {
        const pct = total > 0 ? (item.valor / total) * 100 : 0;
        return (
          <div key={`${item.label}-${idx}`} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold text-text truncate" title={item.label}>
                {item.label}
              </span>
              <span className="text-xs font-mono font-bold text-text shrink-0">
                {formatarMoeda(item.valor)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((item.valor / max) * 100, item.valor > 0 ? 2 : 0)}%`,
                  backgroundColor: item.cor || "var(--primary)",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-text-dim uppercase tracking-widest">
              <span>
                {item.quantidade.toLocaleString("pt-BR")}{" "}
                {item.quantidade === 1 ? "documento" : "documentos"}
              </span>
              <span>{pct.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Skeleton do acordeão da dashboard, mostrado só no primeiro carregamento
// (com keepPreviousData, os polls seguintes mantêm o conteúdo anterior em tela).
function DashboardSkeleton() {
  return (
    <div className="bg-card-bg border border-glass-border rounded-2xl shadow-card overflow-hidden">
      <div className="p-5 border-b border-glass-border">
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="p-5 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}

// Skeleton do detalhe do faturista: 5 MiniStat + 3 cards de distribuição.
function FaturistaDetalheSkeleton() {
  return (
    <div className="px-5 py-5 bg-surface/40">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="bg-card-bg border border-glass-border rounded-xl px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="text-sm font-mono font-bold text-text mt-1 truncate">{valor}</p>
      {sub && <p className="text-[10px] font-bold text-text-dim mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function grupoParaItens(grupos: DashboardGrupo[], fallback: string): ItemBarra[] {
  return grupos.map((g) => ({
    label: String(g.chave ?? "").trim() || fallback,
    valor: g.valor,
    quantidade: g.quantidade,
    cor: null,
  }));
}

function DistribuicaoCard({
  titulo,
  grupos,
  fallback,
  total,
}: {
  titulo: string;
  grupos: DashboardGrupo[];
  fallback: string;
  total: number;
}) {
  return (
    <div className="bg-card-bg border border-glass-border rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted truncate">
          {titulo}
        </p>
      </div>
      <BarList items={grupoParaItens(grupos, fallback)} total={total} vazio="Sem dados." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de filtros globais
// ---------------------------------------------------------------------------

type OpcaoFiltro = { valor: string; label: string };

// Campos oferecidos no menu "+ Filtro". As sentinelas ("sem", "inbox",
// "__vazio__") entram no fim de cada lista, como nos selects antigos.
const CAMPOS_FILTRO: {
  campo: FiltroCampo;
  label: string;
  busca?: boolean;
  opcoes: (o?: DashboardOpcoes) => OpcaoFiltro[];
}[] = [
  {
    campo: "faturistaId",
    label: "Faturista",
    opcoes: (o) => [
      ...(o?.faturistas.map((f) => ({ valor: f.id, label: f.nome })) ?? []),
      { valor: "sem", label: "Sem faturista" },
    ],
  },
  {
    campo: "pastaId",
    label: "Pasta",
    busca: true,
    opcoes: (o) => [
      ...(o?.pastas.map((p) => ({ valor: String(p.id), label: p.nome })) ?? []),
      { valor: "inbox", label: "Caixa de Entrada" },
    ],
  },
  {
    campo: "pagador",
    label: "Cliente",
    busca: true,
    opcoes: (o) => o?.clientes.map((c) => ({ valor: c, label: c })) ?? [],
  },
  {
    campo: "status",
    label: "Status",
    opcoes: (o) => [
      ...(o?.status.map((s) => ({ valor: s, label: s })) ?? []),
      { valor: "__vazio__", label: "Sem status" },
    ],
  },
  {
    campo: "tipoDocumento",
    label: "Tipo",
    opcoes: (o) => [
      ...(o?.tiposDocumento.map((t) => ({ valor: t, label: t })) ?? []),
      { valor: "__vazio__", label: "Não informado" },
    ],
  },
  {
    campo: "tipoCte",
    label: "Tipo de CTe",
    opcoes: (o) => [
      ...(o?.tiposCte.map((t) => ({ valor: t, label: t })) ?? []),
      { valor: "__vazio__", label: "Não informado" },
    ],
  },
  {
    campo: "agencia",
    label: "Agência",
    busca: true,
    opcoes: (o) => [
      ...(o?.agencias.map((a) => ({ valor: a, label: a })) ?? []),
      { valor: "__vazio__", label: "Sem agência" },
    ],
  },
];

// Lista de clientes pode ter milhares de itens: renderiza só os primeiros.
const MAX_OPCOES_VISIVEIS = 200;

function MenuFiltro({
  campoInicial,
  filtros,
  opcoes,
  onEscolher,
  onFechar,
}: {
  campoInicial: FiltroCampo | null;
  filtros: DashboardFiltros;
  opcoes?: DashboardOpcoes;
  onEscolher: (campo: FiltroCampo, valor: string) => void;
  onFechar: () => void;
}) {
  const [campo, setCampo] = useState<FiltroCampo | null>(campoInicial);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const def = CAMPOS_FILTRO.find((c) => c.campo === campo);

  const lista = useMemo(() => {
    if (!def) return [];
    const termo = busca.trim().toLowerCase();
    const todas = def.opcoes(opcoes);
    return termo ? todas.filter((o) => o.label.toLowerCase().includes(termo)) : todas;
  }, [def, opcoes, busca]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-card-bg border border-glass-border rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">
        {!def ? (
          <div className="p-1.5">
            <p className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Filtrar por
            </p>
            {CAMPOS_FILTRO.map((c) => (
              <button
                key={c.campo}
                type="button"
                onClick={() => setCampo(c.campo)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-text hover:bg-surface transition-colors"
              >
                <span>{c.label}</span>
                <span className="flex items-center gap-1.5">
                  {filtros[c.campo] && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  <ChevronRight size={14} className="text-text-muted" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-2 py-2 border-b border-glass-border">
              <button
                type="button"
                onClick={() => {
                  setCampo(null);
                  setBusca("");
                }}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft size={14} />
              </button>
              {def.busca || lista.length > 8 ? (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Search size={13} className="text-text-muted shrink-0" />
                  <input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={`Buscar ${def.label.toLowerCase()}...`}
                    className="flex-1 min-w-0 bg-transparent text-xs font-medium text-text placeholder:text-text-muted outline-none"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  {def.label}
                </span>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5">
              {lista.length === 0 ? (
                <p className="px-2.5 py-4 text-xs text-text-muted text-center">Nada encontrado.</p>
              ) : (
                lista.slice(0, MAX_OPCOES_VISIVEIS).map((o) => {
                  const ativo = filtros[def.campo] === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => onEscolher(def.campo, ativo ? "" : o.valor)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                        ativo ? "bg-badge-primary-bg text-badge-primary-text font-bold" : "text-text font-medium hover:bg-surface"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {ativo && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })
              )}
              {lista.length > MAX_OPCOES_VISIVEIS && (
                <p className="px-2.5 py-2 text-[11px] text-text-muted text-center">
                  Mostrando {MAX_OPCOES_VISIVEIS} de {lista.length}. Refine a busca.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FiltrosBar({
  filtros,
  onChange,
  onLimpar,
  opcoes,
}: {
  filtros: DashboardFiltros;
  onChange: OnChangeFiltro;
  onLimpar: () => void;
  opcoes?: DashboardOpcoes;
}) {
  // null = menu fechado; "novo" = abre na lista de campos; campo = edita o chip.
  const [menu, setMenu] = useState<FiltroCampo | "novo" | null>(null);
  const fecharMenu = useCallback(() => setMenu(null), []);

  const temFiltro = Object.values(filtros).some(Boolean);
  const ativos = CAMPOS_FILTRO.filter((c) => filtros[c.campo]);
  const soAntigas = filtros.antigas === "1";

  const rotuloValor = (def: (typeof CAMPOS_FILTRO)[number], valor: string) =>
    def.opcoes(opcoes).find((o) => o.valor === valor)?.label ?? valor;

  const escolher = (campo: FiltroCampo, valor: string) => {
    onChange(campo, valor);
    setMenu(null);
  };

  return (
    <div className="bg-card-bg border border-glass-border rounded-2xl px-4 py-3 shadow-card flex flex-wrap items-center gap-2">
      {ativos.map((def) => (
        <div key={def.campo} className="relative">
          <div className="flex items-center h-8 rounded-lg bg-badge-primary-bg text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setMenu(def.campo)}
              className="flex items-center gap-1 pl-2.5 pr-1.5 h-full max-w-[260px] hover:opacity-80 transition-opacity"
            >
              <span className="font-medium text-text-muted">{def.label}:</span>
              <span className="font-bold text-badge-primary-text truncate">
                {rotuloValor(def, filtros[def.campo]!)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onChange(def.campo, "")}
              className="h-full px-1.5 text-badge-primary-text opacity-70 hover:opacity-100 transition-opacity"
              aria-label={`Remover filtro ${def.label}`}
            >
              <X size={13} />
            </button>
          </div>
          {menu === def.campo && (
            <MenuFiltro
              campoInicial={def.campo}
              filtros={filtros}
              opcoes={opcoes}
              onEscolher={escolher}
              onFechar={fecharMenu}
            />
          )}
        </div>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenu(menu === "novo" ? null : "novo")}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-glass-border text-xs font-bold text-text-muted hover:text-text hover:border-primary hover:bg-surface transition-all"
        >
          <Filter size={13} strokeWidth={2.5} />
          {ativos.length === 0 ? "Adicionar filtro" : "Filtro"}
          <Plus size={13} strokeWidth={2.5} />
        </button>
        {menu === "novo" && (
          <MenuFiltro
            campoInicial={null}
            filtros={filtros}
            opcoes={opcoes}
            onEscolher={escolher}
            onFechar={fecharMenu}
          />
        )}
      </div>

      {temFiltro && (
        <button
          type="button"
          onClick={onLimpar}
          className="h-8 px-2 text-[11px] font-bold text-text-muted hover:text-badge-error-text transition-colors"
        >
          Limpar
        </button>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={soAntigas}
        onClick={() => onChange("antigas", soAntigas ? "" : "1")}
        className={`ml-auto flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-bold transition-all ${
          soAntigas
            ? "bg-badge-warning-bg border-transparent text-badge-warning-text"
            : "bg-surface border-glass-border text-text-muted hover:text-text"
        }`}
      >
        <span
          className={`relative w-7 h-4 rounded-full transition-colors ${
            soAntigas ? "bg-warning" : "bg-text-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
              soAntigas ? "translate-x-3" : ""
            }`}
          />
        </span>
        Só emissões antigas
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Acordeão "Por faturista"
// ---------------------------------------------------------------------------

const PALETA = ["#0066ff", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#e03048", "#64748b"];

function FaturistaDetalhe({
  faturistaId,
  filtros,
}: {
  faturistaId: string | null;
  filtros: DashboardFiltros;
}) {
  const { data, isLoading, isError, isPlaceholderData } = useDashboardFaturista(faturistaId, filtros, true);

  if (isLoading) {
    return <FaturistaDetalheSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-xs font-bold text-badge-error-text">Não foi possível carregar o faturista.</p>
      </div>
    );
  }

  return (
    // Ao trocar de filtro, os números anteriores ficam em tela (keepPreviousData)
    // com opacidade menor até a resposta chegar. isPlaceholderData (e não
    // isFetching) para o polling em segundo plano não escurecer a tela.
    <div className={`px-5 py-5 bg-surface/40 transition-opacity duration-200 ${isPlaceholderData ? "opacity-60" : ""}`}>
      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">
        Período: {formatarData(data.primeiraEmissao)} → {formatarData(data.ultimaEmissao)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <MiniStat label="Valor total" valor={formatarMoeda(data.valor)} />
        <MiniStat label="Documentos" valor={data.quantidade.toLocaleString("pt-BR")} />
        <MiniStat
          label="Emissões antigas"
          valor={data.emissaoAntigas.toLocaleString("pt-BR")}
          sub={formatarMoeda(data.emissaoAntigasValor)}
        />
        <MiniStat label="Pastas" valor={data.totalPastas.toLocaleString("pt-BR")} />
        <MiniStat
          label="Status vazio"
          valor={String(
            data.porStatus.find((s) => !String(s.chave ?? "").trim())?.quantidade ?? 0
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DistribuicaoCard
          titulo="Status"
          grupos={data.porStatus}
          fallback="Sem status"
          total={data.valor}
        />
        <DistribuicaoCard
          titulo="Tipo de documento"
          grupos={data.porTipoDocumento}
          fallback="Não informado"
          total={data.valor}
        />
        <DistribuicaoCard
          titulo="Agência"
          grupos={data.porAgencia}
          fallback="Sem agência"
          total={data.valor}
        />
        <DistribuicaoCard
          titulo="Tipo de CTe"
          grupos={data.porTipoCte}
          fallback="Não informado"
          total={data.valor}
        />
        <DistribuicaoCard
          titulo="Top clientes (pagador)"
          grupos={data.topPagadores}
          fallback="Não informado"
          total={data.valor}
        />
      </div>

      {data.pastas.length > 0 && (
        <div className="mt-5 bg-card-bg border border-glass-border rounded-xl overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3 border-b border-glass-border">
            Pastas ({data.pastas.length})
          </p>
          <div className="flex flex-col max-h-[320px] overflow-y-auto custom-scrollbar">
            {data.pastas.map((p) => (
              <div
                key={p.pastaId === null ? "inbox" : p.pastaId}
                className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-glass-border last:border-b-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.cor || "var(--text-dim)" }}
                  />
                  <span className="text-xs font-bold text-text truncate" title={p.nome}>
                    {p.nome}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                    {p.quantidade.toLocaleString("pt-BR")} docs
                  </span>
                  <span className="text-xs font-mono font-bold text-text">
                    {formatarMoeda(p.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FaturistasAcordeao({
  faturistas,
  filtros,
}: {
  faturistas: DashboardFaturistaGrupo[];
  filtros: DashboardFiltros;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const total = faturistas.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="bg-card-bg border border-glass-border rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-glass-border">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-primary" strokeWidth={2.5} />
          <h2 className="text-sm font-bold text-text">Por faturista</h2>
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
            {faturistas.length} {faturistas.length === 1 ? "faturista" : "faturistas"}
          </span>
        </div>
      </div>

      {faturistas.length === 0 ? (
        <p className="text-xs font-medium text-text-muted py-8 text-center">
          Nenhum faturista com documentos.
        </p>
      ) : (
        <div>
          {faturistas.map((f, idx) => {
            const chave = f.faturistaId ?? "sem";
            const estaAberto = aberto === chave;
            const pct = total > 0 ? (f.valor / total) * 100 : 0;
            const cor = PALETA[idx % PALETA.length];
            return (
              <Fragment key={chave}>
                <button
                  type="button"
                  onClick={() => setAberto(estaAberto ? null : chave)}
                  className={`w-full flex items-center gap-4 px-5 py-4 border-t border-glass-border text-left transition-colors ${
                    estaAberto ? "bg-surface-light" : "hover:bg-surface"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cor }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-text truncate">
                      {String(f.chave ?? "").trim() || "Sem faturista"}
                    </span>
                    <span className="block text-[10px] font-bold text-text-dim uppercase tracking-widest mt-0.5">
                      {f.quantidade.toLocaleString("pt-BR")} documentos
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-xs font-mono font-bold text-text">
                      {formatarMoeda(f.valor)}
                    </span>
                    <span className="block text-[10px] font-bold text-text-dim">
                      {pct.toFixed(1)}%
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-text-muted shrink-0 transition-transform ${
                      estaAberto ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {estaAberto && (
                  <div className="border-t border-glass-border">
                    <FaturistaDetalhe
                      faturistaId={f.faturistaId}
                      filtros={filtros}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo principal — acordeão por faturista (drill-down detalhado)
// ---------------------------------------------------------------------------

function GeralConteudo({
  geral,
  filtros,
}: {
  geral: DashboardGeral;
  filtros: DashboardFiltros;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FaturistasAcordeao faturistas={geral.porFaturista} filtros={filtros} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function DashboardView() {
  const [filtros, setFiltros] = useState<DashboardFiltros>({});

  const { data, isLoading, isError, isPlaceholderData } = useDashboard(filtros);
  const { data: opcoes } = useDashboardOpcoes();

  const geral = data?.geral;

  const setFiltro = (campo: FiltroCampo, valor: string) => {
    setFiltros((f) => {
      const novo = { ...f };
      if (valor) novo[campo] = valor;
      else delete novo[campo];
      return novo;
    });
  };

  const limparFiltros = () => setFiltros({});

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-text overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text tracking-tight">Dashboard</h1>
            <p className="text-xs font-medium text-text-muted mt-1">
              Visão geral das pastas e documentos
            </p>
          </div>
        </div>

        <FiltrosBar
          filtros={filtros}
          onChange={setFiltro}
          onLimpar={limparFiltros}
          opcoes={opcoes}
        />

        {isError ? (
          <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-card">
            <p className="text-sm font-medium text-badge-error-text text-center py-8">
              Não foi possível carregar a dashboard.
            </p>
          </div>
        ) : isLoading || !geral ? (
          <DashboardSkeleton />
        ) : (
          // keepPreviousData mantém os números do filtro anterior em tela; a
          // opacidade cai um pouco só enquanto eles são placeholder (troca de
          // filtro), não no polling em segundo plano.
          <div className={`transition-opacity duration-200 ${isPlaceholderData ? "opacity-60" : ""}`}>
            <GeralConteudo geral={geral} filtros={filtros} />
          </div>
        )}
      </div>
    </div>
  );
}
