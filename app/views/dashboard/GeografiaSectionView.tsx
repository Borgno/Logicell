import { MapPin } from "lucide-react";

interface GeografiaSectionProps {
  topOrigens: any[];
  topDestinos: any[];
}

export function GeografiaSectionView({ topOrigens, topDestinos }: GeografiaSectionProps) {
  return (
    <section className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex-1 text-left">
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <MapPin size={14} /> Fluxo de Origem
          </p>
          <div className="space-y-4">
            {topOrigens.slice(0, 5).map((o: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-300 w-4">0{i+1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{o.nm_cidade_origem}</span>
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">{o._count.id}</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${(o._count.id / (topOrigens[0]?._count.id || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

        <div className="flex-1 text-left">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <MapPin size={14} /> Fluxo de Destino
          </p>
          <div className="space-y-4">
            {topDestinos.slice(0, 5).map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-300 w-4">0{i+1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.nm_cidade_destino}</span>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">{d._count.id}</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${(d._count.id / (topDestinos[0]?._count.id || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
