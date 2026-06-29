import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Globe } from "lucide-react";

const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

interface AnalyticsSectionProps {
  porAgencia: any[];
  porProduto: any[];
  isDark: boolean;
  textColor: string;
}

export function AnalyticsSectionView({ porAgencia, porProduto, isDark, textColor }: AnalyticsSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-1 h-4 bg-blue-600 rounded-full" />
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição e Performance</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Agência */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fluxo por Agência</h3>
            <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[8px] font-black uppercase">Top 10</div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porAgencia.slice(0, 10).map((a: any) => ({ name: (a.nm_agencia || '').split('-')[0].trim(), total: a._sum.vl_total }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 9, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 9, fontWeight: 800 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: isDark ? '#ffffff05' : '#00000005' }}
                  contentStyle={{ borderRadius: '16px', backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', padding: '10px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mix de Produtos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col text-left">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Mix de Produtos</h3>
            <Globe size={14} className="text-emerald-500" />
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={porProduto.slice(0, 6).map((p: any) => ({ name: p.nm_produto || 'Outros', value: p._count.id }))} 
                  innerRadius={50} 
                  outerRadius={75} 
                  paddingAngle={6} 
                  dataKey="value" 
                  stroke="none"
                  cx="50%"
                  cy="45%"
                >
                  {porProduto.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', padding: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
