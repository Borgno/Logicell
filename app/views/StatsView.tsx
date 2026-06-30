import { LayoutDashboard, X, History } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { StatusGridView } from "./dashboard/StatusGridView";
import { FinanceSummaryView } from "./dashboard/FinanceSummaryView";
import { GeografiaSectionView } from "./dashboard/GeografiaSectionView";
import { StatusDetailModalView } from "./dashboard/StatusDetailModalView";

const AnalyticsSectionView = lazy(() =>
  import("./dashboard/AnalyticsSectionView").then(m => ({ default: m.AnalyticsSectionView }))
);

const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

interface StatsViewProps {
  stats: any;
  onClose: () => void;
  onOpenHistory: () => void;
  onApplyFilter: (status: string) => void;
  nomePasta: string;
}

export function StatsView({ stats, onClose, onOpenHistory, onApplyFilter, nomePasta }: StatsViewProps) {
  const [isDark, setIsDark] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  if (!stats || !stats.porAgencia) return null;

  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-400 overflow-hidden flex flex-col relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none">Dashboard: {nomePasta}</h2>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1 text-left">Análise Operacional</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-indigo-500/30"
            >
              <History size={14} className="text-indigo-500" />
              <span>Auditoria</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8 pb-12">
          <StatusGridView 
            statusMap={stats.totais.statusMap} 
            onStatusClick={onApplyFilter} 
          />

          <FinanceSummaryView totais={stats.totais} />

          <Suspense fallback={
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="h-[330px] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse bg-slate-100 dark:bg-slate-800" />
              <div className="h-[330px] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse bg-slate-100 dark:bg-slate-800" />
            </div>
          }>
            <AnalyticsSectionView
              porAgencia={stats.porAgencia}
              porProduto={stats.porProduto}
              isDark={isDark}
              textColor={textColor}
              isMounted={isMounted}
              CORES={CORES}
            />
          </Suspense>

          <GeografiaSectionView 
            topOrigens={stats.topOrigens} 
            topDestinos={stats.topDestinos} 
          />
        </div>
      </div>
    </div>
  );
}
