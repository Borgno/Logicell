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
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
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
          <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            Cancelar
          </button>
          <label htmlFor="import-input-modal" className={cn("flex-1 py-3 rounded-xl font-bold text-sm text-white text-center cursor-pointer shadow-lg transition-all", importModo === "SUBSTITUIR" ? "bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700" : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700")}>
            {carregando ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <UploadCloud size={16} className="inline mr-2" />}
            Selecionar Arquivo
          </label>
          <input type="file" id="import-input-modal" className="hidden" accept=".xls,.xlsx" onChange={lidarUploadLocal} disabled={carregando} />
        </div>
      </div>
    </div>
  );
}
