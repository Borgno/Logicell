import { useState, useEffect, useRef } from "react";
import { STATUS_OPERACAO } from "~/constants/operacoes";
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

export function EditableCell({ id, campo, valor, coluna, isSelected, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(valor || ""));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Sincroniza o valor interno caso ele mude externamente (e não estejamos editando)
  useEffect(() => {
    if (!isEditing) {
      setTempValue(String(valor || ""));
    }
  }, [valor, isEditing]);

  const handleFinish = () => {
    const finalValue = tempValue.trim();
    if (finalValue !== String(valor || "")) {
      onSave(finalValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinish();
    } else if (e.key === "Escape") {
      setTempValue(String(valor || ""));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (campo === "status") {
      return (
        <div className="absolute inset-0 z-30">
          <select 
            ref={inputRef as any}
            autoFocus 
            value={tempValue} 
            onChange={e => setTempValue(e.target.value)} 
            onBlur={handleFinish}
            className="w-full h-full bg-white dark:bg-slate-800 border-[1.5px] border-indigo-500 px-2 outline-none font-bold text-slate-900 dark:text-white text-[11px]"
          >
            <option value="">Selecione...</option>
            {STATUS_OPERACAO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 z-30">
        <input 
          ref={inputRef as any}
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

  const displayValue = valor;
  const isStatus = campo === "status";

  return (
    <div 
      onDoubleClick={() => setIsEditing(true)}
      className={cn(
        "px-4 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 relative h-full flex items-center group cursor-text min-h-[32px] transition-all",
        (coluna.isNumeric || coluna.isCurrency) && "justify-end text-right tabular-nums",
        isSelected && "bg-indigo-500/10 dark:bg-indigo-500/20"
      )}
    >
      <span className={cn(
        "truncate block",
        isStatus && "px-1.5 py-0.5 rounded-lg text-[9px] font-black inline-block bg-slate-100 dark:bg-slate-800"
      )} title={String(displayValue || "")}>
        {campo === "dt_emissao_" ? formatarData(displayValue) : (coluna.isCurrency ? formatarMoeda(displayValue) : (coluna.isNumeric ? formatarNumero(displayValue) : displayValue || "-"))}
      </span>
      
      <div className={cn(
        "absolute inset-0 border pointer-events-none transition-all",
        isSelected ? "border-indigo-500 z-10" : "border-transparent group-hover:border-indigo-500/20"
      )} />
    </div>
  );
}
