import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";

import { useOperacoesGridState } from "~/hooks/useOperacoesGridState";
import { useOperacoesGridData, isFilterEmpty } from "~/hooks/useOperacoesGridData";
import { useOperacoesStore } from "~/store/useOperacoesStore";
import "react-data-grid/lib/styles.css";
import { useOperacoesActions } from "~/hooks/useOperacoesActions";
import { useOperacoesInteractions } from "~/hooks/useOperacoesInteractions";
import { useUI } from "~/hooks/use-ui";
import { exportarExcel } from "~/utils/export";
import { ColumnFilterMenu } from "~/components/ColumnFilterMenu";
import { ImportModal } from "~/components/ImportModal";
import { OperacoesToolbarView } from "./OperacoesToolbarView";
import { getOperacoesColumns } from "./OperacoesColumns";
import { api, errorMessage } from "~/lib/api";
import { queryClient, queryKeys, useInit } from "~/lib/query";

import DataGrid from "react-data-grid";

interface OperacoesViewProps {
  pastaId?: number | null;
  pastaNome?: string;
  nomePasta: string;
  showImport?: boolean;
}

export function OperacoesView({ pastaId = null, pastaNome, nomePasta, showImport = true }: OperacoesViewProps) {
  const { data: init } = useInit();
  const pastas = init?.pastas || [];
  const columnOrder = init?.columnOrder ?? null;

  const {
    columnWidths, setColumnWidths,
    columnFilters, setColumnFilters,
    openFilterCol, setOpenFilterCol,
    selectedRanges, setSelectedRanges,
    isDragging, setIsDragging,
    isFillDragging, setIsFillDragging,
    fillRange, setFillRange,
    orderedColumns
  } = useOperacoesGridState(columnOrder);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { confirm, alert: showAlert } = useUI();

  const {
    selecionados, setSelecionados,
    selectAllMode, setSelectAllMode,
    excludedIds, setExcludedIds,
    showImportModal, setShowImportModal,
    resetSelection
  } = useOperacoesStore();

  const [sortColumns, setSortColumns] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const grid = useOperacoesGridData({ pastaId, pastaNome, columnFilters, sortColumns });
  const { dados, setDados, meta, status, error: gridError, handleScroll, refresh } = grid;

  const [currentMetaTotal, setCurrentMetaTotal] = useState(0);
  const dadosRef = useRef<any[]>([]);

  const carregando = status === "loading" || status === "loadingMore" || importing;

  useEffect(() => {
    setCurrentMetaTotal(meta.total);
    dadosRef.current = dados;
  }, [meta.total, dados]);

  useEffect(() => {
    resetSelection();
    if (!location.state) {
      setColumnFilters({});
    }
  }, [pastaId, pastaNome, location.pathname, location.state, setColumnFilters, resetSelection]);

  // Envia pastaNome quando a pasta é identificada por nome (rota /pastas/:nome),
  // para que mover/excluir "selecionar todas" fiquem restritos a ela.
  const getActiveFilters = () => {
    const activeFilters: Record<string, any> = { ...Object.fromEntries(searchParams) };
    if (pastaNome) activeFilters.pastaNome = pastaNome;
    else activeFilters.pastaId = pastaId;
    for (const [key, filter] of Object.entries(columnFilters)) {
      if (isFilterEmpty(filter)) continue;
      activeFilters[`colFilter_${key}`] = `${filter.type}:${filter.value}`;
    }
    return activeFilters;
  };

  const onMutated = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: queryKeys.init });
  };

  const { lidarUpload, salvarEdicao, moverParaPasta, excluirSelecionados } = useOperacoesActions({
    confirm, currentMetaTotal, getActiveFilters, onMutated
  });

  const lidarUploadComEstado = async (file: File, modo: string) => {
    setImporting(true);
    try {
      await lidarUpload(file, modo);
    } finally {
      setImporting(false);
    }
  };

  const handleBulkUpdate = (ids: number[], campo: string, valor: string) => {
    api
      .post("/operacoes/bulk", { action: "update", ids, campo, valor })
      .catch((err) => showAlert({ title: "Erro ao salvar", message: errorMessage(err), variant: "error" }));
  };

  const { handleFillEnd } = useOperacoesInteractions({
    dados, setDados, selectedRanges, orderedColumns, fillRange, onBulkUpdate: handleBulkUpdate
  });

  // Referência estável p/ o fill: evita que o colDefs seja reconstruído a cada
  // render (função nova por render quebrava o memo e re-renderizava a grid toda)
  const handleFillEndRef = useRef(handleFillEnd);
  useEffect(() => {
    handleFillEndRef.current = handleFillEnd;
  }, [handleFillEnd]);
  const onFillEnd = useMemo(() => (colKey: string) => handleFillEndRef.current(colKey), []);

  const lidarExportarExcel = () => {
    import("~/hooks/useOperacoesGridState").then(({ COLUNAS_OPERACAO }) => {
      exportarExcel(dadosRef.current, COLUNAS_OPERACAO, nomePasta, showAlert);
    });
  };

  const colDefs = useMemo(() => getOperacoesColumns({
    orderedColumns, columnWidths, columnFilters, selectedRanges, isDragging,
    setOpenFilterCol, setSelectedRanges, setIsDragging,
    isFillDragging, setIsFillDragging, fillRange, setFillRange, handleFillEnd: onFillEnd,
    totalVl: meta.totalVl
  }), [columnFilters, selectedRanges, isDragging, orderedColumns, columnWidths, isFillDragging, fillRange, meta.totalVl, onFillEnd]);

  const handleLocalUpdate = (id: number, campo: string, valor: string) => {
    setDados((prev: any[]) => prev.map(d => d.id === id ? { ...d, [campo]: valor } : d));
    salvarEdicao(id, campo, valor);
  };

  const isAllLoadedSelected = selecionados.size === dados.length && dados.length > 0;
  const hasMoreInDb = meta.total > dados.length;
  const shouldShowSelectAllGlobal = hasMoreInDb && (isAllLoadedSelected || selecionados.size >= 200);

  const bannerNode = (selecionados.size > 0 || selectAllMode) ? (
    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 animate-in fade-in">
      {selectAllMode ? (
        <>
          Todas as <strong>{meta.total - excludedIds.size}</strong> operações estão selecionadas.
          <button onClick={() => { setSelectAllMode(false); setSelecionados(new Set()); setExcludedIds(new Set()); }} className="ml-2 font-black text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
            Limpar seleção
          </button>
        </>
      ) : shouldShowSelectAllGlobal ? (
        <>
          Todas as <strong>{selecionados.size}</strong> operações desta página estão selecionadas.
          <button onClick={() => { setSelectAllMode(true); setExcludedIds(new Set()); }} className="ml-2 font-black text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
            Selecionar todas as {meta.total} operações
          </button>
        </>
      ) : (
        <>
          <strong>{selecionados.size}</strong> operação(ões) selecionada(s).
        </>
      )}
    </span>
  ) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">

      <div className="flex-1 min-h-0 bg-transparent overflow-hidden flex flex-col relative">

        {gridError && (
          <div className="px-4 py-3 bg-error/10 text-error border-b border-error/20 text-xs font-bold flex items-center justify-between">
            <span>{gridError}</span>
            <button onClick={() => refresh()} className="underline hover:no-underline">Tentar novamente</button>
          </div>
        )}

        <OperacoesToolbarView
          pastas={pastas}
          nomePasta={nomePasta}
          showImport={showImport}
          carregando={carregando}
          selectionCount={selectAllMode ? meta.total - excludedIds.size : selecionados.size}
          moverParaPasta={moverParaPasta}
          excluirSelecionados={excluirSelecionados}
          exportarExcel={lidarExportarExcel}
          selectionBannerNode={bannerNode}
        />

        <div
          className="flex-1 w-full min-h-0 min-w-0 text-xs"
          style={{ "--rdg-font-family": "inherit", "--rdg-font-size": "12px" } as any}
          onScrollCapture={handleScroll}
        >
          <DataGrid
            columns={colDefs}
            rows={dados}
            rowKeyGetter={(row: any) => row.id}
            selectedRows={selecionados}
            sortColumns={sortColumns}
            onSortColumnsChange={(newSortColumns) => {
              setSortColumns([...newSortColumns]);
              resetSelection();
            }}
            onScroll={handleScroll}
            onSelectedRowsChange={(newSelected: Set<number>) => {
              if (selectAllMode) {
                const newExcluded = new Set(excludedIds);
                dados.forEach((d: any) => {
                  if (!newSelected.has(d.id)) newExcluded.add(d.id);
                  else newExcluded.delete(d.id);
                });
                setExcludedIds(newExcluded);
              } else {
                setSelecionados(newSelected);
              }
            }}
            onCellDoubleClick={(args) => {
              if (args.column.key !== "select" && args.column.key !== "rowIndex") {
                args.selectCell(true);
              }
            }}
            onCellKeyDown={(args, event) => {
              if (args.mode === "SELECT") {
                const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
                if (isPrintableKey) {
                  event.preventDefault();
                  if ("preventGridDefault" in event) {
                    (event as any).preventGridDefault();
                  }
                }
              }
            }}
            onColumnResize={(idx, width) => {
              const colKey = colDefs[idx].key;
              if (!colKey) return;
              const newWidths = { ...columnWidths, [colKey]: width };
              setColumnWidths(newWidths);
              if ((window as any)._resizeTimeout) clearTimeout((window as any)._resizeTimeout);
              (window as any)._resizeTimeout = setTimeout(() => {
                localStorage.setItem("columnWidths", JSON.stringify(newWidths));
              }, 500);
            }}
            onColumnsReorder={(sourceKey, targetKey) => {
              const newOrder = orderedColumns.map(c => c.key);
              const sourceIdx = newOrder.indexOf(sourceKey);
              const targetIdx = newOrder.indexOf(targetKey);
              if (sourceIdx === -1 || targetIdx === -1) return;
              const [movedItem] = newOrder.splice(sourceIdx, 1);
              newOrder.splice(targetIdx, 0, movedItem);
              api
                .put("/colunas", { order: newOrder })
                .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.init }))
                .catch((err) => showAlert({ title: "Erro ao salvar", message: errorMessage(err), variant: "error" }));
            }}
            onRowsChange={(newRows: any[], { indexes, column }: any) => {
              if (indexes.length > 0 && column) {
                const row = newRows[indexes[0]];
                handleLocalUpdate(row.id, column.key, row[column.key]);
              }
              setDados((prev: any[]) => prev.map((d: any) => {
                const updatedRow = newRows.find(nr => nr.id === d.id);
                return updatedRow ? updatedRow : d;
              }));
            }}
            className="h-full w-full rdg-light dark:rdg-dark rounded-none border-0"
            rowHeight={36}
            headerRowHeight={42}
          />

          <ColumnFilterMenu
            openFilterCol={openFilterCol}
            setOpenFilterCol={setOpenFilterCol}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />
        </div>
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onUpload={lidarUploadComEstado}
        carregando={carregando}
      />
    </div>
  );
}
