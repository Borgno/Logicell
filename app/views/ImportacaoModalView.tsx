import { X, FileSpreadsheet, Clock, Calendar } from "lucide-react";
import { buscarNomeUsuario } from "~/constants/usuarios";

interface Importacao {
  id: number;
  nomeArquivo: string;
  qtdRegistros: number;
  usuario: string;
  createdAt: string | Date;
}

interface ImportacaoModalProps {
  importacoes: Importacao[];
  onClose: () => void;
}

export function ImportacaoModalView({ importacoes, onClose }: ImportacaoModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-1">Fila de Importação</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">
                {importacoes.length} arquivos processados no histórico
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3 bg-white dark:bg-slate-900">
          {importacoes.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <Clock size={32} className="mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma importação registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {importacoes.map((imp) => (
                <div key={imp.id} className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                        {imp.nomeArquivo}
                      </p>
                    </div>
                    <span className="text-[9px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-lg">
                      {imp.qtdRegistros} REGS
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[9px] font-bold">{new Date(imp.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      POR: <span className="text-blue-500">{buscarNomeUsuario(imp.usuario)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
