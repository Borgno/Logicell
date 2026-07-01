import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { FolderOpen, Settings, X, Plus, Home, Bot } from "lucide-react";

interface AutomacoesViewProps {
  pastas: any[];
}

export function AutomacoesView({ pastas }: AutomacoesViewProps) {
  const fetcher = useFetcher();
  const [modalPasta, setModalPasta] = useState<any | null>(null);
  const [novaAgencia, setNovaAgencia] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAgencia.trim() || !modalPasta) return;
    
    fetcher.submit(
      { intent: "adicionar", pastaId: modalPasta.id.toString(), agencia: novaAgencia },
      { method: "post" }
    );
    setNovaAgencia("");
  };

  const handleRemove = (regraId: number) => {
    fetcher.submit(
      { intent: "remover", regraId: regraId.toString() },
      { method: "post" }
    );
  };

  const currentModalData = modalPasta ? pastas.find((p: any) => p.id === modalPasta.id) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-8 lg:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <Home size={14} />
              Voltar ao Início
            </Link>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <Bot size={24} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter">Automações</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed max-w-2xl">
                Crie regras de roteamento. Quando importar planilhas, as agências cadastradas serão movidas automaticamente para as pastas corretas.
              </p>
            </div>
          </div>
        </div>

        {/* GRID DE PASTAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastas.map((pasta: any) => (
            <button
              key={pasta.id}
              onClick={() => setModalPasta(pasta)}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-left flex flex-col group h-48 relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" 
                style={{ backgroundColor: pasta.cor || '#4f46e5' }} 
              />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: pasta.cor || '#4f46e5' }}
                >
                  <FolderOpen size={20} />
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings size={16} className="text-slate-500" />
                </div>
              </div>
              
              <div className="mt-auto relative z-10">
                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight truncate">{pasta.nome}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {pasta.regras.length} {pasta.regras.length === 1 ? 'Regra' : 'Regras'}
                </p>
              </div>
            </button>
          ))}
          {pastas.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              Crie pastas primeiro para poder gerenciar as automações.
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DA PASTA */}
      {modalPasta && currentModalData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalPasta(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: currentModalData.cor || '#4f46e5' }}
                >
                  <FolderOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{currentModalData.nome}</h2>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Configurar Triagem</p>
                </div>
              </div>
              <button onClick={() => setModalPasta(null)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-8 flex-1 overflow-y-auto">
              <form onSubmit={handleAdd} className="flex gap-3 mb-8">
                <input 
                  type="text" 
                  placeholder="EX: LUIS EDUARDO MAGALHAES - BA" 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 dark:text-white uppercase placeholder:normal-case placeholder:text-slate-400"
                  value={novaAgencia}
                  onChange={e => setNovaAgencia(e.target.value.toUpperCase())}
                  disabled={fetcher.state !== "idle"}
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!novaAgencia.trim() || fetcher.state !== "idle"}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl px-6 font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus size={18} strokeWidth={3} />
                  Adicionar
                </button>
              </form>

              {fetcher.data?.error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-medium border border-rose-100 dark:border-rose-900/50">
                  {fetcher.data.error}
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Agências Roteadas para esta pasta ({currentModalData.regras.length})</h4>
                
                {currentModalData.regras.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Bot size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Nenhuma agência configurada.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentModalData.regras.map((regra: any) => (
                      <div key={regra.id} className="group flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-1.5 py-1.5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{regra.agencia}</span>
                        <button 
                          onClick={() => handleRemove(regra.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Remover regra"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
