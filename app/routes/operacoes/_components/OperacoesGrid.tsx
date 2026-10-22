import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import DataGrid, {
  SELECT_COLUMN_KEY,
  SelectColumn,
  type Column,
  type SortColumn,
} from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { toast } from "sonner";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { ErrorState } from "~/components/patterns/EmptyState";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { ApiError } from "~/lib/api";
import { statusQuery } from "~/lib/status";
import { cn } from "~/lib/utils";
import { formatMoney } from "~/lib/format";
import { CAMPOS_EM_LOTE, formatarCelula, ordenarColunas } from "../_lib/colunas";
import {
  listQueryString,
  operacoesQuery,
  ordemColunasQuery,
  useAtualizarEmLote,
  useEditarCelula,
  useExcluirEmLote,
  useSalvarOrdemColunas,
  type Escopo,
  type Operacao,
  type Selecao,
} from "../_hooks/operacoes.queries";
import { useCellSelection } from "../_hooks/useCellSelection";
import { filtrosParaApi, useGridParams } from "../_hooks/useGridParams";
import { ColumnFilter } from "./ColumnFilter";
import { MoverMenu } from "./MoverMenu";
import { StatusEditor } from "./StatusEditor";
import "./grid.css";

const WIDTHS_KEY = "operacoes-column-widths";

// Larguras ajustadas à mão, guardadas no navegador de cada pessoa.
function useColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? "{}");
      return saved && typeof saved === "object" ? (saved as Record<string, number>) : {};
    } catch {
      return {};
    }
  });
  const save = useCallback((key: string, width: number) => {
    setWidths((current) => {
      const next = { ...current, [key]: Math.round(width) };
      try {
        localStorage.setItem(WIDTHS_KEY, JSON.stringify(next));
      } catch {
        // Sem localStorage: vale até recarregar.
      }
      return next;
    });
  }, []);
  return [widths, save] as const;
}

// Linhas marcadas uma a uma, ou "todas as filtradas" menos as desmarcadas, que pode passar das
// linhas carregadas na tela.
type Marcacao = { todas: false; ids: Set<number> } | { todas: true; excluidos: Set<number> };
const NENHUMA: Marcacao = { todas: false, ids: new Set() };

function GridSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 12 }, (_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  );
}

type OperacoesGridProps = {
  escopo: Escopo;
  // Nome no arquivo exportado e nas confirmações.
  nome: string;
};

export function OperacoesGrid({ escopo, nome }: OperacoesGridProps) {
  const { params, setSort, setSearch, setFiltro, clearFiltros } = useGridParams();
  const list = useInfiniteQuery(operacoesQuery(escopo, params));
  const { data: ordem } = useQuery(ordemColunasQuery);
  const { data: statusLista } = useQuery(statusQuery);
  // Opções do editor de status. undefined até a lista chegar: a marca de fora da lista espera por ela.
  const statusOpcoes = useMemo(
    () => statusLista?.filter((status) => status.ativo).map((status) => status.nome),
    [statusLista],
  );
  const salvarOrdem = useSalvarOrdemColunas();
  const editar = useEditarCelula();
  const atualizar = useAtualizarEmLote();
  const excluir = useExcluirEmLote();
  const confirm = useConfirm();
  const [widths, saveWidth] = useColumnWidths();

  const rows = useMemo(() => list.data?.pages.flatMap((page) => page.data) ?? [], [list.data]);
  const meta = list.data?.pages[0]?.meta;
  const total = meta?.total ?? 0;
  const colunas = useMemo(() => ordenarColunas(ordem), [ordem]);

  // Busca digitada vai para a URL depois de uma pausa.
  const [searchInput, setSearchInput] = useState(params.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput.trim());
  useEffect(() => {
    if (debouncedSearch !== (params.search ?? "")) setSearch(debouncedSearch);
  }, [debouncedSearch, params.search, setSearch]);

  // --- Seleção de linhas -------------------------------------------------------------------------

  const [marcacao, setMarcacao] = useState<Marcacao>(NENHUMA);
  const filtrosKey = JSON.stringify([escopo, params]);
  const cells = useCellSelection({
    rows,
    colunas,
    onFill: (coluna, ids, valor) => {
      if (!CAMPOS_EM_LOTE.includes(coluna.key)) return;
      atualizar.mutate(
        { selecao: { ids }, campo: coluna.key, valor: valor === null ? null : String(valor) },
        { onError: (error) => error instanceof ApiError && toast.error(error.message) },
      );
    },
  });
  const { clear: clearCells } = cells;

  // Trocar de pasta, filtro ou ordenação muda as linhas: a seleção anterior não vale mais. Ajuste
  // durante o render, e não num efeito, para a grid nunca mostrar a seleção velha nas linhas novas.
  const [selecaoKey, setSelecaoKey] = useState(filtrosKey);
  if (selecaoKey !== filtrosKey) {
    setSelecaoKey(filtrosKey);
    setMarcacao(NENHUMA);
    clearCells();
  }

  const selectedRows = useMemo(
    () =>
      marcacao.todas
        ? new Set(rows.map((row) => row.id).filter((id) => !marcacao.excluidos.has(id)))
        : marcacao.ids,
    [marcacao, rows],
  );
  const quantidade = marcacao.todas ? total - marcacao.excluidos.size : marcacao.ids.size;

  function onSelectedRowsChange(next: Set<number>) {
    if (marcacao.todas) {
      const excluidos = new Set(marcacao.excluidos);
      for (const row of rows) {
        if (next.has(row.id)) excluidos.delete(row.id);
        else excluidos.add(row.id);
      }
      setMarcacao({ todas: true, excluidos });
    } else {
      setMarcacao({ todas: false, ids: next });
    }
  }

  function selecao(): Selecao {
    if (!marcacao.todas) return { ids: [...marcacao.ids] };
    return {
      todas: {
        pasta: String(escopo),
        filtro: filtrosParaApi(params.filtros),
        search: params.search,
        excluidos: [...marcacao.excluidos],
      },
    };
  }

  const plural = (n: number) =>
    `${n.toLocaleString("pt-BR")} ${n === 1 ? "operação" : "operações"}`;

  async function mover(destino: { pastaId: number | null; nome: string }) {
    const ok = await confirm({
      title: `Mover ${plural(quantidade)}?`,
      description: `Elas saem de ${nome} e vão para ${destino.nome}.`,
      confirmLabel: "Mover",
    });
    if (!ok) return;
    atualizar.mutate(
      { selecao: selecao(), pastaId: destino.pastaId },
      {
        onSuccess: ({ afetadas }) => {
          toast.success(
            `${plural(afetadas)} movida${afetadas === 1 ? "" : "s"} para ${destino.nome}`,
          );
          setMarcacao(NENHUMA);
        },
        onError: (error) => error instanceof ApiError && toast.error(error.message),
      },
    );
  }

  async function excluirSelecionadas() {
    const ok = await confirm({
      title: `Excluir ${plural(quantidade)}?`,
      description: "As operações são apagadas de vez. Não dá para desfazer.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    excluir.mutate(selecao(), {
      onSuccess: ({ afetadas }) => {
        toast.success(`${plural(afetadas)} excluída${afetadas === 1 ? "" : "s"}`);
        setMarcacao(NENHUMA);
      },
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  // A planilha é montada no servidor com todas as linhas filtradas, não só as carregadas.
  function exportar() {
    const query = listQueryString(escopo, params);
    query.set("ordem", colunas.map((coluna) => coluna.key).join(","));
    window.location.href = `/api/v1/operacoes/planilha?${query}`;
  }

  // --- Colunas -----------------------------------------------------------------------------------

  const sortColumns: SortColumn[] = params.sort
    ? [
        {
          columnKey: params.sort.replace(/^-/, ""),
          direction: params.sort.startsWith("-") ? "DESC" : "ASC",
        },
      ]
    : [];

  const columns = useMemo<Column<Operacao>[]>(() => {
    const dataColumns = colunas.map<Column<Operacao>>((coluna, colIdx) => ({
      key: coluna.key,
      name: coluna.label,
      width: widths[coluna.key] ?? coluna.width,
      minWidth: 40,
      resizable: true,
      draggable: true,
      sortable: coluna.ordenavel ?? false,
      editable: true,
      renderHeaderCell: ({ sortDirection }) => (
        <div className="group/header flex h-full w-full items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <span className="truncate">{coluna.label}</span>
            {sortDirection === "ASC" && <ArrowUp size={12} className="shrink-0" />}
            {sortDirection === "DESC" && <ArrowDown size={12} className="shrink-0" />}
            {coluna.key === "total" && meta && (
              <span className="font-mono normal-case text-primary">
                = {formatMoney(meta.totalValor)}
              </span>
            )}
          </span>
          <ColumnFilter
            coluna={coluna}
            filtro={params.filtros[coluna.key]}
            onChange={(filtro) => setFiltro(coluna.key, filtro)}
          />
        </div>
      ),
      renderEditCell: ({ row, onRowChange, onClose }) =>
        coluna.key === "status" ? (
          <StatusEditor
            value={typeof row.status === "string" ? row.status : ""}
            opcoes={statusOpcoes ?? []}
            onSelect={(status) => onRowChange({ ...row, [coluna.key]: status }, true)}
            onClose={() => onClose(false)}
          />
        ) : (
          <input
            autoFocus
            aria-label={coluna.label}
            className="h-full w-full border-2 border-primary bg-card px-2 text-xs outline-none"
            defaultValue={formatarCelula(coluna, row[coluna.key])}
            onChange={(event) => onRowChange({ ...row, [coluna.key]: event.target.value })}
            onBlur={() => onClose(true)}
          />
        ),
      renderCell: ({ row, rowIdx }) => {
        const marca =
          coluna.key === "placa" && row.placaDuplicada
            ? { className: "bg-warning/20", title: "Placa duplicada nesta pasta" }
            : coluna.key === "dataEmissao" && row.emissaoAntiga
              ? { className: "bg-destructive/15", title: "Emissão antiga (fora do prazo)" }
              : coluna.key === "status" &&
                  statusOpcoes &&
                  typeof row.status === "string" &&
                  row.status !== "" &&
                  !statusOpcoes.includes(row.status)
                ? { className: "bg-warning/20", title: "Status fora da lista: escolha uma opção" }
                : null;
        return (
          <div
            className="relative flex h-full w-full items-center select-none"
            title={marca?.title}
            onMouseDown={(event) => cells.onCellMouseDown({ row: rowIdx, col: colIdx }, event)}
            onMouseEnter={() => cells.onCellMouseEnter({ row: rowIdx, col: colIdx })}
            onMouseUp={cells.onCellMouseUp}
          >
            {marca && (
              <div
                className={cn("pointer-events-none absolute -inset-x-2 inset-y-0", marca.className)}
              />
            )}
            {cells.isSelected(rowIdx, colIdx) && (
              <div className="pointer-events-none absolute -inset-x-2 inset-y-0 bg-primary/15" />
            )}
            {cells.isFillTarget(rowIdx, colIdx) && (
              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary" />
            )}
            <span
              className={cn(
                "relative truncate",
                (coluna.tipo === "numero" || coluna.tipo === "moeda") && "ml-auto font-mono",
              )}
            >
              {formatarCelula(coluna, row[coluna.key])}
            </span>
            {cells.isHandle(rowIdx, colIdx) && CAMPOS_EM_LOTE.includes(coluna.key) && (
              <div
                aria-hidden
                className="absolute -right-2 -bottom-px size-2.5 cursor-crosshair border border-card bg-primary"
                onMouseDown={(event) =>
                  cells.onHandleMouseDown({ row: rowIdx, col: colIdx }, event)
                }
              />
            )}
          </div>
        );
      },
    }));
    return [
      SelectColumn,
      {
        key: "rowIndex",
        name: "Nº",
        width: 48,
        frozen: true,
        renderCell: ({ rowIdx }) => (
          <span className="font-mono text-muted-foreground">{rowIdx + 1}</span>
        ),
      },
      ...dataColumns,
    ];
  }, [colunas, widths, meta, params.filtros, setFiltro, cells, statusOpcoes]);

  function onColumnsReorder(sourceKey: string, targetKey: string) {
    const keys = colunas.map((coluna) => coluna.key);
    const from = keys.indexOf(sourceKey);
    const to = keys.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    keys.splice(to, 0, ...keys.splice(from, 1));
    salvarOrdem.mutate(keys, {
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  function onRowsChange(
    next: Operacao[],
    { indexes, column }: { indexes: number[]; column: { key: string } },
  ) {
    const row = next[indexes[0]];
    if (!row || !column) return;
    const valor = row[column.key];
    const anterior = rows[indexes[0]];
    const coluna = colunas.find((item) => item.key === column.key)!;
    // Sair da célula sem mudar nada não grava.
    if (formatarCelula(coluna, anterior?.[column.key]) === String(valor ?? "")) return;
    editar.mutate(
      { id: row.id, campo: column.key, valor: valor === "" ? null : String(valor ?? "") },
      { onError: (error) => error instanceof ApiError && toast.error(error.message) },
    );
  }

  // Rolagem infinita: a próxima página quando faltam umas 10 linhas para o fim.
  function onScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    if (
      target.scrollHeight - target.scrollTop - target.clientHeight < 400 &&
      list.hasNextPage &&
      !list.isFetchingNextPage
    ) {
      void list.fetchNextPage();
    }
  }

  const filtrando = Boolean(params.search) || filtrosParaApi(params.filtros).length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="CTe, NF, cliente, placa..."
            aria-label="Buscar operações"
            className="h-9 pl-9"
          />
        </div>
        <MoverMenu
          escopo={escopo}
          disabled={quantidade === 0 || atualizar.isPending}
          onMove={mover}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={quantidade === 0 || excluir.isPending}
          onClick={excluirSelecionadas}
        >
          <Trash2 />
          Excluir
        </Button>
        <Button variant="outline" size="sm" disabled={total === 0} onClick={exportar}>
          <Download />
          Exportar
        </Button>
        {filtrando && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              clearFiltros();
            }}
          >
            <X />
            Limpar filtros
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {meta ? `${plural(total)}` : ""}
          {list.isFetching && !list.isFetchingNextPage && " · atualizando"}
        </span>
      </div>

      {quantidade > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-2 text-xs"
          role="status"
        >
          {marcacao.todas ? (
            <span>
              Todas as <strong>{quantidade.toLocaleString("pt-BR")}</strong> operações filtradas
              estão selecionadas.
            </span>
          ) : (
            <span>
              <strong>{quantidade.toLocaleString("pt-BR")}</strong> selecionada
              {quantidade === 1 ? "" : "s"}.
            </span>
          )}
          {!marcacao.todas && quantidade === rows.length && total > rows.length && (
            <Button
              variant="link"
              size="xs"
              onClick={() => setMarcacao({ todas: true, excluidos: new Set() })}
            >
              Selecionar todas as {total.toLocaleString("pt-BR")}
            </Button>
          )}
          <Button variant="link" size="xs" onClick={() => setMarcacao(NENHUMA)}>
            Limpar seleção
          </Button>
        </div>
      )}

      {list.isLoading ? (
        <GridSkeleton />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <DataGrid
          className="grid-operacoes"
          // O CSS da grid fixa block-size: a altura vai inline para ocupar a tela abaixo do cabeçalho.
          style={{ blockSize: "max(360px, calc(100dvh - 16rem))" }}
          columns={columns}
          rows={rows}
          rowKeyGetter={(row) => row.id}
          selectedRows={selectedRows}
          onSelectedRowsChange={onSelectedRowsChange}
          sortColumns={sortColumns}
          onSortColumnsChange={(next) => {
            const [first] = next;
            setSort(first ? `${first.direction === "DESC" ? "-" : ""}${first.columnKey}` : null);
          }}
          onColumnsReorder={onColumnsReorder}
          onColumnResize={(idx, width) => saveWidth(columns[idx].key, width)}
          onRowsChange={onRowsChange}
          onScroll={onScroll}
          onCellDoubleClick={({ column, selectCell }) => {
            if (column.key !== SELECT_COLUMN_KEY && column.key !== "rowIndex") selectCell(true);
          }}
          rowHeight={34}
          headerRowHeight={40}
          renderers={{
            noRowsFallback: (
              <div className="col-span-full p-10 text-center text-sm text-muted-foreground">
                {filtrando ? "Nenhuma operação com esses filtros." : "Nenhuma operação aqui."}
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
