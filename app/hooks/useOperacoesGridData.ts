import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "~/lib/api";
import { formatarData } from "~/utils/formatters";

function processarDatas(dados: any[]) {
  if (!dados) return [];
  return dados.map((o) => ({
    ...o,
    dt_emissao_: o.dt_emissao_ && !(typeof o.dt_emissao_ === "string" && o.dt_emissao_.includes("/"))
      ? formatarData(o.dt_emissao_)
      : o.dt_emissao_,
    data_status: o.data_status && !(typeof o.data_status === "string" && o.data_status.includes("/"))
      ? formatarData(o.data_status)
      : o.data_status,
    dt_quitacao_saldo: o.dt_quitacao_saldo && !(typeof o.dt_quitacao_saldo === "string" && o.dt_quitacao_saldo.includes("/"))
      ? formatarData(o.dt_quitacao_saldo)
      : o.dt_quitacao_saldo,
  }));
}

export function isFilterEmpty(filter: any) {
  if (!filter) return true;
  if (
    filter.type === "blank" ||
    filter.type === "notBlank" ||
    filter.type === "antigos" ||
    filter.type === "duplicados"
  ) {
    return false;
  }
  if (filter.type === "period") return filter.value.split(";").every((d: string) => !d);
  return filter.value === "";
}

export interface GridMeta {
  total: number;
  totalVl: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_META: GridMeta = { total: 0, totalVl: 0, page: 0, limit: 200, totalPages: 0 };

// Chave de filtros/ordenação: mesma função usada pelo hook (com o estado
// atual) e pelo prefetch (sem filtros), para as duas baterem no mesmo cache —
// era aqui que o bug antigo estava (prefetch usava "{}" na mão).
function computeFiltersKey(columnFilters: Record<string, any>, sortColumns: any[]): string {
  return JSON.stringify({ columnFilters, sortColumns });
}

export const EMPTY_FILTERS_KEY = computeFiltersKey({}, []);

// Identifica a pasta pedida: pastaNome (rota de pasta, único no banco) tem
// prioridade sobre pastaId; inbox = null/sem nome.
export interface PastaIdentificador {
  pastaId: number | null;
  pastaNome?: string;
}

function pastaChave(pasta: PastaIdentificador): string {
  return pasta.pastaNome ?? String(pasta.pastaId ?? "inbox");
}

function aplicarPastaNosParams(p: URLSearchParams, pasta: PastaIdentificador) {
  if (pasta.pastaNome) p.set("pastaNome", pasta.pastaNome);
  else if (pasta.pastaId != null) p.set("pastaId", String(pasta.pastaId));
}

// Cache cliente da primeira página por pasta+filtros. O gargalo é a latência de
// rede (VPS/DB na Europa), então voltar a uma pasta já visitada deve ser
// instantâneo — os dados antigos aparecem na hora e revalidam em background.
const GRID_CACHE_TTL = 60_000;
const gridCache = new Map<string, { dados: any[]; meta: GridMeta; ts: number }>();

function cacheKeyOf(pasta: PastaIdentificador, filtersKey: string) {
  return `${pastaChave(pasta)}|${filtersKey}`;
}

function buildPage1Params(pasta: PastaIdentificador, limit = "200") {
  const p = new URLSearchParams();
  aplicarPastaNosParams(p, pasta);
  p.set("page", "1");
  p.set("limit", limit);
  return p.toString();
}

// Agendamento do prefetch (hover na sidebar): só dispara 150ms depois do
// mouse parar numa pasta; cancelPrefetch() (onMouseLeave) aborta o timer e a
// request em voo, evitando rajada de queries ao passar rápido pela lista.
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
let prefetchController: AbortController | null = null;

export function prefetchOperacoes(pasta: PastaIdentificador) {
  cancelPrefetch();
  prefetchTimeout = setTimeout(() => {
    prefetchTimeout = null;
    executarPrefetch(pasta);
  }, 150);
}

export function cancelPrefetch() {
  if (prefetchTimeout) {
    clearTimeout(prefetchTimeout);
    prefetchTimeout = null;
  }
  if (prefetchController) {
    prefetchController.abort();
    prefetchController = null;
  }
}

// Prefetch em voo por chave de cache: se o clique acontecer antes do hover
// terminar, o hook espera esta mesma Promise em vez de disparar outra request
// igual (era a causa das 3 requests iguais por clique no HAR).
const prefetchEmVoo = new Map<string, Promise<{ data: any[]; meta: GridMeta }>>();

async function executarPrefetch(pasta: PastaIdentificador) {
  const key = cacheKeyOf(pasta, EMPTY_FILTERS_KEY);
  const cached = gridCache.get(key);
  if (cached && Date.now() - cached.ts < GRID_CACHE_TTL) return;

  const controller = new AbortController();
  prefetchController = controller;
  const promise = api.get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildPage1Params(pasta)}`, controller.signal);
  prefetchEmVoo.set(key, promise);
  try {
    const res = await promise;
    gridCache.set(key, { dados: res.data, meta: res.meta, ts: Date.now() });
  } catch {
    // prefetch falhou ou foi cancelado — a navegação normal resolve
  } finally {
    if (prefetchController === controller) prefetchController = null;
    if (prefetchEmVoo.get(key) === promise) prefetchEmVoo.delete(key);
  }
}

export function useOperacoesGridData({
  pastaId,
  pastaNome,
  columnFilters,
  sortColumns,
  enabled = true,
}: {
  pastaId: number | null;
  pastaNome?: string;
  columnFilters: Record<string, any>;
  sortColumns: any[];
  enabled?: boolean;
}) {
  const [dados, setDados] = useState<any[]>([]);
  const [meta, setMeta] = useState<GridMeta>(EMPTY_META);
  const [status, setStatus] = useState<"idle" | "loading" | "loadingMore" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const seqRef = useRef(0);
  const loadingMoreRef = useRef(false);
  // Última combinação pasta+filtros processada — usada para só aplicar o
  // debounce de digitação quando é a MESMA pasta e só os filtros mudaram.
  const lastRunRef = useRef<{ pasta: string; filters: string } | null>(null);

  const filtersKey = useMemo(
    () => computeFiltersKey(columnFilters, sortColumns),
    [columnFilters, sortColumns]
  );

  // columnFilters muda de referência a cada `setColumnFilters({})` (mesmo com
  // o mesmo conteúdo) — ler pelo ref evita que isso recrie buildParams (e, com
  // ele, o efeito de dados abaixo, que reexecutaria e abortaria a request em
  // voo). filtersKey (string) nas deps já cobre mudança real de filtro/ordenação.
  const columnFiltersRef = useRef(columnFilters);
  columnFiltersRef.current = columnFilters;

  const buildParams = useCallback(
    (page: number) => {
      const p = new URLSearchParams();
      aplicarPastaNosParams(p, { pastaId, pastaNome });
      p.set("page", String(page));
      p.set("limit", searchParams.get("limit") || "200");
      const sort = sortColumns?.[0];
      if (sort) {
        p.set("sortCol", String(sort.columnKey));
        p.set("sortDir", sort.direction === "DESC" ? "desc" : "asc");
      }
      for (const [key, filter] of Object.entries(columnFiltersRef.current)) {
        if (isFilterEmpty(filter)) continue;
        p.set(`colFilter_${key}`, `${(filter as any).type}:${(filter as any).value}`);
      }
      return p.toString();
    },
    [pastaId, pastaNome, sortColumns, filtersKey, searchParams]
  );

  // Carrega a primeira página. Se já existe cache fresco, mostra na hora e
  // revalida em background; senão busca — com debounce curto (200ms) só
  // quando é digitação de filtro na mesma pasta; troca de pasta/montagem
  // dispara na hora.
  useEffect(() => {
    if (!enabled) return;
    const seq = ++seqRef.current;
    const pasta = { pastaId, pastaNome };
    const chave = pastaChave(pasta);
    // Só é "digitação" quando a pasta é a mesma, os filtros mudaram e ainda há
    // filtro ativo — limpar filtros (ex.: ao trocar de pasta) dispara na hora.
    const isFilterChange =
      lastRunRef.current?.pasta === chave &&
      lastRunRef.current?.filters !== filtersKey &&
      filtersKey !== EMPTY_FILTERS_KEY;
    // Troca de pasta: o componente fica montado entre rotas, então `dados`
    // guarda as linhas da pasta anterior. Precisamos saber disso para limpar o
    // estado e deixar o skeleton aparecer (senão dados.length !== 0 o esconde).
    const isPastaChange = lastRunRef.current !== null && lastRunRef.current.pasta !== chave;
    lastRunRef.current = { pasta: chave, filters: filtersKey };

    const key = cacheKeyOf(pasta, filtersKey);
    const cached = gridCache.get(key);
    const url = `/operacoes?${buildParams(1)}`;
    const controller = new AbortController();
    // Só usado pelo caminho do prefetch em voo abaixo: sua Promise não está
    // amarrada a este controller, então precisamos saber se o efeito já foi
    // desmontado/reexecutado para não atualizar estado depois disso.
    let cleaned = false;

    const storeResult = (raw: { data: any[]; meta: GridMeta }) => {
      gridCache.set(key, { dados: raw.data, meta: raw.meta, ts: Date.now() });
    };

    const fetchSilently = async () => {
      try {
        const res = await api.get<{ data: any[]; meta: GridMeta }>(url, controller.signal);
        if (seq !== seqRef.current) return;
        storeResult(res);
        setDados(processarDatas(res.data));
        setMeta(res.meta);
        setStatus("idle");
      } catch {
        // mantém os dados em cache mesmo se o refresh falhar (inclui abort)
      }
    };

    const fetchFresh = async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await api.get<{ data: any[]; meta: GridMeta }>(url, controller.signal);
        if (seq !== seqRef.current) return;
        storeResult(res);
        setDados(processarDatas(res.data));
        setMeta(res.meta);
        setStatus("idle");
      } catch (err: any) {
        if (err?.name === "AbortError") return; // cancelado pelo cleanup do efeito — não é erro
        if (seq !== seqRef.current) return;
        setStatus("error");
        setError(err?.message || "Erro ao carregar operações.");
      }
    };

    if (cached && Date.now() - cached.ts < GRID_CACHE_TTL) {
      setDados(processarDatas(cached.dados));
      setMeta(cached.meta);
      setStatus("idle");
      setError(null);
      const t = setTimeout(() => fetchSilently(), 250);
      return () => { clearTimeout(t); controller.abort(); };
    }

    // Hover + clique na mesma pasta: o prefetch do hover já está em voo para
    // esta chave — espera o resultado dele em vez de disparar outra request
    // (a página fica com o skeleton, sem debounce, igual ao caminho normal).
    const emVoo = prefetchEmVoo.get(key);
    if (emVoo) {
      if (isPastaChange) {
        setDados([]);
        setMeta(EMPTY_META);
      }
      setStatus("loading");
      emVoo
        .then((res) => {
          if (cleaned || seq !== seqRef.current) return;
          storeResult(res);
          setDados(processarDatas(res.data));
          setMeta(res.meta);
          setStatus("idle");
        })
        .catch(() => {
          // prefetch abortado (ex.: mouse saiu para outra pasta) — busca do zero
          if (cleaned || seq !== seqRef.current) return;
          fetchFresh();
        });
      return () => { cleaned = true; controller.abort(); };
    }

    // Sem cache fresco: ao trocar de pasta, zera os dados da pasta anterior
    // para o skeleton aparecer (e não piscar as linhas erradas). Digitação de
    // filtro na mesma pasta mantém os dados em tela — só a faixa do topo.
    if (isPastaChange) {
      setDados([]);
      setMeta(EMPTY_META);
    }
    setStatus("loading");
    if (isFilterChange) {
      const t = setTimeout(() => fetchFresh(), 200);
      return () => { clearTimeout(t); controller.abort(); };
    }
    fetchFresh();
    return () => controller.abort();
  }, [pastaId, pastaNome, filtersKey, enabled, buildParams]);

  // Recarrega a primeira página (após mutações), ignorando o cache.
  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    setStatus("loading");
    try {
      const res = await api.get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildParams(1)}`);
      if (seq !== seqRef.current) return;
      gridCache.set(cacheKeyOf({ pastaId, pastaNome }, filtersKey), { dados: res.data, meta: res.meta, ts: Date.now() });
      setDados(processarDatas(res.data));
      setMeta(res.meta);
      setStatus("idle");
    } catch (err: any) {
      if (seq !== seqRef.current) return;
      setStatus("error");
      setError(err?.message || "Erro ao recarregar operações.");
    }
  }, [buildParams, pastaId, pastaNome, filtersKey]);

  // Scroll infinito: carrega a próxima página e faz append sem duplicar
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, clientHeight, scrollHeight } = target;
      if (scrollHeight > 0 && scrollHeight - scrollTop - clientHeight < 400) {
        if (status === "idle" && meta.page < meta.totalPages && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setStatus("loadingMore");
          const page = meta.page + 1;
          api
            .get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildParams(page)}`)
            .then((res) => {
              setDados((prev) => {
                const existingIds = new Set(prev.map((d) => d.id));
                const toAdd = processarDatas(res.data).filter((o: any) => !existingIds.has(o.id));
                return [...prev, ...toAdd];
              });
              setMeta(res.meta);
            })
            .catch(() => {
              // mantém os dados atuais em caso de falha no scroll
            })
            .finally(() => {
              loadingMoreRef.current = false;
              setStatus("idle");
            });
        }
      }
    },
    [status, meta.page, meta.totalPages, buildParams]
  );

  return { dados, setDados, meta, status, error, handleScroll, refresh };
}
