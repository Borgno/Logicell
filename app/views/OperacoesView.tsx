import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation, Await, useFetcher, useRouteLoaderData } from "react-router";
import * as XLSX from "xlsx";
import { Search, Download, FolderPlus, ChevronDown, CheckCircle2, Table as TableIcon, Trash2, UploadCloud, Loader2, LayoutDashboard, Filter } from "lucide-react";
import { useUI } from "~/hooks/use-ui";
import { MESSAGES } from "~/constants/messages";
import { useActionFeedback } from "~/hooks/use-action-feedback";

import { formatarMoeda, formatarData } from "~/utils/formatters";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import "react-data-grid/lib/styles.css";

import { OperacoesToolbarView } from "./OperacoesToolbarView";
import { exportarExcel } from "~/utils/export";
import { useOperacoesGridState, type FilterType, COLUNAS_OPERACAO } from "~/hooks/useOperacoesGridState";

import DataGrid, { SelectColumn } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

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
  const initialWidths = rootData?.columnWidths || {};
  
  const {
    columnWidths, setColumnWidths,
    columnFilters, setColumnFilters,
    openFilterCol, setOpenFilterCol,
    selectedRanges, setSelectedRanges,
    isDragging, setIsDragging,
    orderedColumns
  } = useOperacoesGridState(columnOrder, initialWidths);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher();
  const { showToast, confirm, alert: showAlert } = useUI();
  
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState<boolean>(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [currentMetaTotal, setCurrentMetaTotal] = useState<number>(0);
  const dadosRef = useRef<any[]>([]);

  const [showPastaMenu, setShowPastaMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importModo, setImportModo] = useState("SUBSTITUIR");


  const carregando = fetcher.state !== "idle" || fetcher.formData !== undefined;

  useActionFeedback(fetcher, { showToast, showAlert, excludeIntents: ["update"] });

  useEffect(() => {
    setSelecionados(new Set());
    if (!location.state) {
      setColumnFilters({});
    }
  }, [pastaId, location.pathname, location.state, setColumnFilters]);

  const lidarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("intent", "upload");
    formData.append("file", file);
    formData.append("modo", importModo);
    fetcher.submit(formData, { method: "post", encType: "multipart/form-data", action: "/api/operacoes" });
    e.target.value = "";
    setShowImportModal(false);
  };

  const salvarEdicao = (id: number, campo: string, valor: string) => {
    const formData = new FormData();
    formData.append("intent", "update");
    formData.append("id", String(id));
    formData.append("campo", campo);
    formData.append("valor", valor);
    fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
  };

  const getActiveFilters = () => {
    const activeFilters: Record<string, any> = { ...Object.fromEntries(searchParams), pastaId };
    for (const [key, filter] of Object.entries(columnFilters)) {
      if (!filter || (filter.value === "" && filter.type !== "blank" && filter.type !== "notBlank")) continue;
      activeFilters[`colFilter_${key}`] = `${filter.type}:${filter.value}`;
    }
    return activeFilters;
  };

  const moverParaPasta = (pId: number | null, pNome: string, unusedTotalFiltro: number) => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;
    
    confirm({
      ...MESSAGES.alerts.bulkMoveConfirm(idsCount, pNome),
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkMove");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify(getActiveFilters()));
        if (selectAllMode) {
          formData.append("selectAll", "true");
          formData.append("excludedIds", JSON.stringify(Array.from(excludedIds)));
        }
        if (pId !== null) formData.append("pastaId", String(pId));
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
        setSelectAllMode(false);
        setExcludedIds(new Set());
        setShowPastaMenu(false);
      }
    });
  };

  const excluirSelecionados = (unusedTotalFiltro: number) => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;

    confirm({
      ...MESSAGES.alerts.bulkDeleteConfirm(idsCount),
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkDelete");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify(getActiveFilters()));
        if (selectAllMode) {
          formData.append("selectAll", "true");
          formData.append("excludedIds", JSON.stringify(Array.from(excludedIds)));
        }
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
        setSelectAllMode(false);
        setExcludedIds(new Set());
      }
    });
  };

  const lidarExportarExcel = () => {
    exportarExcel(dadosRef.current, COLUNAS_OPERACAO, nomePasta, showToast, showAlert);
  };
  
  const colDefs = useMemo(() => {
    const defs: any[] = [
      SelectColumn,
      {
        key: "rowIndex",
        name: "Nº",
        width: columnWidths["rowIndex"] || 40,
        minWidth: 25,
        resizable: true,
        frozen: true,
        renderHeaderCell: () => <span className="text-xs font-black uppercase tracking-wider text-slate-400">Nº</span>,
        renderCell: (props: any) => props.rowIdx + 1
      }
    ];

    orderedColumns.forEach(col => {
      defs.push({
        key: col.key,
        name: col.label,
        draggable: true,
        resizable: true,
        minWidth: 30,
        width: columnWidths[col.key] || parseInt(col.width) || 150,
        renderHeaderCell: () => {
          const hasFilter = !!columnFilters[col.key];
          return (
            <div className="flex items-center justify-between w-full group">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 truncate pr-2">{col.label}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterCol({ key: col.key, rect: e.currentTarget.getBoundingClientRect() });
                }}
                className={cn("p-1.5 rounded-lg transition-all", hasFilter ? "text-slate-700 bg-slate-200 dark:bg-slate-700 dark:text-slate-200" : "text-transparent group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
              >
                <Filter size={14} />
              </button>
            </div>
          );
        },
        renderEditCell: (props: any) => {
          let editValue = props.row[col.key];
          if (col.key === "dt_emissao_") {
            if (editValue instanceof Date || (typeof editValue === 'string' && editValue.includes('T'))) {
                editValue = formatarData(editValue);
            }
          }
          return (
            <input
              autoFocus
              className="w-full h-full px-2 outline-none border-2 border-indigo-500 rounded text-xs bg-white text-black"
              value={editValue || ""}
              onChange={(e) => props.onRowChange({ ...props.row, [col.key]: e.target.value })}
              onBlur={() => props.onClose(true)}
            />
          );
        },
        renderCell: (props: any) => {
          const value = props.row[col.key];
          let displayValue: any = value;
          
          if (col.key === "status") {
            displayValue = value || "";
          } else if (value === null || value === undefined) {
            displayValue = "";
          } else if (col.key === "dt_emissao_") {
            displayValue = formatarData(value);
          } else if (col.isCurrency) {
            displayValue = formatarMoeda(value);
          }

          const colIdx = orderedColumns.indexOf(col) + 2;
          const isSelected = selectedRanges.some(r => {
            return props.rowIdx >= Math.min(r.start.rowIdx, r.end.rowIdx) && 
                    props.rowIdx <= Math.max(r.start.rowIdx, r.end.rowIdx) && 
                    colIdx >= Math.min(r.start.colIdx, r.end.colIdx) && 
                    colIdx <= Math.max(r.start.colIdx, r.end.colIdx);
          });

          return (
            <div 
              className="w-full h-full flex items-center relative select-none"
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                const pos = { rowIdx: props.rowIdx, colIdx };
                
                if (e.ctrlKey || e.metaKey) {
                  // Adiciona um novo bloco avulso
                  setSelectedRanges(prev => [...prev, { start: pos, end: pos }]);
                } else if (e.shiftKey || e.altKey) {
                  // Estica o último bloco (como no Excel)
                  setSelectedRanges(prev => {
                    if (prev.length === 0) return [{ start: pos, end: pos }];
                    const newRanges = [...prev];
                    newRanges[newRanges.length - 1] = { ...newRanges[newRanges.length - 1], end: pos };
                    return newRanges;
                  });
                } else {
                  // Limpa e inicia um novo
                  setSelectedRanges([{ start: pos, end: pos }]);
                }
                setIsDragging(true);
              }}
              onMouseEnter={() => {
                if (isDragging) {
                  setSelectedRanges(prev => {
                    if (prev.length === 0) return prev;
                    const newRanges = [...prev];
                    newRanges[newRanges.length - 1] = { ...newRanges[newRanges.length - 1], end: { rowIdx: props.rowIdx, colIdx } };
                    return newRanges;
                  });
                }
              }}
            >
              {isSelected && <div className="absolute -inset-x-2 -inset-y-2 bg-indigo-500/20 pointer-events-none z-0 mix-blend-multiply" />}
              <div className="relative truncate w-full">{displayValue}</div>
            </div>
          );
        }
      });
    });

    return defs;
  }, [columnFilters, selectedRanges, isDragging, orderedColumns, columnWidths]);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">




      {/* TABELA DE DADOS - AG GRID */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm relative">

        <Suspense fallback={
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando Operações...</p>
          </div>
        }>
          <Await resolve={dadosPromise}>
            {(resultado: any) => {
              const { data: initialDados, meta: initialMeta } = resultado;
              const [dados, setDados] = useState(initialDados);
              const [meta, setMeta] = useState(initialMeta);
              
              useEffect(() => {
                setCurrentMetaTotal(meta.total);
                dadosRef.current = dados;
              }, [meta.total, dados]);

              const loadMoreFetcher = useFetcher();

              const mounted = useRef(false);

              useEffect(() => {
                if (!mounted.current) {
                  mounted.current = true;
                  if (!location.state) return; // Evita fetch duplicado no mount se não vier de um redirect com state
                }
                
                const timer = setTimeout(() => {
                  const p = new URLSearchParams();
                  if (pastaId) p.set("pastaId", String(pastaId));
                  p.set("page", "1");
                  p.set("limit", searchParams.get("limit") || "200");
                  
                  for (const [key, filter] of Object.entries(columnFilters)) {
                    if (!filter || (filter.value === "" && filter.type !== "blank" && filter.type !== "notBlank")) continue;
                    p.set(`colFilter_${key}`, `${filter.type}:${filter.value}`);
                  }
                  
                  loadMoreFetcher.load(`/api/operacoes-list?${p.toString()}`);
                }, 600);
                return () => clearTimeout(timer);
              }, [columnFilters, pastaId]);
              
              // Atualiza os dados se a promessa inicial mudar (ex: troca de pasta)
              useEffect(() => {
                setDados(initialDados);
                setMeta(initialMeta);
                setSelecionados(new Set());
              }, [pastaId]); // Depender apenas do pastaId evita que re-renders do React sobrescrevam os filtros!

              useEffect(() => {
                if (loadMoreFetcher.state === "idle" && loadMoreFetcher.data) {
                  const res = loadMoreFetcher.data as any;
                  if (res.meta) {
                    if (res.meta.page === 1) {
                      setDados(res.data);
                      setMeta(res.meta);
                    } else if (res.meta.page > meta.page) {
                      setDados((prev: any[]) => {
                          const existingIds = new Set(prev.map(d => d.id));
                          const toAdd = res.data.filter((o: any) => !existingIds.has(o.id));
                          return [...prev, ...toAdd];
                      });
                      setMeta(res.meta);
                    }
                  }
                }
              }, [loadMoreFetcher.state, loadMoreFetcher.data, meta.page]);

              const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
                const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                 // Carrega a próxima página ao chegar perto do fim da rolagem
                if (scrollHeight - scrollTop - clientHeight < 400) {
                    if (loadMoreFetcher.state === "idle" && meta.page < meta.totalPages && !loadMoreFetcher.data?.loading) {
                      const p = new URLSearchParams();
                      p.set("page", String(meta.page + 1));
                      p.set("limit", searchParams.get("limit") || "200");
                      if (pastaId) p.set("pastaId", String(pastaId));
                      
                      for (const [key, filter] of Object.entries(columnFilters)) {
                        if (!filter || (filter.value === "" && filter.type !== "blank" && filter.type !== "notBlank")) continue;
                        p.set(`colFilter_${key}`, `${filter.type}:${filter.value}`);
                      }
                      
                      loadMoreFetcher.load(`/api/operacoes-list?${p.toString()}`);
                    }
                }
              };

              useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedRanges.length > 0) {
                    if (document.activeElement?.tagName === 'INPUT') return;
                    e.preventDefault();
                    
                    const selectedSet = new Set<string>();
                    let minRow = Infinity, maxRow = -Infinity;
                    let minCol = Infinity, maxCol = -Infinity;
                    
                    selectedRanges.forEach(r => {
                        const rMinRow = Math.min(r.start.rowIdx, r.end.rowIdx);
                        const rMaxRow = Math.max(r.start.rowIdx, r.end.rowIdx);
                        const rMinCol = Math.min(r.start.colIdx, r.end.colIdx);
                        const rMaxCol = Math.max(r.start.colIdx, r.end.colIdx);
                        
                        minRow = Math.min(minRow, rMinRow);
                        maxRow = Math.max(maxRow, rMaxRow);
                        minCol = Math.min(minCol, rMinCol);
                        maxCol = Math.max(maxCol, rMaxCol);
                        
                        for (let i = rMinRow; i <= rMaxRow; i++) {
                            for (let j = rMinCol; j <= rMaxCol; j++) {
                                selectedSet.add(`${i},${j}`);
                            }
                        }
                    });
                    
                    if (minRow === Infinity) return;
                    
                    let tsv = "";
                    for (let r = minRow; r <= maxRow; r++) {
                      const rowData = dados[r];
                      if (!rowData) continue;
                      let rowValues = [];
                      for (let c = minCol; c <= maxCol; c++) {
                          if (selectedSet.has(`${r},${c}`)) {
                              if (c < 2) continue;
                              const col = orderedColumns[c - 2];
                              if (!col) continue;
                              let val = rowData[col.key];
                              if (val === null || val === undefined) val = "";
                              else if (col.key === "dt_emissao_") val = formatarData(val);
                              else if (col.isCurrency) val = formatarMoeda(val);
                              rowValues.push(String(val));
                          } else {
                              if (c >= 2) rowValues.push("");
                          }
                      }
                      if (rowValues.length > 0) tsv += rowValues.join("\t") + "\n";
                    }
                    if (tsv) {
                      navigator.clipboard.writeText(tsv);
                      showToast("Copiado!", "success");
                    }
                  }
                };
                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
              }, [selectedRanges, dados, orderedColumns]);

              const handleLocalUpdate = (id: number, campo: string, valor: string) => {
                setDados((prev: any[]) => prev.map(d => d.id === id ? { ...d, [campo]: valor } : d));
                salvarEdicao(id, campo, valor);
              };

              const bannerNode = ((selecionados.size === dados.length && dados.length > 0 && meta.total > dados.length) || selectAllMode) ? (
                  <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 animate-in fade-in">
                    {!selectAllMode ? (
                      <>
                        Todas as <strong>{dados.length}</strong> operações desta página estão selecionadas.
                        <button onClick={() => { setSelectAllMode(true); setExcludedIds(new Set()); }} className="ml-2 font-black text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
                          Selecionar todas as {meta.total} operações
                        </button>
                      </>
                    ) : (
                      <>
                        Todas as <strong>{meta.total - excludedIds.size}</strong> operações estão selecionadas.
                        <button onClick={() => { setSelectAllMode(false); setSelecionados(new Set()); setExcludedIds(new Set()); }} className="ml-2 font-black text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
                          Limpar seleção
                        </button>
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
                      selecionados={selecionados}
                      showPastaMenu={showPastaMenu}
                      setShowPastaMenu={setShowPastaMenu}
                      showActionsMenu={showActionsMenu}
                      setShowActionsMenu={setShowActionsMenu}
                      setShowImportModal={setShowImportModal}
                      lidarUpload={lidarUpload}
                      moverParaPasta={moverParaPasta}
                      excluirSelecionados={excluirSelecionados}
                      exportarExcel={lidarExportarExcel}
                      selectionBannerNode={bannerNode}
                    />

                    <div 
                      className="flex-1 w-full h-full text-xs" 
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
                      onCellClick={(args) => {
                        if (args.column.key !== 'select' && args.column.key !== 'rowIndex') {
                            args.selectCell(true);
                        }
                      }}
                      onColumnResize={(idx, width) => {
                        const colKey = colDefs[idx].key;
                        if (!colKey) return;
                        
                        const newWidths = { ...columnWidths, [colKey]: width };
                        setColumnWidths(newWidths);

                         // Debounce para não floodar a API
                        if ((window as any)._resizeTimeout) clearTimeout((window as any)._resizeTimeout);
                        (window as any)._resizeTimeout = setTimeout(() => {
                          const formData = new FormData();
                          formData.append("intent", "resizeColumns");
                          formData.append("widths", JSON.stringify(newWidths));
                          fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
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

                    {openFilterCol && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setOpenFilterCol(null)} />
                        <div 
                          className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col w-64 p-3 animate-in zoom-in-95 duration-100 gap-3"
                          style={{ top: openFilterCol.rect.bottom + 8, left: Math.max(10, openFilterCol.rect.left - 200 + openFilterCol.rect.width) }}
                        >
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Coluna</span>
                              <button onClick={() => {
                                  setColumnFilters(p => {
                                    const n = {...p}; delete n[openFilterCol.key]; return n;
                                  });
                                  // searchParams is synced automatically via useEffect
                                  setOpenFilterCol(null);
                              }} className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Limpar</button>
                          </div>

                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-300"
                            value={columnFilters[openFilterCol.key]?.type || "contains"}
                            onChange={(e) => {
                              const type = e.target.value as FilterType;
                              setColumnFilters(p => ({
                                ...p,
                                [openFilterCol.key]: { type, value: p[openFilterCol.key]?.value || "" }
                              }));
                            }}
                          >
                            <option value="contains">Contém</option>
                            <option value="equals">É Igual a</option>
                            <option value="blank">Vazio (Em branco)</option>
                            <option value="notBlank">Não Vazio</option>
                          </select>

                          {(columnFilters[openFilterCol.key]?.type !== "blank" && columnFilters[openFilterCol.key]?.type !== "notBlank") && (
                            <input 
                              type="text" 
                              placeholder="Valor..."
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-400/50 transition-all"
                              value={columnFilters[openFilterCol.key]?.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setColumnFilters(p => ({
                                  ...p,
                                  [openFilterCol.key]: { type: p[openFilterCol.key]?.type || "contains", value }
                                }));
                                  // searchParams is synced automatically via useEffect
                              }}
                              autoFocus
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* FOOTER & SCROLL INFINITO */}
                  <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {meta.total} registros</div>
                      </div>
                      <select 
                        value={searchParams.get("limit") || "200"} 
                        onChange={(e) => {
                          const p = new URLSearchParams(searchParams);
                          p.set("limit", e.target.value);
                          p.set("page", "1");
                          setSearchParams(p);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 text-[10px] font-black outline-none text-slate-500"
                      >
                        {[100, 200, 500, 1000].map(v => <option key={v} value={v}>{v} por página</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 h-8">
                      {loadMoreFetcher.state !== "idle" && (
                        <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold animate-pulse">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Carregando mais...</span>
                        </div>
                      )}
                      {loadMoreFetcher.state === "idle" && meta.page >= meta.totalPages && meta.total > 0 && (
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fim da lista</div>
                      )}
                    </div>
                  </div>
                </>
              );
            }}
          </Await>
        </Suspense>
      </div>





      {/* Modal de Importação com Modos */}
      {showImportModal && (
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Importar Planilha</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Escolha como deseja importar os dados
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <label className={cn("block p-4 rounded-xl border-2 cursor-pointer transition-all", importModo === "SUBSTITUIR" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300")}>
                <div className="flex items-center gap-3 mb-2">
                  <input type="radio" name="modo_import" checked={importModo === "SUBSTITUIR"} onChange={() => setImportModo("SUBSTITUIR")} className="w-4 h-4 text-indigo-600" />
                  <span className="font-black text-sm uppercase text-slate-800 dark:text-white">Substituir (Recomendado)</span>
                </div>
                <p className="text-xs text-slate-500 ml-7 leading-relaxed">Remove as operações que não estão na planilha nova e atualiza o restante. Ideal para sincronizar os dados mensais.</p>
              </label>

              <label className={cn("block p-4 rounded-xl border-2 cursor-pointer transition-all", importModo === "ADICIONAR" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300")}>
                <div className="flex items-center gap-3 mb-2">
                  <input type="radio" name="modo_import" checked={importModo === "ADICIONAR"} onChange={() => setImportModo("ADICIONAR")} className="w-4 h-4 text-indigo-600" />
                  <span className="font-black text-sm uppercase text-slate-800 dark:text-white">Apenas Adicionar</span>
                </div>
                <p className="text-xs text-slate-500 ml-7 leading-relaxed">Adiciona novas operações da planilha sem excluir nada do que já está no sistema. Ignora duplicidades automaticamente.</p>
              </label>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                Cancelar
              </button>
              <label htmlFor="import-input-modal" className={cn("flex-1 py-3 rounded-xl font-bold text-sm text-white text-center cursor-pointer shadow-lg transition-all", importModo === "SUBSTITUIR" ? "bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700" : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700")}>
                {carregando ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <UploadCloud size={16} className="inline mr-2" />}
                Selecionar Arquivo
              </label>
              <input type="file" id="import-input-modal" className="hidden" accept=".xls,.xlsx" onChange={lidarUpload} disabled={carregando} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
