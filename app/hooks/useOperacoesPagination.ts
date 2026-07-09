import { useEffect, useRef, useState } from "react";
import { useFetcher, useLocation, useSearchParams } from "react-router";
import { formatarData } from "~/utils/formatters";

function processarDatas(dados: any[]) {
  if (!dados) return [];
  return dados.map(o => ({
    ...o,
    dt_emissao_: o.dt_emissao_ && !(typeof o.dt_emissao_ === 'string' && o.dt_emissao_.includes('/')) 
      ? formatarData(o.dt_emissao_) 
      : o.dt_emissao_
  }));
}

export function useOperacoesPagination(initialDados: any[], initialMeta: any, pastaId: number | null, columnFilters: any) {
  const [dados, setDados] = useState(() => processarDatas(initialDados));
  const [meta, setMeta] = useState(initialMeta);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const loadMoreFetcher = useFetcher();
  const isFetchingNextPage = useRef(false);
  const mounted = useRef(false);
  const processedDataRef = useRef<any>(null);

  // Sincronização de estado síncrona (React pattern) para evitar 1 frame de dados antigos ao trocar de pasta
  const [prevInitial, setPrevInitial] = useState(initialDados);
  if (initialDados !== prevInitial) {
    setPrevInitial(initialDados);
    setDados(processarDatas(initialDados));
    setMeta(initialMeta);
  }

  // Busca dados ao montar (se houver location.state) ou ao mudar filtros
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (!location.state) return; // Evita fetch duplicado no mount
    }
    
    const timer = setTimeout(() => {
      const p = new URLSearchParams();
      if (pastaId) p.set("pastaId", String(pastaId));
      p.set("page", "1");
      p.set("limit", searchParams.get("limit") || "200");
      
      for (const [key, filter] of Object.entries(columnFilters)) {
        if (!filter || ((filter as any).value === "" && (filter as any).type !== "blank" && (filter as any).type !== "notBlank")) continue;
        p.set(`colFilter_${key}`, `${(filter as any).type}:${(filter as any).value}`);
      }
      
      isFetchingNextPage.current = true;
      loadMoreFetcher.load(`/api/operacoes-list?${p.toString()}`);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [columnFilters, pastaId]);

  // Sincroniza dados novos da paginação
  useEffect(() => {
    if (loadMoreFetcher.state === "idle" && loadMoreFetcher.data && loadMoreFetcher.data !== processedDataRef.current) {
      processedDataRef.current = loadMoreFetcher.data;
      const res = loadMoreFetcher.data as any;
      if (res.meta) {
        if (res.meta.page === 1) {
          setDados(processarDatas(res.data));
          setMeta(res.meta);
        } else if (res.meta.page > meta.page) {
          setDados((prev: any[]) => {
            const existingIds = new Set(prev.map(d => d.id));
            const toAdd = processarDatas(res.data).filter((o: any) => !existingIds.has(o.id));
            return [...prev, ...toAdd];
          });
          setMeta(res.meta);
        }
      }
      isFetchingNextPage.current = false;
    }
  }, [loadMoreFetcher.state, loadMoreFetcher.data, meta.page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, clientHeight, scrollHeight } = target;
    // Carrega a próxima página ao chegar perto do fim da rolagem
    if (scrollHeight > 0 && scrollHeight - scrollTop - clientHeight < 400) {
      if (loadMoreFetcher.state === "idle" && meta.page < meta.totalPages && !isFetchingNextPage.current) {
        isFetchingNextPage.current = true;
        const p = new URLSearchParams();
        p.set("page", String(meta.page + 1));
        p.set("limit", searchParams.get("limit") || "200");
        if (pastaId) p.set("pastaId", String(pastaId));
        
        for (const [key, filter] of Object.entries(columnFilters)) {
          if (!filter || ((filter as any).value === "" && (filter as any).type !== "blank" && (filter as any).type !== "notBlank")) continue;
          p.set(`colFilter_${key}`, `${(filter as any).type}:${(filter as any).value}`);
        }
        
        loadMoreFetcher.load(`/api/operacoes-list?${p.toString()}`);
      }
    }
  };

  return { dados, setDados, meta, handleScroll };
}
