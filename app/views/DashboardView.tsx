import { ChevronDown, Filter, Users, X } from "lucide-react";
import { Fragment, useState } from "react";
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

const SELECT_CLS =
  "h-9 flex-1 min-w-[140px] max-w-[220px] bg-surface border border-glass-border rounded-lg px-3 text-xs font-bold text-text outline-none focus:border-primary cursor-pointer";

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
  const temFiltro = Object.values(filtros).some(Boolean);

  return (
    <div className="bg-card-bg border border-glass-border rounded-2xl p-4 shadow-card flex flex-wrap xl:flex-nowrap items-center gap-3">
      <div className="flex items-center gap-2 text-text-muted shrink-0">
        <Filter size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
      </div>

      <select
        value={filtros.faturistaId ?? ""}
        onChange={(e) => onChange("faturistaId", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todos os faturistas</option>
        {opcoes?.faturistas.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
        <option value="sem">Sem faturista</option>
      </select>

      <select
        value={filtros.pastaId ?? ""}
        onChange={(e) => onChange("pastaId", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todas as pastas</option>
        {opcoes?.pastas.map((p) => (
          <option key={p.id} value={String(p.id)}>
            {p.nome}
          </option>
        ))}
        <option value="inbox">Caixa de Entrada</option>
      </select>

      <select
        value={filtros.pagador ?? ""}
        onChange={(e) => onChange("pagador", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todos os clientes</option>
        {opcoes?.clientes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filtros.status ?? ""}
        onChange={(e) => onChange("status", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todos os status</option>
        {opcoes?.status.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        <option value="__vazio__">Sem status</option>
      </select>

      <select
        value={filtros.tipoDocumento ?? ""}
        onChange={(e) => onChange("tipoDocumento", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todos os tipos</option>
        {opcoes?.tiposDocumento.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value="__vazio__">Não informado</option>
      </select>

      <select
        value={filtros.tipoCte ?? ""}
        onChange={(e) => onChange("tipoCte", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todos os tipos de CTe</option>
        {opcoes?.tiposCte.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value="__vazio__">Não informado</option>
      </select>

      <select
        value={filtros.agencia ?? ""}
        onChange={(e) => onChange("agencia", e.target.value)}
        className={SELECT_CLS}
      >
        <option value="">Todas as agências</option>
        {opcoes?.agencias.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
        <option value="__vazio__">Sem agência</option>
      </select>

      {temFiltro && (
        <button
          type="button"
          onClick={onLimpar}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-glass-border text-[11px] font-bold text-text-muted hover:text-badge-error-text hover:border-badge-error-text/40 transition-all shrink-0"
        >
          <X size={13} />
          Limpar filtros
        </button>
      )}
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
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">
          Carregando faturista...
        </p>
      </div>
    );
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
          <div className="bg-card-bg border border-glass-border rounded-2xl p-6 shadow-card">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest text-center py-10 animate-pulse">
              Carregando...
            </p>
          </div>
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
