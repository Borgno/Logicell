import React from 'react';
import type { FilterType } from '~/hooks/useOperacoesGridState';

interface ColumnFilterMenuProps {
  openFilterCol: { key: string; rect: DOMRect } | null;
  setOpenFilterCol: (val: any) => void;
  columnFilters: Record<string, { type: FilterType; value: string }>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, { type: FilterType; value: string }>>>;
}

export function ColumnFilterMenu({ openFilterCol, setOpenFilterCol, columnFilters, setColumnFilters }: ColumnFilterMenuProps) {
  if (!openFilterCol) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setOpenFilterCol(null)} />
      <div 
        className="fixed z-[9999] bg-card-bg border border-glass-border rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col w-72 p-5 animate-in zoom-in-95 duration-200 gap-4"
        style={{ top: openFilterCol.rect.bottom + 8, left: Math.max(10, openFilterCol.rect.left - 240 + openFilterCol.rect.width) }}
      >
        <div className="flex justify-between items-center pb-2 border-b border-glass-border">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Filtrar Coluna</span>
            <button onClick={() => {
                setColumnFilters(p => {
                  const n = {...p}; delete n[openFilterCol.key]; return n;
                });
                setOpenFilterCol(null);
            }} className="text-[10px] text-text-muted font-bold uppercase tracking-widest hover:text-error transition-colors bg-surface hover:bg-error/10 px-2 py-1 rounded-md">Limpar</button>
        </div>

        <select 
          className="w-full bg-surface border border-glass-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-text focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='gray'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
          value={columnFilters[openFilterCol.key]?.type || "contains"}
          onChange={(e) => {
            const type = e.target.value as FilterType;
            setColumnFilters(p => ({
              ...p,
              [openFilterCol.key]: { type, value: p[openFilterCol.key]?.value || "" }
            }));
          }}
        >
          <option value="contains" className="bg-card-bg text-text">Contém</option>
          <option value="equals" className="bg-card-bg text-text">É Igual a</option>
          <option value="blank" className="bg-card-bg text-text">Vazio (Em branco)</option>
          <option value="notBlank" className="bg-card-bg text-text">Não Vazio</option>
        </select>

        {(columnFilters[openFilterCol.key]?.type !== "blank" && columnFilters[openFilterCol.key]?.type !== "notBlank") && (
          <input 
            type="text" 
            placeholder="Digite o valor..."
            className="w-full bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-text focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-dim placeholder:font-medium"
            value={columnFilters[openFilterCol.key]?.value || ""}
            onChange={(e) => {
              const value = e.target.value;
              setColumnFilters(p => ({
                ...p,
                [openFilterCol.key]: { type: p[openFilterCol.key]?.type || "contains", value }
              }));
            }}
            autoFocus
          />
        )}
      </div>
    </>
  );
}
