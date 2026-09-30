import { clsx, type ClassValue } from "clsx";
import { Download, FolderInput, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useOperacoesStore } from "~/store/useOperacoesStore";
import { normalizarBusca } from "~/utils/formatters";

export interface OperacoesToolbarProps {
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

// Montado só com o menu aberto, então a busca volta vazia a cada abertura.
function PastaMenu({ pastas, moverParaPasta, onClose }: {
  pastas: any[];
  moverParaPasta: OperacoesToolbarProps["moverParaPasta"];
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");

  const opcoes = useMemo(() => {
    const todas = [{ id: null as number | null, nome: "Caixa de Entrada" }, ...pastas.map((p: any) => ({ id: p.id as number | null, nome: p.nome as string }))];
    const query = normalizarBusca(busca.trim());
    if (!query) return todas;
    return todas.filter(o => normalizarBusca(o.nome).includes(query));
  }, [pastas, busca]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && opcoes.length > 0) {
      e.preventDefault();
      moverParaPasta(opcoes[0].id, opcoes[0].nome, 0);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="absolute top-full left-0 mt-2 w-64 bg-card-bg border border-glass-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="px-3 py-2 text-[11px] font-bold text-text-muted border-b border-glass-border uppercase tracking-widest">
        Mover para:
      </div>
      <div className="p-2 border-b border-glass-border">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar pasta..."
            className="w-full bg-card-bg dark:bg-bg rounded-lg pl-7 pr-7 py-1.5 text-xs font-bold outline-none border border-[rgba(0,0,0,0.12)] dark:border-glass-border focus:border-primary text-text placeholder:text-text-dim transition-colors"
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors" title="Limpar busca">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
        {opcoes.map(o => (
          <button key={o.id ?? "caixa-entrada"} onClick={() => moverParaPasta(o.id, o.nome, 0)} className="w-full text-left whitespace-normal break-words px-4 py-2 hover:bg-surface-light text-sm font-medium text-text transition-colors">
            {o.nome}
          </button>
        ))}
        {opcoes.length === 0 && (
          <p className="px-4 py-2 text-xs text-text-muted">Nenhuma pasta encontrada</p>
        )}
      </div>
    </div>
  );
}

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
            <PastaMenu pastas={pastas} moverParaPasta={moverParaPasta} onClose={() => setShowPastaMenu(false)} />
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
