import { clsx, type ClassValue } from "clsx";
import { Download, FolderInput, Trash2, UploadCloud } from "lucide-react";
import { twMerge } from "tailwind-merge";
export interface OperacoesToolbarProps {
  dadosPromise: any;
  pastas: any[];
  nomePasta: string;
  showImport: boolean;
  carregando: boolean;
  
  selectionCount: number;
  selecionados: Set<number>;
  
  showPastaMenu: boolean;
  setShowPastaMenu: (val: boolean) => void;
  showActionsMenu: boolean;
  setShowActionsMenu: (val: boolean) => void;
  setShowImportModal: (val: boolean) => void;
  
  lidarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  moverParaPasta: (id: number | null, nome: string, total: number) => void;
  excluirSelecionados: (total: number) => void;
  exportarExcel: () => void;

  selectionBannerNode?: React.ReactNode;
}

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function OperacoesToolbarView({
  dadosPromise, pastas, nomePasta, showImport, carregando,
  selectionCount,
  showPastaMenu, setShowPastaMenu, showActionsMenu, setShowActionsMenu, setShowImportModal,
  lidarUpload, moverParaPasta, excluirSelecionados, exportarExcel,
  selectionBannerNode
}: OperacoesToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      <input type="file" id="import-input" className="hidden" accept=".xls,.xlsx" onChange={lidarUpload} disabled={carregando} />

      {/* LEFT: Mover e Excluir */}
      <div className="flex items-center gap-1 shrink-0">        
        {/* Mover Para */}
        <div className="relative">
          <button 
            title={selectionCount > 0 ? `Mover (${selectionCount})` : 'Mover Filtrados'}
            onClick={() => setShowPastaMenu(!showPastaMenu)} 
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full transition-colors focus:outline-none",
              showPastaMenu 
                ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FolderInput size={18} />
          </button>

          {showPastaMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-3 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Mover para:
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                <button onClick={() => moverParaPasta(null, "Caixa de Entrada", 0)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Caixa de Entrada</span>
                </button>
                {pastas.map((p: any) => (
                  <button key={p.id} onClick={() => moverParaPasta(p.id, p.nome, 0)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span>{p.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Excluir */}
        <button 
          title={selectionCount > 0 ? `Excluir (${selectionCount})` : 'Excluir Filtrados'}
          onClick={() => excluirSelecionados(0)} 
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* CENTER: Banner de Seleção */}
      <div className="flex-1 flex justify-center items-center px-4 overflow-hidden">
        {selectionBannerNode}
      </div>

      {/* RIGHT: Importar e Exportar */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Importar */}
        {showImport && (
          <button 
            title="Importar Planilha"
            onClick={() => setShowImportModal(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <UploadCloud size={18} />
          </button>
        )}

        {/* Exportar */}
        <button 
          title="Exportar Excel"
          onClick={() => exportarExcel()}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
}
