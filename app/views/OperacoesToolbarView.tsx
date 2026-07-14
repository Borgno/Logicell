import { clsx, type ClassValue } from "clsx";
import { Download, FolderInput, Trash2, UploadCloud } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useOperacoesStore } from "~/store/useOperacoesStore";

export interface OperacoesToolbarProps {
  dadosPromise: any;
  pastas: any[];
  nomePasta: string;
  showImport: boolean;
  carregando: boolean;
  
  selectionCount: number;
  
  moverParaPasta: (id: number | null, nome: string, total: number) => void;
  excluirSelecionados: (total: number) => void;
  exportarExcel: () => void;

  selectionBannerNode?: React.ReactNode;
}

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function OperacoesToolbarView({
  pastas, showImport,
  selectionCount,
  moverParaPasta, excluirSelecionados, exportarExcel,
  selectionBannerNode
}: OperacoesToolbarProps) {
  const showPastaMenu = useOperacoesStore(s => s.showPastaMenu);
  const setShowPastaMenu = useOperacoesStore(s => s.setShowPastaMenu);
  const setShowImportModal = useOperacoesStore(s => s.setShowImportModal);

  return (
    <div className="flex items-center justify-between p-2 border-b border-glass-border bg-transparent shrink-0">
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
                ? "bg-surface-light text-text" 
                : "text-text-muted hover:text-text hover:bg-surface-light"
            )}
          >
            <FolderInput size={18} />
          </button>

          {showPastaMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card-bg border border-glass-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-3 py-2 text-[11px] font-bold text-text-muted border-b border-glass-border uppercase tracking-widest">
                Mover para:
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                <button onClick={() => moverParaPasta(null, "Caixa de Entrada", 0)} className="w-full text-left whitespace-normal break-words px-4 py-2 hover:bg-surface-light text-sm font-medium text-text transition-colors">
                  Caixa de Entrada
                </button>
                {pastas.map((p: any) => (
                  <button key={p.id} onClick={() => moverParaPasta(p.id, p.nome, 0)} className="w-full text-left whitespace-normal break-words px-4 py-2 hover:bg-surface-light text-sm font-medium text-text transition-colors">
                    {p.nome}
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
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-error hover:bg-error/10 transition-colors focus:outline-none"
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
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-light transition-colors focus:outline-none"
          >
            <UploadCloud size={18} />
          </button>
        )}

        {/* Exportar */}
        <button 
          title="Exportar Excel"
          onClick={() => exportarExcel()}
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-light transition-colors focus:outline-none"
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
}
