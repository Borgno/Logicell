import { Loader2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, modo: string) => void;
  carregando: boolean;
}

export function ImportModal({ isOpen, onClose, onUpload, carregando }: ImportModalProps) {
  const [importModo, setImportModo] = useState("SUBSTITUIR");

  if (!isOpen) return null;

  const lidarUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file, importModo);
    e.target.value = "";
  };

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card-bg w-full max-w-2xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-glass-border animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-glass-border">
          <h2 className="text-base font-black uppercase tracking-tight text-text">Importar Planilha</h2>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
            Escolha como deseja importar os dados
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <label className={cn("block p-4 rounded-xl border-2 cursor-pointer transition-all", importModo === "SUBSTITUIR" ? "border-primary bg-primary/10" : "border-glass-border hover:border-primary/50 bg-surface")}>
            <div className="flex items-center gap-3 mb-2">
              <input type="radio" name="modo_import" checked={importModo === "SUBSTITUIR"} onChange={() => setImportModo("SUBSTITUIR")} className="w-4 h-4 text-primary accent-primary" />
              <span className="font-black text-sm uppercase text-text">Substituir (Recomendado)</span>
            </div>
            <p className="text-xs text-text-dim ml-7 leading-relaxed">Remove as operações que não estão na planilha nova e atualiza o restante. Ideal para sincronizar os dados mensais.</p>
          </label>

          <label className={cn("block p-4 rounded-xl border-2 cursor-pointer transition-all", importModo === "ADICIONAR" ? "border-primary bg-primary/10" : "border-glass-border hover:border-primary/50 bg-surface")}>
            <div className="flex items-center gap-3 mb-2">
              <input type="radio" name="modo_import" checked={importModo === "ADICIONAR"} onChange={() => setImportModo("ADICIONAR")} className="w-4 h-4 text-primary accent-primary" />
              <span className="font-black text-sm uppercase text-text">Apenas Adicionar</span>
            </div>
            <p className="text-xs text-text-dim ml-7 leading-relaxed">Adiciona novas operações da planilha sem excluir nada do que já está no sistema. Ignora duplicidades automaticamente.</p>
          </label>
        </div>

        <div className="p-6 border-t border-glass-border bg-surface-light flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-surface border border-glass-border rounded-xl font-bold text-sm text-text-muted hover:text-text hover:bg-surface-light transition-all">
            Cancelar
          </button>
          <label htmlFor="import-input-modal" className={cn("flex-1 py-3 rounded-xl font-bold text-sm text-white text-center cursor-pointer shadow-lg transition-all", importModo === "SUBSTITUIR" ? "bg-primary shadow-primary-glow hover:bg-primary/90" : "bg-success shadow-[0_0_15px_rgba(0,102,255,0.3)] hover:bg-success/90")}>
            {carregando ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <UploadCloud size={16} className="inline mr-2" />}
            Selecionar Arquivo
          </label>
          <input type="file" id="import-input-modal" className="hidden" accept=".xls,.xlsx" onChange={lidarUploadLocal} disabled={carregando} />
        </div>
      </div>
    </div>
  );
}
