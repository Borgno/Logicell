import { Suspense } from "react";
import { Search, Download, FolderPlus, ChevronDown, CheckCircle2, Table as TableIcon, Trash2, UploadCloud, Loader2, LayoutDashboard } from "lucide-react";
import { Await } from "react-router";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export interface OperacoesToolbarProps {
  dadosPromise: any;
  pastas: any[];
  nomePasta: string;
  showImport: boolean;
  carregando: boolean;
  
  // Filtros removidos do toolbar para focar na busca por coluna no DataGrid
  
  selecionados: Set<number>;
  
  showPastaMenu: boolean;
  setShowPastaMenu: (val: boolean) => void;
  showActionsMenu: boolean;
  setShowActionsMenu: (val: boolean) => void;
  setShowImportModal: (val: boolean) => void;
  
  lidarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  moverParaPasta: (id: number | null, nome: string, total: number) => void;
  excluirSelecionados: (total: number) => void;
  exportarExcel: (data: any[]) => void;
}

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function OperacoesToolbarView({
  dadosPromise, pastas, nomePasta, showImport, carregando,
  selecionados,
  showPastaMenu, setShowPastaMenu, showActionsMenu, setShowActionsMenu, setShowImportModal,
  lidarUpload, moverParaPasta, excluirSelecionados, exportarExcel
}: OperacoesToolbarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between shrink-0">
      <div className="flex items-center gap-3 flex-1 w-full">
        <input type="file" id="import-input" className="hidden" accept=".xls,.xlsx" onChange={lidarUpload} disabled={carregando} />

        <div className="relative flex-1 flex justify-end">
           {/* Busca global removida para priorizar filtros específicos por coluna no Grid */}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full xl:w-auto relative">
        <Suspense fallback={<div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />}>
          <Await resolve={dadosPromise}>
            {() => (
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
                        <button 
                          onClick={() => { setShowImportModal(true); setShowActionsMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer border-b border-slate-100 dark:border-slate-800"
                        >
                          <UploadCloud size={16} className="text-indigo-500" />
                          <span>Importar Planilha</span>
                        </button>
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
  );
}
