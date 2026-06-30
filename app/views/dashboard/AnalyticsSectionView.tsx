import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Globe } from "lucide-react";

interface AnalyticsSectionProps {
  porAgencia: any[];
  porProduto: any[];
  isDark: boolean;
  textColor: string;
  isMounted: boolean;
  CORES: string[];
}

export function AnalyticsSectionView({ porAgencia, porProduto, isDark, textColor, isMounted, CORES }: AnalyticsSectionProps) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Performance por Agência</h3>
          <Activity size={16} className="text-blue-500 opacity-50" />
        </div>
        <div className="h-[250px] w-full">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porAgencia.map((a: any) => ({ name: (a.nm_agencia || '').split('-')[0].trim(), total: a._sum.vl_total }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.5} />
                <XAxis dataKey="name" hide={true} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 10, fontWeight: 800 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip cursor={{ fill: isDark ? '#33415533' : '#6366f111' }} contentStyle={{ borderRadius: '16px', backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', padding: '10px' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mix de Produtos</h3>
          <Globe size={16} className="text-emerald-500 opacity-50" />
        </div>
        <div className="flex-1 min-h-[250px]">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porProduto.map((p: any) => ({ name: p.nm_produto || 'Outros', value: p._count.id }))}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  cx="50%"
                  cy="50%"
                >
                  {porProduto.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', padding: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
