import { X, CheckCircle2 } from "lucide-react";

export interface NovoStatusModalProps {
  nome: string;
  setNome: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function NovoStatusModalView({ nome, setNome, handleSubmit, onClose }: NovoStatusModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Criar Status</h2>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Adicionar Novo Status</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Status</label>
            <input 
              autoFocus
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: AGUARDANDO FISCALIZAÇÃO"
              maxLength={40}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold uppercase"
            />
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!nome.trim()}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <CheckCircle2 size={16} /> Salvar Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
