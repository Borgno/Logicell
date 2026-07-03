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
        className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col w-64 p-3 animate-in zoom-in-95 duration-100 gap-3"
        style={{ top: openFilterCol.rect.bottom + 8, left: Math.max(10, openFilterCol.rect.left - 200 + openFilterCol.rect.width) }}
      >
        <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Coluna</span>
            <button onClick={() => {
                setColumnFilters(p => {
                  const n = {...p}; delete n[openFilterCol.key]; return n;
                });
                setOpenFilterCol(null);
            }} className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Limpar</button>
        </div>

        <select 
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-300"
          value={columnFilters[openFilterCol.key]?.type || "contains"}
          onChange={(e) => {
            const type = e.target.value as FilterType;
            setColumnFilters(p => ({
              ...p,
              [openFilterCol.key]: { type, value: p[openFilterCol.key]?.value || "" }
            }));
          }}
        >
          <option value="contains">Contém</option>
          <option value="equals">É Igual a</option>
          <option value="blank">Vazio (Em branco)</option>
          <option value="notBlank">Não Vazio</option>
        </select>

        {(columnFilters[openFilterCol.key]?.type !== "blank" && columnFilters[openFilterCol.key]?.type !== "notBlank") && (
          <input 
            type="text" 
            placeholder="Valor..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-400/50 transition-all"
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
