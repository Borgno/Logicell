import { History } from "lucide-react";

import { getStatusStyle } from "~/constants/operacoes";

interface StatusGridProps {
  statusMap: Record<string, number>;
  onStatusClick: (status: string) => void;
}

export function StatusGrid({ statusMap, onStatusClick }: StatusGridProps) {
  const statusPrioritarios = ['PENDENTE', 'DIVERGENTE'];
  const todosStatus = Object.keys(statusMap).sort((a, b) => {
    if (statusPrioritarios.includes(a) && !statusPrioritarios.includes(b)) return -1;
    if (!statusPrioritarios.includes(a) && statusPrioritarios.includes(b)) return 1;
    return statusMap[b] - statusMap[a];
  });

  function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-1 h-4 bg-indigo-600 rounded-full" />
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo Operacional</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {todosStatus.map((status, i) => {
          const count = statusMap[status];
          const style = getStatusStyle(status, i);
          
          return (
            <button 
              key={i} 
              onClick={() => onStatusClick(status)}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between group h-24 relative overflow-hidden",
                style,
                "hover:shadow-md hover:scale-[1.02] active:scale-95"
              )}
            >
              <div>
                <p className="text-[8px] font-black uppercase tracking-tighter mb-1 truncate opacity-70">{status}</p>
                <p className="text-xl font-black tracking-tighter text-slate-800 dark:text-white leading-none">{count}</p>
              </div>
              <div className="flex items-center justify-end">
                <div className="p-1 px-1.5 bg-white/50 dark:bg-slate-800/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <History size={11} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
