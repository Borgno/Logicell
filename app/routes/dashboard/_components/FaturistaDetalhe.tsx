import { useQuery } from "@tanstack/react-query";
import { Folder, Inbox, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "~/components/patterns/EmptyState";
import { Skeleton } from "~/components/ui/skeleton";
import { DEFAULT_PASTA_COLOR } from "~/lib/pastas";
import { cn } from "~/lib/utils";
import { formatarMoeda } from "../../operacoes/_lib/colunas";
import { cuboQuery, type Filtros } from "../_hooks/dashboard.queries";
import {
  agregarCubo,
  FILTRO_VAZIO,
  type Dimensao,
  type Grupo,
  type SubFiltros,
} from "../_lib/cubo";

const DIMENSOES: { dimensao: Dimensao; titulo: string; vazio: string; limite?: number }[] = [
  { dimensao: "status", titulo: "Status", vazio: "Sem status" },
  { dimensao: "tipo", titulo: "Tipo de documento", vazio: "Não informado" },
  { dimensao: "agencia", titulo: "Agência", vazio: "Sem agência" },
  { dimensao: "tipoCte", titulo: "Tipo de CTe", vazio: "Não informado" },
  { dimensao: "cliente", titulo: "Top clientes", vazio: "Não informado", limite: 10 },
];

const dataBr = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "-");

function Numero({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold">{valor}</p>
      {hint && <p className="font-mono text-[11px] text-dim">{hint}</p>}
    </div>
  );
}

// Vazio e texto em branco viram um item só, com o rótulo de vazio.
function itens(grupos: Grupo[], vazio: string) {
  const lista: { label: string; filtro: string; valor: number; quantidade: number }[] = [];
  let semValor: (typeof lista)[number] | null = null;
  for (const grupo of grupos) {
    const label = String(grupo.chave ?? "").trim();
    if (label)
      lista.push({
        label,
        filtro: String(grupo.chave),
        valor: grupo.valor,
        quantidade: grupo.quantidade,
      });
    else if (semValor) {
      semValor.valor += grupo.valor;
      semValor.quantidade += grupo.quantidade;
    } else {
      semValor = {
        label: vazio,
        filtro: FILTRO_VAZIO,
        valor: grupo.valor,
        quantidade: grupo.quantidade,
      };
      lista.push(semValor);
    }
  }
  return lista.sort((a, b) => b.valor - a.valor);
}

// Card de uma dimensão: clicar num item filtra o detalhe inteiro do faturista por ele.
function DimensaoCard({
  titulo,
  grupos,
  vazio,
  limite,
  total,
  ativo,
  onSelect,
}: {
  titulo: string;
  grupos: Grupo[];
  vazio: string;
  limite?: number;
  total: number;
  ativo?: string;
  onSelect: (filtro: string | null) => void;
}) {
  const lista = itens(grupos, vazio).slice(0, limite);
  const maior = Math.max(...lista.map((item) => item.valor), 1);
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {titulo}
      </h3>
      {lista.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {lista.map((item) => {
            const selecionado = ativo === item.filtro;
            return (
              <li key={item.filtro}>
                <button
                  type="button"
                  aria-pressed={selecionado}
                  title={selecionado ? "Remover este filtro" : `Filtrar por ${item.label}`}
                  onClick={() => onSelect(selecionado ? null : item.filtro)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left transition-colors duration-200 ease-ui hover:bg-accent",
                    selecionado && "bg-primary/10",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs font-bold">{item.label}</span>
                    <span className="shrink-0 font-mono text-xs font-bold">
                      {formatarMoeda(item.valor)}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max((item.valor / maior) * 100, item.valor > 0 ? 2 : 0)}%`,
                        }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] text-dim">
                      {total > 0 ? ((item.valor / total) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FaturistaDetalhe({
  faturistaId,
  filtros,
}: {
  faturistaId: string | null;
  filtros: Filtros;
}) {
  // Filtros de dentro do faturista: somem ao fechar o acordeão.
  const [sub, setSub] = useState<SubFiltros>({});
  const {
    data: cubo,
    isLoading,
    error,
    refetch,
    isPlaceholderData,
  } = useQuery(cuboQuery(faturistaId, filtros));
  const detalhe = useMemo(() => (cubo ? agregarCubo(cubo, sub) : null), [cubo, sub]);

  if (isLoading) {
    return (
      <div className="grid gap-3 p-5 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }
  if (error || !detalhe) return <ErrorState error={error} onRetry={() => refetch()} />;

  const ativos = DIMENSOES.filter((item) => sub[item.dimensao]);
  const setFiltro = (dimensao: Dimensao, valor: string | null) =>
    setSub((atual) => {
      const novo = { ...atual };
      if (valor) novo[dimensao] = valor;
      else delete novo[dimensao];
      return novo;
    });

  return (
    <div
      className={cn(
        "space-y-4 bg-muted/40 p-5 transition-opacity duration-200",
        isPlaceholderData && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[10px] font-bold tracking-widest text-dim uppercase">
          Emissões de {dataBr(detalhe.primeira)} a {dataBr(detalhe.ultima)}
        </p>
        {ativos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Clique num item abaixo para filtrar este faturista.
          </p>
        ) : (
          ativos.map((item) => (
            <span
              key={item.dimensao}
              className="flex h-7 items-center gap-1 rounded-lg bg-primary/10 pl-2.5 text-xs"
            >
              <span className="text-muted-foreground">{item.titulo}:</span>
              <span className="max-w-[200px] truncate font-bold text-primary">
                {sub[item.dimensao] === FILTRO_VAZIO ? item.vazio : sub[item.dimensao]}
              </span>
              <button
                type="button"
                aria-label={`Remover filtro ${item.titulo}`}
                onClick={() => setFiltro(item.dimensao, null)}
                className="px-1.5 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero label="Valor total" valor={formatarMoeda(detalhe.valor)} />
        <Numero label="Documentos" valor={detalhe.quantidade.toLocaleString("pt-BR")} />
        <Numero
          label="Emissões antigas"
          valor={detalhe.antigas.toLocaleString("pt-BR")}
          hint={formatarMoeda(detalhe.valorAntigas)}
        />
        <Numero label="Pastas" valor={detalhe.pastas.length.toLocaleString("pt-BR")} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DIMENSOES.map((item) => (
          <DimensaoCard
            key={item.dimensao}
            titulo={item.titulo}
            grupos={detalhe.grupos[item.dimensao]}
            vazio={item.vazio}
            limite={item.limite}
            total={detalhe.valor}
            ativo={sub[item.dimensao]}
            onSelect={(valor) => setFiltro(item.dimensao, valor)}
          />
        ))}
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Pastas ({detalhe.pastas.length})
          </h3>
          <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {detalhe.pastas.map((pasta) => (
              <li key={pasta.pastaId ?? "inbox"}>
                <Link
                  to={pasta.pastaId === null ? "/caixa-de-entrada" : `/pastas/${pasta.pastaId}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent"
                >
                  {pasta.pastaId === null ? (
                    <Inbox size={14} className="shrink-0 text-muted-foreground" />
                  ) : (
                    <Folder
                      size={14}
                      className="shrink-0"
                      style={{ color: pasta.cor ?? DEFAULT_PASTA_COLOR }}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate font-bold">{pasta.nome}</span>
                  <span className="font-mono">{formatarMoeda(pasta.valor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
