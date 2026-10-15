import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Users } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "~/components/patterns/EmptyState";
import { Skeleton } from "~/components/ui/skeleton";
import { useListParams } from "~/hooks/useListParams";
import { cn } from "~/lib/utils";
import { formatarMoeda } from "../../operacoes/_lib/colunas";
import {
  CAMPOS,
  cuboQuery,
  filtrosDaUrl,
  opcoesQuery,
  resumoQuery,
  type Filtros,
} from "../_hooks/dashboard.queries";
import { FaturistaDetalhe } from "./FaturistaDetalhe";
import { FiltrosBar } from "./FiltrosBar";

const PALETA = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Operações por faturista, com os filtros na URL. Abrir um faturista mostra o detalhe dele.
export function OperacoesDashboard({ gestor }: { gestor: boolean }) {
  const [searchParams] = useSearchParams();
  const { set } = useListParams();
  const filtros = filtrosDaUrl(searchParams);
  const resumo = useQuery(resumoQuery(filtros));
  const { data: opcoes } = useQuery(opcoesQuery);
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState<string | null>(null);

  // Parar o mouse sobre um faturista por 150 ms já busca o detalhe: até o clique, ele está no cache.
  const intencao = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(intencao.current), []);
  const preCarregar = (faturistaId: string | null) => {
    clearTimeout(intencao.current);
    intencao.current = setTimeout(
      () => void queryClient.prefetchQuery(cuboQuery(faturistaId, filtros)),
      150,
    );
  };

  const onChange = (campo: keyof Filtros, valor: string | null) => set({ [campo]: valor });
  const onLimpar = () => set(Object.fromEntries(CAMPOS.map((campo) => [campo, null])));

  const faturistas = resumo.data?.faturistas ?? [];
  const total = resumo.data?.total;

  return (
    <>
      <FiltrosBar
        filtros={filtros}
        opcoes={opcoes}
        gestor={gestor}
        onChange={onChange}
        onLimpar={onLimpar}
      />
      {resumo.error ? (
        <ErrorState error={resumo.error} onRetry={() => resumo.refetch()} />
      ) : resumo.isLoading || !total ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <section
          aria-label="Por faturista"
          className={cn(
            "overflow-hidden rounded-2xl border bg-card shadow-card transition-opacity duration-200",
            resumo.isPlaceholderData && "opacity-60",
          )}
        >
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b p-5">
            <Users size={16} className="text-primary" />
            <h2 className="text-sm font-bold">Por faturista</h2>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {total.quantidade.toLocaleString("pt-BR")} documentos · {formatarMoeda(total.valor)}
            </span>
          </header>
          {faturistas.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              Nenhuma operação com esses filtros.
            </p>
          ) : (
            <ul>
              {faturistas.map((faturista, index) => {
                const chave = faturista.faturistaId ?? "sem";
                const estaAberto = aberto === chave;
                const pct = total.valor > 0 ? (faturista.valor / total.valor) * 100 : 0;
                return (
                  <Fragment key={chave}>
                    <li className="border-b last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={estaAberto}
                        onClick={() => setAberto(estaAberto ? null : chave)}
                        onMouseEnter={() => preCarregar(faturista.faturistaId)}
                        onMouseLeave={() => clearTimeout(intencao.current)}
                        className={cn(
                          "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-200 ease-ui hover:bg-accent",
                          estaAberto && "bg-accent",
                        )}
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PALETA[index % PALETA.length] }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{faturista.nome}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {faturista.quantidade.toLocaleString("pt-BR")} documentos
                            {faturista.supervisor && <> · Supervisor: {faturista.supervisor}</>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-sm font-bold">
                            {formatarMoeda(faturista.valor)}
                          </span>
                          <span className="block font-mono text-[11px] text-dim">
                            {pct.toFixed(1)}%
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            "shrink-0 transition-transform duration-200 ease-ui",
                            estaAberto && "rotate-180",
                          )}
                        />
                      </button>
                      {estaAberto && (
                        <FaturistaDetalhe faturistaId={faturista.faturistaId} filtros={filtros} />
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
