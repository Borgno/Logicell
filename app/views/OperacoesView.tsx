
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Await, useFetcher, useLocation, useRouteLoaderData, useSearchParams } from "react-router";

import { useOperacoesGridState } from "~/hooks/useOperacoesGridState";
import { useOperacoesStore } from "~/store/useOperacoesStore";
import "react-data-grid/lib/styles.css";
import { useOperacoesPagination } from "~/hooks/useOperacoesPagination";
import { useOperacoesActions } from "~/hooks/useOperacoesActions";
import { useOperacoesInteractions } from "~/hooks/useOperacoesInteractions";
import { useUI } from "~/hooks/use-ui";
import { exportarExcel } from "~/utils/export";
import { ColumnFilterMenu } from "~/components/ColumnFilterMenu";
import { ImportModal } from "~/components/ImportModal";
import { OperacoesToolbarView } from "./OperacoesToolbarView";
import { getOperacoesColumns } from "./OperacoesColumns";

import DataGrid from 'react-data-grid';

interface OperacoesViewProps {
  dadosPromise: any;
  agenciasPromise: any;
  nomePasta: string;
  pastaId?: number | null;
  showImport?: boolean;
}

export function OperacoesView({ dadosPromise, nomePasta, pastaId = null, showImport = true }: OperacoesViewProps) {
  const rootData = useRouteLoaderData("root") as any;
  const pastas = rootData?.pastas || [];
  const columnOrder = rootData?.columnOrder || null;
  
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
  const fetcher = useFetcher();
  const { confirm, alert: showAlert } = useUI();
  
  const {
    selecionados, setSelecionados,
    selectAllMode, setSelectAllMode,
    excludedIds, setExcludedIds,
    showImportModal, setShowImportModal,
    resetSelection
  } = useOperacoesStore();

  const [currentMetaTotal, setCurrentMetaTotal] = useState<number>(0);
  const dadosRef = useRef<any[]>([]);


  const carregando = fetcher.state !== "idle" || fetcher.formData !== undefined;

  useEffect(() => {
    resetSelection();
    if (!location.state) {
      setColumnFilters({});
    }
  }, [pastaId, location.pathname, location.state, setColumnFilters, resetSelection]);

  useEffect(() => {
    if (fetcher.data && (fetcher.data as any).totalLido !== undefined) {
      const { adicionados, ignorados, removidos, modo } = fetcher.data as any;
      showAlert({
        title: "Importação Concluída",
        message: `Modo: ${modo === "SUBSTITUIR" ? "Substituir (Sincronização)" : "Apenas Adicionar"}\n\n✅ Novos adicionados: ${adicionados || 0} itens\n⚠️ Mantidos/Ignorados: ${ignorados || 0} itens${modo === "SUBSTITUIR" ? `\n❌ Antigos removidos: ${removidos || 0} itens` : ""}`,
        variant: "success"
      });
    }
  }, [fetcher.data, showAlert]);

  const getActiveFilters = () => {
    const activeFilters: Record<string, any> = { ...Object.fromEntries(searchParams), pastaId };
    for (const [key, filter] of Object.entries(columnFilters)) {
      if (!filter) continue;
      const isEmptyPeriod = filter.type === "period" && filter.value.split(";").every((d: string) => !d);
      if (filter.value === "" && filter.type !== "blank" && filter.type !== "notBlank") continue;
      if (isEmptyPeriod) continue;
      activeFilters[`colFilter_${key}`] = `${filter.type}:${filter.value}`;
    }
    return activeFilters;
  };

  const { lidarUpload, salvarEdicao, moverParaPasta, excluirSelecionados } = useOperacoesActions({
    fetcher, confirm, currentMetaTotal, getActiveFilters
  });

  const lidarExportarExcel = () => {
    // import COLUNAS_OPERACAO on demand since we removed it from top level imports to avoid TS errors
    import("~/hooks/useOperacoesGridState").then(({ COLUNAS_OPERACAO }) => {
      exportarExcel(dadosRef.current, COLUNAS_OPERACAO, nomePasta, showAlert);
    });
  };
  
  // colDefs movido para dentro do Await para acessar dados e setDados

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">

      {/* TABELA DE DADOS - AG GRID */}
      <div className="flex-1 min-h-0 bg-transparent overflow-hidden flex flex-col relative">

        <Suspense fallback={null}>
          <Await resolve={dadosPromise}>
            {(resultado: any) => {
              const { data: initialDados, meta: initialMeta } = resultado;
              
              const { dados, setDados, meta, handleScroll } = useOperacoesPagination(
                initialDados,
                initialMeta,
                pastaId,
                columnFilters
              );
              
              useEffect(() => {
                setCurrentMetaTotal(meta.total);
                dadosRef.current = dados;
              }, [meta.total, dados]);

              const { handleFillEnd } = useOperacoesInteractions({
                dados, setDados, fetcher, selectedRanges, orderedColumns, fillRange
              });

              const colDefs = useMemo(() => getOperacoesColumns({
                orderedColumns, columnWidths, columnFilters, selectedRanges, isDragging,
                setOpenFilterCol, setSelectedRanges, setIsDragging,
                isFillDragging, setIsFillDragging, fillRange, setFillRange, handleFillEnd,
                totalVl: meta.totalVl
              }), [columnFilters, selectedRanges, isDragging, orderedColumns, columnWidths, isFillDragging, fillRange, dados, meta.totalVl]);

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
                  <>
                    <OperacoesToolbarView 
                      dadosPromise={dadosPromise}
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
                      style={{ '--rdg-font-family': 'inherit', '--rdg-font-size': '12px' } as any}
                      onScrollCapture={handleScroll}
                    >
                    <DataGrid
                      columns={colDefs}
                      rows={dados}
                      rowKeyGetter={(row: any) => row.id}
                      selectedRows={selecionados}
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
                        if (args.column.key !== 'select' && args.column.key !== 'rowIndex') {
                            args.selectCell(true);
                        }
                      }}
                      onCellKeyDown={(args, event) => {
                        // Evita que o usuário entre no modo de edição simplesmente digitando uma letra/número
                        if (args.mode === 'SELECT') {
                          const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
                          
                          if (isPrintableKey) {
                            event.preventDefault();
                            // 'preventGridDefault' é específico do react-data-grid para bloquear a ação padrão
                            if ('preventGridDefault' in event) {
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

                         // Debounce para salvar no localStorage
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

                        const formData = new FormData();
                        formData.append("intent", "reorderColumns");
                        formData.append("order", JSON.stringify(newOrder));
                        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
                      }}
                      onRowsChange={(newRows: any[], { indexes, column }: any) => {
                        if (indexes.length > 0 && column) {
                          const row = newRows[indexes[0]];
                          handleLocalUpdate(row.id, column.key, row[column.key]);
                        }
                        
                        // Sincroniza dados atualizados preservando os que não estão no filtro
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
                </>
              );
            }}
          </Await>
        </Suspense>
      </div>

      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onUpload={lidarUpload} 
        carregando={carregando} 
      />
    </div>
  );
}
