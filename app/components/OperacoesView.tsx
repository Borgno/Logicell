import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useNavigate, useLocation, Await, useFetcher, useRouteLoaderData } from "react-router";
import * as XLSX from "xlsx";
import { 
  Search, Download, Landmark, Truck, FolderPlus, 
  ChevronDown, CheckCircle2, Table as TableIcon, 
  Trash2, UploadCloud, Loader2, AlertTriangle, History, LayoutDashboard
} from "lucide-react";
import { useUI } from "~/root";
import { MESSAGES } from "~/constants/messages";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { COLUNAS_OPERACAO, STATUS_OPERACAO } from "~/constants/operacoes";
import { formatarMoeda, formatarData, formatarNumero } from "~/utils/formatters";
import { AuditoriaModal } from "./AuditoriaModal";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EditableCell } from "./EditableCell";
import { StatsView } from "./StatsView";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// Sub-component to handle copy events within the Await scope
function CopyHandler({ dados, selectedCells, selecionados, showToast }: { dados: any[], selectedCells: Set<string>, selecionados: Set<number>, showToast: any }) {
  useEffect(() => {
    const handleCopy = (e: KeyboardEvent) => {
      // Check if we are in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedCells.size === 0 && selecionados.size === 0) return;
        
        let copyText = "";

        if (selecionados.size > 0) {
          // Prioritize copying full rows that are selected via checkboxes
          const rowsToCopy = dados.filter(d => selecionados.has(d.id));
          copyText = rowsToCopy.map(row => {
            return COLUNAS_OPERACAO.map(col => {
              let val = row[col.key];
              if (col.key === "dt_emissao_" && val) val = formatarData(val);
              return val === null || val === undefined ? "" : String(val);
            }).join("\t");
          }).join("\n");
        } else {
          // Map and sort selected cells
          const cellData = Array.from(selectedCells).map(cid => {
            const [rid, ckey] = cid.split(":");
            const rIdNum = Number(rid);
            const rowIdx = dados.findIndex(d => d.id === rIdNum);
            const colIdx = COLUNAS_OPERACAO.findIndex(c => c.key === ckey);
            return { rowIdx, colIdx, value: dados[rowIdx]?.[ckey] };
          }).filter(c => c.rowIdx !== -1).sort((a, b) => a.rowIdx - b.rowIdx || a.colIdx - b.colIdx);

          if (cellData.length === 0) return;

          let lastRowIdx = cellData[0].rowIdx;

          cellData.forEach((cell, index) => {
            if (cell.rowIdx !== lastRowIdx) {
              copyText += "\n";
              lastRowIdx = cell.rowIdx;
            } else if (index > 0) {
              copyText += "\t";
            }
            
            let val = cell.value;
            // Apply basic formatting for copy
            const col = COLUNAS_OPERACAO[cell.colIdx];
            if (col.key === "dt_emissao_" && val) val = formatarData(val);
            
            copyText += val === null || val === undefined ? "" : String(val);
          });
        }

        if (copyText) {
          navigator.clipboard.writeText(copyText);
          showToast("Copiado para o clipboard!", "success");
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleCopy);
    return () => window.removeEventListener("keydown", handleCopy);
  }, [dados, selectedCells, selecionados]);

  return null;
}

interface OperacoesViewProps {
  dadosPromise: any;
  agenciasPromise: any;
  nomePasta: string;
  pastaId?: number | null;
  showImport?: boolean;
}

export function OperacoesView({ dadosPromise, agenciasPromise, nomePasta, pastaId = null, showImport = true }: OperacoesViewProps) {
  const rootData = useRouteLoaderData("root") as any;
  const pastas = rootData?.pastas || [];
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher();
  const statsFetcher = useFetcher();
  const { showToast, confirm, alert: showAlert } = useUI();

  const lastLoadedPastaId = useRef<string | number | null>(null);

  const handleOpenStats = () => {
    setShowStatsModal(true);
    const pId = pastaId === null ? "null" : pastaId;
    
    if (statsFetcher.state === "idle" && (!statsFetcher.data || lastLoadedPastaId.current !== pId)) {
      statsFetcher.load(`/api/stats?pastaId=${pId}`);
      lastLoadedPastaId.current = pId;
    }
  };

  const [filtros, setFilters] = useState({
    search: searchParams.get("search") || "",
    agency: searchParams.get("nm_agencia") || "",
    product: searchParams.get("nm_produto") || "",
    plate: searchParams.get("ds_placa") || "",
    payer: searchParams.get("nm_pessoa_pagador") || "",
    sender: searchParams.get("nm_pessoa_remetente") || "",
    recipient: searchParams.get("nm_pessoa_destinatario") || "",
    status: searchParams.get("status") || "",
    minPeso: searchParams.get("min_peso") || "",
    maxPeso: searchParams.get("max_peso") || "",
    minTotal: searchParams.get("min_total") || "",
    maxTotal: searchParams.get("max_total") || ""
  });

  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [anchorCell, setAnchorCell] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [showPastaMenu, setShowPastaMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [auditoriaModalId, setAuditoriaModalId] = useState<number | null>(null);

  const carregando = fetcher.state !== "idle" || fetcher.formData !== undefined;

  // Sincronização modular de notificações e alertas
  useActionFeedback(fetcher, { showToast, showAlert, excludeIntents: ["update"] });

  // Reset de seleção e sincronização visual dos filtros ao mudar de pasta
  useEffect(() => {
    setSelecionados(new Set());
    setSelectedCells(new Set());
    setFilters({
      search: searchParams.get("search") || "",
      agency: searchParams.get("nm_agencia") || "",
      product: searchParams.get("nm_produto") || "",
      plate: searchParams.get("ds_placa") || "",
      payer: searchParams.get("nm_pessoa_pagador") || "",
      sender: searchParams.get("nm_pessoa_remetente") || "",
      recipient: searchParams.get("nm_pessoa_destinatario") || "",
      status: searchParams.get("status") || "",
      minPeso: searchParams.get("min_peso") || "",
      maxPeso: searchParams.get("max_peso") || "",
      minTotal: searchParams.get("min_total") || "",
      maxTotal: searchParams.get("max_total") || ""
    });
  }, [pastaId, location.pathname]);

  // Efeito de busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      const queryNormalizada = filtros.search.trim();

      const hasActiveFilters = 
        queryNormalizada || 
        filtros.agency || 
        filtros.product || 
        filtros.plate || 
        filtros.payer || 
        filtros.sender || 
        filtros.recipient || 
        filtros.status || 
        filtros.minPeso || 
        filtros.maxPeso || 
        filtros.minTotal || 
        filtros.maxTotal;

      // Evita disparar navegação dupla se não há nenhum filtro ativo e a URL está limpa
      if (!hasActiveFilters && !searchParams.has("page") && !searchParams.has("limit")) {
        return;
      }

      const currentKeys = Array.from(p.keys());
      currentKeys.forEach(k => {
        if (k !== 'page' && k !== 'limit') p.delete(k);
      });

      if (queryNormalizada) p.set("search", queryNormalizada);
      if (filtros.agency) p.set("nm_agencia", filtros.agency);
      if (filtros.product) p.set("nm_produto", filtros.product);
      if (filtros.plate) p.set("ds_placa", filtros.plate);
      if (filtros.payer) p.set("nm_pessoa_pagador", filtros.payer);
      if (filtros.sender) p.set("nm_pessoa_remetente", filtros.sender);
      if (filtros.recipient) p.set("nm_pessoa_destinatario", filtros.recipient);
      if (filtros.status) p.set("status", filtros.status);
      if (filtros.minPeso) p.set("min_peso", filtros.minPeso);
      if (filtros.maxPeso) p.set("max_peso", filtros.maxPeso);
      if (filtros.minTotal) p.set("min_total", filtros.minTotal);
      if (filtros.maxTotal) p.set("max_total", filtros.maxTotal);
      
      p.set("page", "1");
      p.set("limit", searchParams.get("limit") || "100");

      const newSearch = p.toString();
      const currentSearch = searchParams.toString();

      if (newSearch !== currentSearch) {
        navigate(`${location.pathname}?${newSearch}`, { replace: true });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [filtros]);

  const toggleSelecao = (id: number) => {
    const novos = new Set(selecionados);
    if (novos.has(id)) novos.delete(id); else novos.add(id);
    setSelecionados(novos);
  };

  const lidarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("intent", "upload");
    formData.append("file", file);
    fetcher.submit(formData, { method: "post", encType: "multipart/form-data", action: "/api/operacoes" });
    e.target.value = "";
  };

  const salvarEdicao = (id: number, campo: string, valor: string) => {
    const formData = new FormData();
    formData.append("intent", "update");
    formData.append("id", String(id));
    formData.append("campo", campo);
    formData.append("valor", valor);
    fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
  };

  const moverParaPasta = (pId: number | null, pNome: string, totalFiltro: number) => {
    const idsCount = selecionados.size > 0 ? selecionados.size : totalFiltro;
    confirm({
      ...MESSAGES.alerts.bulkMoveConfirm(idsCount, pNome),
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkMove");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify({ ...Object.fromEntries(searchParams), pastaId }));
        if (pId !== null) formData.append("pastaId", String(pId));
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
        setShowPastaMenu(false);
      }
    });
  };

  const excluirSelecionados = (totalFiltro: number) => {
    const idsCount = selecionados.size > 0 ? selecionados.size : totalFiltro;
    if (idsCount === 0) return;
    confirm({
      ...MESSAGES.alerts.bulkDeleteConfirm(idsCount),
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkDelete");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify({ ...Object.fromEntries(searchParams), pastaId }));
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
      }
    });
  };

  const exportarExcel = (dados: any[]) => {
    try {
      showToast(MESSAGES.toasts.generatingExcel.message, MESSAGES.toasts.generatingExcel.type);
      const exportData = dados.map(row => {
        const obj: any = {};
        COLUNAS_OPERACAO.forEach(col => {
          let val = row[col.key];
          if (col.key === "dt_emissao_" && val) val = formatarData(val);
          obj[col.label] = val;
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Export");
      XLSX.writeFile(wb, `Logicell_${nomePasta}.xlsx`);
      showToast(MESSAGES.toasts.downloadStarted.message, MESSAGES.toasts.downloadStarted.type);
    } catch (e) {
      showAlert(MESSAGES.toasts.excelError);
    }
  };

  // Logic for Cell Selection (Google Sheets Style)
  const handleCellMouseDown = (rowId: number, colKey: string, rowIdx: number, colIdx: number, e: React.MouseEvent) => {
    // If double click, let it edit (handled in EditableCell)
    if (e.detail > 1) return;

    const cellId = `${rowId}:${colKey}`;
    const isMulti = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isShift && anchorCell) {
      // Range selection with Shift
      const newSelection = new Set(isMulti ? selectedCells : []);
      const startRow = Math.min(anchorCell.rowIdx, rowIdx);
      const endRow = Math.max(anchorCell.rowIdx, rowIdx);
      const startCol = Math.min(anchorCell.colIdx, colIdx);
      const endCol = Math.max(anchorCell.colIdx, colIdx);

      // We need 'dados' here, so we'll do this calculation inside the Await block or pass it
    } else if (isMulti) {
      // Toggle individual cell
      const novos = new Set(selectedCells);
      if (novos.has(cellId)) novos.delete(cellId); else novos.add(cellId);
      setSelectedCells(novos);
      setAnchorCell({ rowIdx, colIdx });
    } else {
      // Single selection
      setSelectedCells(new Set([cellId]));
      setAnchorCell({ rowIdx, colIdx });
      setIsDragging(true);
    }
  };

  // Global mouseUp listener to stop dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in duration-500">
            
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between shrink-0">
        <div className="flex items-center gap-3 flex-1 w-full">
          <input type="file" id="import-input" className="hidden" accept=".xls,.xlsx" onChange={lidarUpload} disabled={carregando} />

          {!showImport && (
            <button 
              onClick={handleOpenStats}
              className="flex items-center gap-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
            >
              {carregando ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <LayoutDashboard size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />}
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{nomePasta}</span>
            </button>
          )}

          {showImport && (
            <button 
              onClick={handleOpenStats}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-all group shrink-0"
            >
              {carregando ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <LayoutDashboard size={16} className="text-indigo-500" />}
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Dashboard</span>
            </button>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Busca Geral" 
              value={filtros.search}
              onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
              maxLength={500}
              className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-0 rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto relative">
          <Suspense fallback={<div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />}>
            <Await resolve={dadosPromise}>
              {(resultado: any) => (
                <button onClick={() => setShowPastaMenu(!showPastaMenu)} className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                  <FolderPlus size={16} />
                  {selecionados.size > 0 ? `Mover (${selecionados.size})` : 'Mover Filtrados'}
                  <ChevronDown size={12} className={cn("transition-transform", showPastaMenu && "rotate-180")} />
                </button>
              )}
            </Await>
          </Suspense>

          {showPastaMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mover para</p></div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <Suspense fallback={<div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>}>
                  <Await resolve={dadosPromise}>
                    {(resultado: any) => (
                      <>
                        <button onClick={() => moverParaPasta(null, "Caixa de Entrada", resultado.meta.total)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-indigo-600 border-b border-slate-100 dark:border-slate-800">
                          <TableIcon size={16} /><span>Caixa de Entrada</span>
                        </button>
                        {pastas.map((p: any) => (
                          <button key={p.id} onClick={() => moverParaPasta(p.id, p.nome, resultado.meta.total)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                            <CheckCircle2 size={16} className="text-indigo-500" />
                            <span>{p.nome}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </Await>
                </Suspense>
              </div>
            </div>
          )}
          
          <Suspense fallback={<div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />}>
            <Await resolve={dadosPromise}>
              {(resultado: any) => (
                <>
                  <button onClick={() => excluirSelecionados(resultado.meta.total)} className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-colors group shrink-0">
                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="relative flex-1 xl:flex-none">
                    <button 
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all shrink-0"
                    >
                      <Download size={16} />
                      Opções
                      <ChevronDown size={12} className={cn("transition-transform", showActionsMenu && "rotate-180")} />
                    </button>

                    {showActionsMenu && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
                        {showImport && (
                          <label htmlFor="import-input" className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer border-b border-slate-100 dark:border-slate-800">
                            <UploadCloud size={16} className="text-indigo-500" />
                            <span>Importar Planilha</span>
                          </label>
                        )}
                        <button 
                          onClick={() => {
                            exportarExcel(resultado.data);
                            setShowActionsMenu(false);
                          }} 
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300"
                        >
                          <Download size={16} className="text-emerald-500" />
                          <span>Exportar Excel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Await>
          </Suspense>
        </div>
      </div>

      {/* FILTROS AVANÇADOS */}
      <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-3 shrink-0">
        <Suspense fallback={<div className="grid grid-cols-6 gap-4 animate-pulse"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" /></div>}>
          <Await resolve={agenciasPromise}>
            {(agencias: string[]) => (
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select value={filtros.agency} onChange={(e) => setFilters(p => ({ ...p, agency: e.target.value }))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl pl-9 pr-2 py-2 outline-none text-xs font-bold appearance-none">
                    <option value="">Todas Agências</option>
                    {(agencias || []).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <input placeholder="Cliente" value={filtros.payer} onChange={e => setFilters(p => ({...p, payer: e.target.value}))} className="flex-1 min-w-[140px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 outline-none text-xs font-bold" />
                <input placeholder="Remetente" value={filtros.sender} onChange={e => setFilters(p => ({...p, sender: e.target.value}))} className="flex-1 min-w-[140px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 outline-none text-xs font-bold" />
                <input placeholder="Destinatário" value={filtros.recipient} onChange={e => setFilters(p => ({...p, recipient: e.target.value}))} className="flex-1 min-w-[140px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 outline-none text-xs font-bold" />
                <input placeholder="Produto" value={filtros.product} onChange={e => setFilters(p => ({...p, product: e.target.value}))} className="flex-1 min-w-[140px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 outline-none text-xs font-bold" />
                <input placeholder="Placa" value={filtros.plate} maxLength={20} onChange={e => setFilters(p => ({...p, plate: e.target.value}))} className="flex-1 min-w-[140px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 outline-none text-xs font-bold" />
              </div>
            )}
          </Await>
        </Suspense>
        
        <div className="flex flex-wrap gap-4 items-center border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
            <select value={filtros.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))} className="w-36 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] font-black outline-none">
              <option value="">Todos</option>
              {STATUS_OPERACAO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso:</span>
            <input placeholder="Mín" type="number" value={filtros.minPeso} onChange={e => setFilters(p => ({...p, minPeso: e.target.value}))} className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] font-black" />
            <input placeholder="Máx" type="number" value={filtros.maxPeso} onChange={e => setFilters(p => ({...p, maxPeso: e.target.value}))} className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] font-black" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total R$:</span>
            <input placeholder="Mín" type="number" value={filtros.minTotal} onChange={e => setFilters(p => ({...p, minTotal: e.target.value}))} className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] font-black" />
            <input placeholder="Máx" type="number" value={filtros.maxTotal} onChange={e => setFilters(p => ({...p, maxTotal: e.target.value}))} className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] font-black" />
          </div>
          <button onClick={() => setFilters({ search: '', agency: '', product: '', plate: '', payer: '', sender: '', recipient: '', status: '', minPeso: '', maxPeso: '', minTotal: '', maxTotal: '' })} className="ml-auto text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors">Limpar filtros</button>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm relative">

        <Suspense fallback={
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando Operações...</p>
          </div>
        }>
          <Await resolve={dadosPromise}>
            {(resultado: any) => {
              const { data: initialDados, meta } = resultado;
              const [dados, setDados] = useState(initialDados);
              useEffect(() => setDados(initialDados), [initialDados]);

              const handleLocalUpdate = (id: number, campo: string, valor: string) => {
                setDados((prev: any[]) => prev.map(d => d.id === id ? { ...d, [campo]: valor } : d));
                salvarEdicao(id, campo, valor);
              };

              return (
                <>
                  <CopyHandler dados={dados} selectedCells={selectedCells} selecionados={selecionados} showToast={showToast} />
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="sticky top-0 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="w-14 px-4 py-2.5 text-[10px] font-black text-slate-400 text-center uppercase">Nº</th>
                          <th className="w-12 px-2 py-2.5 text-center">
                            <input type="checkbox" checked={selecionados.size === dados.length && dados.length > 0} onChange={() => {
                              if (selecionados.size === dados.length) setSelecionados(new Set());
                              else setSelecionados(new Set(dados.map((d:any) => d.id)));
                            }} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                          </th>
                          {COLUNAS_OPERACAO.map(col => <th key={col.key} style={{ width: col.width, minWidth: col.width }} className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100/50 dark:border-slate-800/50 last:border-0">{col.label}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {dados.map((row: any, idx: number) => (
                            <tr key={row.id} className={cn("hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors", selecionados.has(row.id) && "bg-indigo-500/10 dark:bg-indigo-500/20")}>
                              <td className="px-4 py-1.5 text-[10px] text-slate-400 font-mono text-center border-r border-slate-100 dark:border-slate-800/50 select-none">{(meta.page - 1) * meta.limit + idx + 1}</td>
                              <td className="px-2 py-1.5 border-r border-slate-100 dark:border-slate-800/50 text-center select-none"><input type="checkbox" checked={selecionados.has(row.id)} onChange={() => toggleSelecao(row.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" /></td>
                                {COLUNAS_OPERACAO.map((col, colIdx) => {
                                  const cellId = `${row.id}:${col.key}`;
                                  return (
                                    <td 
                                      key={col.key} 
                                      className="p-0 border-r border-slate-50 dark:border-slate-800/50 last:border-0 relative select-none"
                                      onMouseDown={(e) => {
                                        const isMulti = e.ctrlKey || e.metaKey;
                                        const isShift = e.shiftKey;
                                        
                                        if (isShift && anchorCell) {
                                          const newSelection = new Set<string>(isMulti ? selectedCells : []);
                                          const startRow = Math.min(anchorCell.rowIdx, idx);
                                          const endRow = Math.max(anchorCell.rowIdx, idx);
                                          const startCol = Math.min(anchorCell.colIdx, colIdx);
                                          const endCol = Math.max(anchorCell.colIdx, colIdx);

                                          for (let r = startRow; r <= endRow; r++) {
                                            for (let c = startCol; c <= endCol; c++) {
                                              newSelection.add(`${dados[r].id}:${COLUNAS_OPERACAO[c].key}`);
                                            }
                                          }
                                          setSelectedCells(newSelection);
                                        } else if (isMulti) {
                                          const novos = new Set(selectedCells);
                                          if (novos.has(cellId)) novos.delete(cellId); else novos.add(cellId);
                                          setSelectedCells(novos);
                                          setAnchorCell({ rowIdx: idx, colIdx });
                                        } else {
                                          setSelectedCells(new Set([cellId]));
                                          setAnchorCell({ rowIdx: idx, colIdx });
                                          setIsDragging(true);
                                        }
                                      }}
                                      onMouseEnter={() => {
                                        if (isDragging && anchorCell) {
                                          const newSelection = new Set<string>();
                                          const startRow = Math.min(anchorCell.rowIdx, idx);
                                          const endRow = Math.max(anchorCell.rowIdx, idx);
                                          const startCol = Math.min(anchorCell.colIdx, colIdx);
                                          const endCol = Math.max(anchorCell.colIdx, colIdx);

                                          for (let r = startRow; r <= endRow; r++) {
                                            for (let c = startCol; c <= endCol; c++) {
                                              newSelection.add(`${dados[r].id}:${COLUNAS_OPERACAO[c].key}`);
                                            }
                                          }
                                          setSelectedCells(newSelection);
                                        }
                                      }}
                                    >
                                      <EditableCell
                                        id={row.id}
                                        campo={col.key}
                                        valor={row[col.key]}
                                        coluna={col}
                                        isSelected={selectedCells.has(cellId)}
                                        onSave={(novoValor) => handleLocalUpdate(row.id, col.key, novoValor)}
                                      />
                                    </td>
                                  );
                                })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINAÇÃO */}
                  <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {meta.total} registros</div>
                      </div>
                      <select 
                        value={searchParams.get("limit") || "100"} 
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

                    <div className="flex items-center gap-2">
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.set("page", String(Math.max(1, meta.page - 1))); setSearchParams(p); }} disabled={meta.page === 1} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold disabled:opacity-30 transition-all hover:bg-slate-50 shadow-sm">Anterior</button>
                      <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/20">{meta.page} / {meta.totalPages}</div>
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.set("page", String(Math.min(meta.totalPages, meta.page + 1))); setSearchParams(p); }} disabled={meta.page >= meta.totalPages} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold disabled:opacity-30 transition-all hover:bg-slate-50 shadow-sm">Próxima</button>
                    </div>
                  </div>
                </>
              );
            }}
          </Await>
        </Suspense>
      </div>

      {auditoriaModalId !== null && (
        <AuditoriaModal 
          operacaoId={auditoriaModalId > 0 ? auditoriaModalId : null} 
          pastaId={auditoriaModalId === -1 ? (pastaId === null ? "null" : pastaId) : undefined}
          title={auditoriaModalId === -1 ? `Histórico: ${nomePasta}` : "Edições da Operação"}
          onClose={() => setAuditoriaModalId(null)} 
        />
      )}

      {showStatsModal && (
        <Suspense fallback={null}>
          {statsFetcher.state === "loading" && !statsFetcher.data ? (
            <div 
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setShowStatsModal(false)}
            >
              <div 
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <Loader2 size={40} className="animate-spin text-indigo-500" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Calculando Analytics...</p>
              </div>
            </div>
          ) : statsFetcher.data ? (
            <StatsView 
              stats={statsFetcher.data} 
              nomePasta={nomePasta} 
              onClose={() => setShowStatsModal(false)} 
              onOpenHistory={() => {
                setShowStatsModal(false);
                setAuditoriaModalId(-1);
              }}
              onApplyFilter={(status) => {
                setFilters(p => ({ ...p, status }));
                setShowStatsModal(false);
              }}
            />
          ) : null}
        </Suspense>
      )}
    </div>
  );
}
