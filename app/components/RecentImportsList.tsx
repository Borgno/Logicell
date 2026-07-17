import { FileSpreadsheet, RotateCcw } from "lucide-react";
import { useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { GlobalModal } from "./GlobalModal";

interface RecentImportsListProps {
  imports: any[];
  totalCount: number;
}

export function RecentImportsList({ imports, totalCount }: RecentImportsListProps) {
  const fetcher = useFetcher();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<{ id: number, name: string } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean, title: string, message: string, variant: 'success' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'success'
  });
  
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.error) {
        setFeedbackModal({
          isOpen: true,
          title: "Erro na Restauração",
          message: fetcher.data.error,
          variant: "error"
        });
      } else if (fetcher.data.success) {
        setFeedbackModal({
          isOpen: true,
          title: "Versão Restaurada!",
          message: fetcher.data.message || "Importação desfeita com sucesso!",
          variant: "success"
        });
      }
    }
  }, [fetcher.data]);

  const openConfirmModal = (importacaoId: number, name: string) => {
    setSelectedImport({ id: importacaoId, name });
    setModalOpen(true);
  };

  const handleConfirmUndo = () => {
    if (selectedImport) {
      fetcher.submit(
        { intent: "undoImport", importacaoId: selectedImport.id.toString() },
        { method: "post" }
      );
    }
  };

  return (
    <>
    <div className="bg-card-bg border border-glass-border rounded-3xl p-6 shadow-card mt-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-widest">
            Histórico Recente
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-surface text-[10px] font-bold uppercase tracking-widest text-text-muted border border-glass-border">
          {totalCount} {totalCount === 1 ? 'planilha' : 'planilhas'}
        </span>
      </div>
      
      <div className="flex flex-col gap-2">
        {imports.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center italic">Nenhuma planilha encontrada.</p>
        ) : (
          imports.map((imp: any, index: number) => {
            const isCurrentVersion = index === 0;

            return (
            <div key={imp.id} className="group flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 rounded-xl bg-surface hover:bg-surface-light border border-glass-border hover:border-glass-border transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text truncate max-w-[200px] sm:max-w-md">{imp.nomeArquivo}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">
                    {imp.usuario}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                <div className="text-sm font-bold text-text hidden sm:block">
                  {imp.qtdRegistros.toLocaleString('pt-BR')} <span className="text-[10px] text-text-muted uppercase tracking-widest">regs</span>
                </div>
                <div className="text-xs font-medium text-text-muted bg-bg px-2.5 py-1 rounded-md border border-glass-border whitespace-nowrap">
                  {new Date(imp.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
                {isCurrentVersion ? (
                  <button 
                    disabled
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface text-text-muted border border-glass-border text-xs font-bold cursor-not-allowed opacity-50"
                    title="Você já está nesta versão"
                  >
                    <span className="hidden sm:inline">Versão Atual</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => openConfirmModal(imp.id, imp.nomeArquivo)}
                    disabled={fetcher.state !== "idle"}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors border border-orange-500/20 text-xs font-bold"
                    title="Restaurar o banco de dados para a ultima versão desta importação"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Restaurar Versão</span>
                  </button>
                )}
              </div>
            </div>
          )})
        )}
      </div>
    </div>

    <GlobalModal
      isOpen={modalOpen}
      title="Máquina do Tempo"
      message={`Restaurar o sistema para a ultima versão da planilha "${selectedImport?.name}".\n\nTem certeza que deseja restaurar esta versão?`}
      variant="danger"
      onConfirm={handleConfirmUndo}
      onClose={() => setModalOpen(false)}
    />

    <GlobalModal
      isOpen={feedbackModal.isOpen}
      title={feedbackModal.title}
      message={feedbackModal.message}
      variant={feedbackModal.variant}
      isAlert={true}
      onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
    />
    </>
  );
}
