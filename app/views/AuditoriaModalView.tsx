import { X, History, Clock, ArrowRight, User, Trash2, Edit3, PlusCircle, LayoutList, ChevronDown, ListFilter } from "lucide-react";
import { COLUNAS_OPERACAO } from "~/constants/operacoes";
import { formatarMoeda, formatarData } from "~/utils/formatters";
import { buscarNomeUsuario } from "~/constants/usuarios";

interface AuditoriaModalProps {
  operacaoId?: number | null;
  pastaId?: number | null | "null";
  title?: string;
  onClose: () => void;
}

// Inner Component para renderizar as Tags de Identificação
function BusinessTags({ data }: { data: any }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
        {data.agencia}
      </span>
      <span className="text-[8px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
        CTe: {data.ctrc}
      </span>
      <span className="text-[8px] font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
        NF: {data.nf}
      </span>
      {data.total !== undefined && (
        <span className="text-[8px] font-black bg-slate-50 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
          {formatarMoeda(data.total)}
        </span>
      )}
      {data.emissao && (
        <span className="text-[8px] font-black bg-slate-50 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
          {formatarData(data.emissao)}
        </span>
      )}
    </div>
  );
}

export function AuditoriaModalView({
  operacaoId, pastaId, title, onClose, historico, usuariosDisponiveis, isLoading,
  usuarioFiltro, setUsuarioFiltro, showBulkDetails, setShowBulkDetails, getLabel, safeParse
}: any) {
  const renderBusinessKey = (log: any) => {
    try {
      const details = safeParse(log.detalhes);
      if (!details || details.isLegacy) return null;

      const snapshot = Array.isArray(details) ? details[0] : (details.itens?.[0] || details);
      if (!snapshot?.agencia && !log.operacao) return null;

      const data = {
        agencia: snapshot.agencia || log.operacao?.nm_agencia,
        ctrc: snapshot.ctrc || log.operacao?.nr_ctrc,
        nf: snapshot.nf || log.operacao?.nr_nf,
        total: snapshot.total !== undefined ? snapshot.total : log.operacao?.vl_total,
        emissao: snapshot.emissao || log.operacao?.dt_emissao_
      };

      return <BusinessTags data={data} />;
    } catch(e) { return null; }
  };

  if (!operacaoId && !pastaId && title !== "Histórico Geral") return null;

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
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-1">{title}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rastreabilidade Logicell</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* FILTRO DE USUÁRIO */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-black/10 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <User size={14} />
            <select 
              value={usuarioFiltro} 
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-500 focus:text-indigo-600 transition-colors cursor-pointer appearance-none"
            >
              <option value="">TODOS OS USUÁRIOS</option>
              {usuariosDisponiveis.map((u: string) => <option key={u} value={u} className="dark:bg-slate-900">{buscarNomeUsuario(u)}</option>)}
            </select>
            <ChevronDown size={12} className="opacity-40" />
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4 bg-white dark:bg-slate-900">
          {isLoading && historico.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando Tags...</span>
            </div>
          ) : historico.length === 0 ? (
            <div className="py-10 text-center opacity-40">
              <Clock size={32} className="mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((log: any) => {
                const details = safeParse(log.detalhes);
                const isBulk = log.tipo?.includes('BULK');
                const labelAcao = getLabel(log.tipo);
                const labelCampo = log.campo ? getLabel(log.campo) : null;

                return (
                  <div key={log.id} className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          log.tipo?.includes('DELETE') ? 'bg-rose-500/10 text-rose-500' :
                          log.tipo?.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-500' :
                          log.tipo?.includes('MOVE') ? 'bg-amber-500/10 text-amber-600' :
                          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {labelCampo ? `Alterou ${labelCampo}` : labelAcao}
                        </span>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {buscarNomeUsuario(log.usuario)} • {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      {!isBulk && renderBusinessKey(log)}
                    </div>

                    {isBulk ? (
                      <div className="space-y-2">
                        {log.tipo === 'BULK_MOVE' && (
                          <div className="text-[10px] font-bold text-slate-500 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 mb-2">
                            Mover de <span className="text-amber-600">{details?.origem}</span> Para <span className="text-amber-600">{details?.destino}</span>
                          </div>
                        )}
                        <button 
                          onClick={() => setShowBulkDetails(showBulkDetails === String(log.id) ? null : String(log.id))}
                          className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                        >
                          <ListFilter size={12} /> {showBulkDetails === String(log.id) ? "Recolher Lista" : `Ver ${Array.isArray(details) ? details.length : details?.itens?.length} itens afetados`}
                        </button>
                        {showBulkDetails === String(log.id) && (
                          <div className="p-3 bg-white dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                            {(Array.isArray(details) ? details : (details?.itens || [])).map((i: any, idx: number) => {
                              const itemData = {
                                agencia: i.agencia,
                                ctrc: i.ctrc,
                                nf: i.nf,
                                total: i.total,
                                emissao: i.emissao
                              };
                              return (
                                <div key={idx} className="bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                                  <BusinessTags data={itemData} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : log.tipo === 'UPDATE' ? (
                      <div className="flex items-center gap-2 text-[10px] bg-white dark:bg-black/20 p-2 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner">
                        <span className="flex-1 truncate opacity-50 line-through decoration-rose-500/20">{log.valorAntigo || '-'}</span>
                        <ArrowRight size={10} className="text-slate-300 shrink-0" />
                        <span className="flex-1 truncate font-black text-indigo-600 dark:text-indigo-400">{log.valorNovo || '-'}</span>
                      </div>
                    ) : log.tipo === 'MOVE' ? (
                        <div className="text-[10px] font-bold text-slate-500 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                          De <span className="text-amber-600">{details?.origem}</span> Para <span className="text-amber-600">{details?.destino}</span>
                        </div>
                    ) : (details?.mensagem || (details?.isLegacy && log.detalhes)) ? (
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic leading-relaxed bg-slate-100/50 dark:bg-black/10 p-2 rounded-xl">
                        {details?.mensagem || log.detalhes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
