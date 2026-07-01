import { useLoaderData, data, useNavigate, Link } from "react-router";
import { Layers, FileSpreadsheet, ChevronRight, X, TrendingUp, Scale, MapPin, Activity, Globe, Bot } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { requireUser } from "~/services/auth.server";

import { ImportacaoModalView } from "~/views/ImportacaoModalView";
import { GeografiaModalView } from "~/views/GeografiaModalView";
import { formatarMoeda, formatarNumero, buscarNomeUsuario } from "~/utils/formatters";
import type { LoaderFunctionArgs } from "react-router";
import { DashboardService } from "~/services/dashboard.server";

// Lazy: o chunk do Recharts só é baixado quando o Dashboard é acessado
const AnalyticsSectionView = lazy(() =>
  import("~/views/dashboard/AnalyticsSectionView").then(m => ({ default: m.AnalyticsSectionView }))
);

const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];


function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface DashboardViewProps {
  estatisticas: any;
}

export function DashboardView({ estatisticas }: DashboardViewProps) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [modalStatus, setModalStatus] = useState<string | null>(null);
  const [showGeografiaModal, setShowGeografiaModal] = useState(false);
  const [showImportacaoModal, setShowImportacaoModal] = useState(false);


  useEffect(() => {
    setIsMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!estatisticas || !estatisticas.porAgencia) return null;

  const statusMap = estatisticas.totais.statusMap || {};
  const todosStatus = Object.keys(statusMap).sort((a, b) => {
    return statusMap[b] - statusMap[a];
  });

  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Modal Genérico de Diagnóstico Status */}
      {modalStatus && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalStatus(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">{modalStatus}</h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Localização nas Pastas</p>
              </div>
              <button onClick={() => setModalStatus(null)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {estatisticas.detailedBreakdowns[modalStatus]?.map((item: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setModalStatus(null);
                      const target = item.id === null ? '/caixa-de-entrada' : `/pastas/${item.id}`;
                      navigate(target, { 
                        state: { colFilter_status: `equals:${modalStatus}` }
                      });
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-blue-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                        {item.count}
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-100 text-sm">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOCO 1: HUB OPERACIONAL (STATUS NO TOPO) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo Operacional</h2>
          </div>
          <p className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-lg">Clique para ver as operações</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {todosStatus.map((status, i) => {
            const count = statusMap[status];
            
            return (
              <button 
                key={i} 
                onClick={() => setModalStatus(status)}
                className={cn(
                  "p-4 rounded-3xl border transition-all text-left flex flex-col justify-between group h-28 relative overflow-hidden",
                  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                  "hover:shadow-md hover:scale-[1.02] active:scale-95"
                )}
              >
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1 truncate opacity-80">{status}</p>
                  <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{count}</p>
                </div>

              </button>
            );
          })}
        </div>
      </section>

      {/* BLOCO 2: RESUMO EXECUTIVO */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-around relative group">
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-emerald-500" /> Faturamento Total
            </span>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums leading-none">
              {formatarMoeda(estatisticas.totais._sum.vl_total)}
            </p>
          </div>
          
          <div className="w-[1px] h-12 bg-slate-100 dark:bg-slate-800" />
          
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3 flex items-center gap-1.5">
              <Scale size={12} className="text-blue-500" /> Volume Processado
            </span>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums leading-none">
              {formatarNumero(estatisticas.totais._sum.vl_peso)} <small className="text-sm font-bold opacity-30 uppercase">kg</small>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/caixa-de-entrada')}
            className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between px-5 hover:border-blue-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group"
          >
            <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Todas Operações</p>
                <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{estatisticas.totais._count.id} <small className="text-xs font-bold opacity-40 uppercase">Itens</small></p>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Layers size={18} />
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/automacoes')}
            className="w-full bg-indigo-600 rounded-[2rem] p-4 border border-indigo-500 shadow-sm flex items-center justify-between px-5 hover:bg-indigo-700 transition-all group"
            title="Automações de Agência"
          >
            <div className="text-left">
                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1 leading-none">Regras de Triagem</p>
                <p className="text-xl font-black text-white leading-none">Automações</p>
            </div>
            <div className="p-2.5 bg-indigo-500 rounded-2xl text-white group-hover:scale-110 transition-all">
              <Bot size={18} />
            </div>
          </button>
        </div>
      </section>

      {/* BLOCO 3: ANALYTICS — carregado de forma lazy (Recharts só baixa quando o dashboard abre) */}
      <Suspense fallback={
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-[330px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="h-[330px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>
      }>
        <AnalyticsSectionView
          porAgencia={estatisticas.porAgencia}
          porProduto={estatisticas.porProduto}
          isDark={isDark}
          textColor={textColor}
          isMounted={isMounted}
          CORES={CORES}
        />
      </Suspense>


      {/* BLOCO 4: LOGÍSTICA (GEOGRAFIA) */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Geografia do Fluxo Logístico</h3>
          </div>
          <button 
            onClick={() => setShowGeografiaModal(true)}
            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            Ver Mais Detalhes
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Maiores Origens
            </p>
            <div className="space-y-4">
              {estatisticas.topOrigens.slice(0, 5).map((o: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500/50 w-4">0{i+1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{o.nm_cidade_origem}</span>
                      <span className="text-[10px] font-black text-blue-600">{o._count.id}</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${(o._count.id / estatisticas.topOrigens[0]._count.id) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Maiores Destinos
            </p>
            <div className="space-y-4">
              {estatisticas.topDestinos.slice(0, 5).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500/50 w-4">0{i+1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.nm_cidade_destino}</span>
                      <span className="text-[10px] font-black text-emerald-600">{d._count.id}</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(d._count.id / estatisticas.topDestinos[0]._count.id) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 5: FILA DE IMPORTAÇÃO (TIMELINE COMPACTA) */}
      <section className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Fila de Importação Recente</h3>
          <button 
            onClick={() => setShowImportacaoModal(true)}
            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-white dark:bg-slate-800 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"
          >
            Ver Histórico Completo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {estatisticas.ultimasImportacoes?.slice(0, 3).map((imp: any) => (
            <div key={imp.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet size={16} className="text-blue-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-100 truncate">{imp.nomeArquivo}</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(imp.createdAt).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[8px] font-black text-blue-500 uppercase">POR: {buscarNomeUsuario(imp.usuario)}</p>
                </div>
                <span className="text-[9px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-lg">
                  {imp.qtdRegistros} Regs
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>


      {showImportacaoModal && (
        <ImportacaoModalView 
          importacoes={estatisticas.ultimasImportacoes} 
          onClose={() => setShowImportacaoModal(false)}
        />
      )}

      {showGeografiaModal && (
        <GeografiaModalView 
          topOrigens={estatisticas.topOrigens} 
          topDestinos={estatisticas.topDestinos} 
          onClose={() => setShowGeografiaModal(false)}
        />
      )}
    </div>
  );
}
