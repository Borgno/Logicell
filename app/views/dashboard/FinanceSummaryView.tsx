import { TrendingUp, Scale, Activity } from "lucide-react";
import { formatarMoeda, formatarNumero } from "~/utils/formatters";

interface FinanceSummaryProps {
  totais: {
    _sum: {
      vl_total: number | null;
      vl_peso: number | null;
    };
    _count: {
      id: number;
    };
  };
}

export function FinanceSummaryView({ totais }: FinanceSummaryProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4 px-1 text-left">
        <div className="w-1 h-4 bg-emerald-600 rounded-full" />
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-transparent hover:border-indigo-500/30 transition-all group overflow-hidden text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg"><TrendingUp size={14} /></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Faturamento</span>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter truncate">
            {formatarMoeda(totais._sum.vl_total)}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-transparent hover:border-emerald-500/30 transition-all overflow-hidden text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><Scale size={14} /></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Peso Total</span>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter truncate">
            {formatarNumero(totais._sum.vl_peso)} <small className="text-xs opacity-40">kg</small>
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-transparent hover:border-blue-500/30 transition-all overflow-hidden text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><Activity size={14} /></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Total Itens</span>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter truncate">
            {totais._count.id} <small className="text-xs opacity-40">itens</small>
          </p>
        </div>
      </div>
    </section>
  );
}
