import { FolderOpen, Plus, X, Folder } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

interface AutomacoesViewProps {
  pastas: any[];
}

export function AutomacoesView({ pastas }: AutomacoesViewProps) {
  const fetcher = useFetcher();
  const [modalPasta, setModalPasta] = useState<any | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [tipoRegra, setTipoRegra] = useState<'agencia' | 'cliente' | 'produto'>('agencia');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoValor.trim() || !modalPasta) return;
    
    fetcher.submit(
      { intent: "adicionar", pastaId: modalPasta.id.toString(), tipo: tipoRegra, valor: novoValor },
      { method: "post" }
    );
    setNovoValor("");
  };

  const handleRemove = (regraId: number) => {
    fetcher.submit(
      { intent: "remover", regraId: regraId.toString() },
      { method: "post" }
    );
  };

  const currentModalData = modalPasta ? pastas.find((p: any) => p.id === modalPasta.id) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-text overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full">
        {/* SIMPLE GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {pastas.map((pasta: any) => {
            // Se a pasta não tiver cor definida, usamos um cinza neutro
            const hexColor = pasta.cor || '#64748b';
            
            return (
              <button
                key={pasta.id}
                onClick={() => setModalPasta(pasta)}
                className="card group h-28 flex flex-col items-center justify-center gap-2 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 relative focus:outline-none"
                style={{
                  backgroundColor: `${hexColor}0A`,
                  borderColor: `${hexColor}33`,
                  borderWidth: '1px'
                }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[inherit]" 
                  style={{ border: `1px solid ${hexColor}` }} 
                />

                {pasta.regras.length > 0 && (
                  <div 
                    className="absolute top-2 right-2 flex items-center justify-center w-[18px] h-[18px] rounded-sm text-[9px] font-bold"
                    style={{ backgroundColor: `${hexColor}20`, color: hexColor }}
                  >
                    {pasta.regras.length}
                  </div>
                )}
                
                <Folder 
                  size={24} 
                  className="transition-transform group-hover:-translate-y-0.5" 
                  style={{ color: hexColor }}
                />
                <span className="font-semibold text-xs text-text text-center px-3 leading-snug w-full">
                  {pasta.nome}
                </span>
              </button>
            );
          })}
          
          {pastas.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <Folder size={48} className="text-text-dim mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-text mb-2">Sem pastas disponíveis</h3>
              <p className="text-text-muted max-w-md">Crie pastas na tela principal primeiro para poder configurar regras de roteamento.</p>
            </div>
          )}
        </div>
      </div>      {/* MODAL DE GERENCIAMENTO DA PASTA */}
      {modalPasta && currentModalData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setModalPasta(null)}>
          <div className="bg-card-bg w-full max-w-2xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-glass-border animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            
            {/* Header com fundo padrão do modal para consistência */}
            <div className="relative p-8 pb-6 border-b border-glass-border bg-surface shrink-0">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h2 className="text-lg font-bold text-text tracking-tight mb-1">{currentModalData.nome}</h2>
                  <p className="text-xs font-medium text-text-muted">Regras de Roteamento Automático</p>
                </div>
                <button className="text-text-muted hover:text-text bg-surface-light hover:bg-glass-border p-2 rounded-lg transition-colors border border-transparent" onClick={() => setModalPasta(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Modal */}
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 bg-card-bg">
              
              {/* ADD NEW RULE SECTION */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Adicionar Regra</label>
                </div>
                
                <form onSubmit={handleAdd} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {/* Segmented Control custom */}
                    <div className="flex bg-surface p-1 rounded-xl border border-glass-border h-11 items-center self-start">
                      <button 
                        type="button"
                        onClick={() => setTipoRegra('agencia')}
                        className={`px-4 h-full flex items-center justify-center text-sm font-bold rounded-lg transition-all ${tipoRegra === 'agencia' ? 'bg-card-bg text-text shadow-sm border border-glass-border' : 'text-text-muted hover:text-text border border-transparent'}`}
                      >
                        Agência
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTipoRegra('cliente')}
                        className={`px-4 h-full flex items-center justify-center text-sm font-bold rounded-lg transition-all ${tipoRegra === 'cliente' ? 'bg-card-bg text-text shadow-sm border border-glass-border' : 'text-text-muted hover:text-text border border-transparent'}`}
                      >
                        Cliente
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTipoRegra('produto')}
                        className={`px-4 h-full flex items-center justify-center text-sm font-bold rounded-lg transition-all ${tipoRegra === 'produto' ? 'bg-card-bg text-text shadow-sm border border-glass-border' : 'text-text-muted hover:text-text border border-transparent'}`}
                      >
                        Produto
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          placeholder={tipoRegra === 'agencia' ? "Ex: NOME DA AGÊNCIA" : tipoRegra === 'cliente' ? "Ex: NOME DO CLIENTE" : "Ex: NOME DO PRODUTO"} 
                          className="w-full h-11 bg-surface border border-glass-border rounded-xl px-4 text-sm font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text uppercase placeholder:normal-case placeholder:font-medium placeholder:text-text-dim transition-all outline-none"
                          value={novoValor}
                          onChange={e => setNovoValor(e.target.value.toUpperCase())}
                          disabled={fetcher.state !== "idle"}
                          autoFocus
                        />
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={!novoValor.trim() || fetcher.state !== "idle"}
                        className="h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl px-5 font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              {fetcher.data?.error && (
                <div className="bg-error/10 text-error border border-error/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                  {fetcher.data.error}
                </div>
              )}
              {currentModalData.regras.some((r: any) => r.hasConflict) && (
                <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl p-4 text-sm font-medium flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Atenção: Alguns itens desta pasta também estão em outras pastas e causam ambiguidade. O sistema não saberá para onde enviar e enviará para a caixa de entrada.
                </div>
              )}

              {/* RULES LIST */}
              <section className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3 border-b border-glass-border pb-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                    Regras Ativas 
                    <span className="px-1.5 py-0.5 rounded-md bg-surface text-[10px] text-text-muted border border-glass-border">{currentModalData.regras.length}</span>
                  </label>
                </div>
                
                {currentModalData.regras.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-glass-border flex items-center justify-center mb-4 text-text-dim -rotate-6 shadow-sm">
                      <FolderOpen size={24} />
                    </div>
                    <h4 className="text-text font-bold mb-1">Lista Vazia</h4>
                    <p className="text-text-muted text-sm max-w-[250px]">Nenhuma regra de triagem foi configurada para esta pasta ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-4">
                    {currentModalData.regras.map((regra: any) => (
                      <div key={regra.id} className="group flex items-center justify-between px-3 py-2 rounded-lg bg-surface hover:bg-surface-light border border-glass-border hover:border-glass-border transition-all">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${regra.agencia ? 'bg-badge-primary-bg text-badge-primary-text' : regra.produto ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20' : 'bg-surface text-text-muted border border-glass-border'}`}>
                            {regra.agencia ? 'Agência' : regra.produto ? 'Produto' : 'Cliente'}
                          </span>
                          <span className={`text-sm font-bold truncate flex items-center ${regra.hasConflict ? 'text-amber-500' : 'text-text'}`} title={regra.agencia || regra.cliente || regra.produto}>
                            {regra.agencia || regra.cliente || regra.produto}
                          </span>
                          {regra.hasConflict && (
                            <span className="shrink-0 text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Conflito</span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleRemove(regra.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remover regra"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
