import { useState, useEffect, useRef, memo } from "react";
import { STATUS_OPERACAO, getStatusStyle } from "~/constants/operacoes";
import { formatarMoeda, formatarData, formatarNumero } from "~/utils/formatters";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface EditableCellProps {
  id: number;
  campo: string;
  valor: any;
  coluna: {
    key: string;
    label: string;
    width: string;
    isNumeric?: boolean;
    isCurrency?: boolean;
  };
  isSelected?: boolean;
  onSave: (valor: string) => void;
}

export const EditableCell = memo(function EditableCell({ id, campo, valor, coluna, isSelected, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(valor || ""));
  const [isOpen, setIsOpen] = useState(false);
  
  // Sincroniza o valor interno caso ele mude externamente
  useEffect(() => {
    if (!isEditing) setTempValue(String(valor || ""));
  }, [valor, isEditing]);

  const handleFinish = () => {
    const finalValue = tempValue.trim();
    if (finalValue !== String(valor || "")) onSave(finalValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFinish();
    else if (e.key === "Escape") {
      setTempValue(String(valor || ""));
      setIsEditing(false);
    }
  };

  const displayValue = valor;
  const isStatus = campo === "status";

  if (isEditing) {
    if (isStatus) {
      return (
        <div className="absolute inset-0 z-30">
          <div className="relative w-full h-full">
            <button
              type="button"
              autoFocus
              className="w-full h-full flex items-center justify-between px-3 text-left outline-none bg-white dark:bg-slate-800 border-[1.5px] border-indigo-500 font-bold text-slate-900 dark:text-white text-[11px]"
              onClick={() => setIsOpen(!isOpen)}
              onBlur={() => setTimeout(handleFinish, 180)}
            >
              <span className="truncate">{tempValue || "Selecione..."}</span>
            </button>

            {isOpen && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl z-50 py-1.5 custom-scrollbar text-[11px] font-bold"
                onMouseDown={e => e.preventDefault()}
              >
                <div
                  className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400 dark:text-slate-500 transition-colors"
                  onClick={() => { setTempValue(""); onSave(""); setIsEditing(false); }}
                >
                  Selecione...
                </div>
                {STATUS_OPERACAO.map(opt => (
                  <div
                    key={opt}
                    className={cn(
                      "px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all flex items-center gap-2",
                      tempValue === opt && "bg-slate-50 dark:bg-slate-800"
                    )}
                    onClick={() => { setTempValue(opt); onSave(opt); setIsEditing(false); }}
                  >
                    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black border", getStatusStyle(opt))}>
                      {opt}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 z-30">
        <input 
          autoFocus 
          value={tempValue} 
          onChange={e => setTempValue(e.target.value)} 
          onBlur={handleFinish}
          onKeyDown={handleKeyDown}
          maxLength={2000}
          className="w-full h-full bg-white dark:bg-slate-800 border-[1.5px] border-indigo-500 px-4 outline-none font-bold text-slate-900 dark:text-white text-[11px]"
        />
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={() => { setIsEditing(true); if(isStatus) setIsOpen(true); }}
      className={cn(
        "px-4 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 relative h-full flex items-center group cursor-text min-h-[32px] transition-all",
        (coluna.isNumeric || coluna.isCurrency) && "justify-end text-right tabular-nums",
        isSelected && "bg-indigo-500/10 dark:bg-indigo-500/20"
      )}
    >
      <span className={cn(
        "truncate block",
        isStatus && cn("px-1.5 py-0.5 rounded-lg text-[9px] font-black inline-block border", getStatusStyle(displayValue))
      )} title={String(displayValue || "")}>
        {campo === "dt_emissao_" ? formatarData(displayValue) : (coluna.isCurrency ? formatarMoeda(displayValue) : (coluna.isNumeric ? formatarNumero(displayValue) : displayValue || "-"))}
      </span>
      
      <div className={cn(
        "absolute inset-0 border pointer-events-none transition-all",
        isSelected ? "border-indigo-500 z-10" : "border-transparent group-hover:border-indigo-500/20"
      )} />
    </div>
  );
}, (prev, next) => {
  return prev.valor === next.valor && prev.isSelected === next.isSelected;
});
