import { X, MapPin, Globe, MoveRight } from "lucide-react";

interface Rota {
  nm_cidade_origem?: string | null;
  nm_cidade_destino?: string | null;
  _count: { id: number };
}

interface GeografiaModalProps {
  topOrigens: Rota[];
  topDestinos: Rota[];
  onClose: () => void;
}

export function GeografiaModal({ topOrigens, topDestinos, onClose }: GeografiaModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-1">Geografia do Fluxo</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Ranking de Rotas e Localidades</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* ORIGENS */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full" /> Maiores Origens
              </p>
              <div className="space-y-3">
                {topOrigens.map((o, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                        {o.nm_cidade_origem || 'Origem não informada'}
                      </span>
                      <span className="text-[10px] font-black text-blue-600 shrink-0">{o._count.id} <small className="opacity-40 uppercase">Itens</small></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(o._count.id / topOrigens[0]._count.id) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DESTINOS */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Maiores Destinos
              </p>
              <div className="space-y-3">
                {topDestinos.map((d, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                        {d.nm_cidade_destino || 'Destino não informado'}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 shrink-0">{d._count.id} <small className="opacity-40 uppercase">Itens</small></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(d._count.id / topDestinos[0]._count.id) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
