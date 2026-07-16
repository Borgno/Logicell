import { FileSpreadsheet } from "lucide-react";

interface RecentImportsListProps {
  imports: any[];
  totalCount: number;
}

export function RecentImportsList({ imports, totalCount }: RecentImportsListProps) {
  return (
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
          imports.map((imp: any) => (
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
              
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                <div className="text-sm font-bold text-text">
                  {imp.qtdRegistros.toLocaleString('pt-BR')} <span className="text-[10px] text-text-muted uppercase tracking-widest">regs</span>
                </div>
                <div className="text-xs font-medium text-text-muted bg-bg px-2.5 py-1 rounded-md border border-glass-border">
                  {new Date(imp.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
