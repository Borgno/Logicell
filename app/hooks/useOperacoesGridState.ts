import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import { COLUNAS_OPERACAO } from "~/constants/operacoes";

export type FilterType = "contains" | "equals" | "blank" | "notBlank";
export type Range = { start: {rowIdx: number, colIdx: number}, end: {rowIdx: number, colIdx: number} };

export function useOperacoesGridState(initialColumnOrder: string[] | null, initialWidths: Record<string, number>) {
  const [searchParams] = useSearchParams();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, { type: FilterType, value: string }>>(() => {
    const init: any = {};
    if (searchParams.get("status")) {
      init["status"] = { type: "equals", value: searchParams.get("status")! };
    }
    return init;
  });
  const [openFilterCol, setOpenFilterCol] = useState<{ key: string, rect: DOMRect } | null>(null);

  const [selectedRanges, setSelectedRanges] = useState<Range[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const orderedColumns = useMemo(() => {
    if (!initialColumnOrder) return COLUNAS_OPERACAO;
    return [...COLUNAS_OPERACAO].sort((a, b) => {
      const idxA = initialColumnOrder.indexOf(a.key);
      const idxB = initialColumnOrder.indexOf(b.key);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [initialColumnOrder]);

  return {
    columnWidths, setColumnWidths,
    columnFilters, setColumnFilters,
    openFilterCol, setOpenFilterCol,
    selectedRanges, setSelectedRanges,
    isDragging, setIsDragging,
    orderedColumns
  };
}
