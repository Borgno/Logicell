import { useEffect } from "react";

export function useOperacoesInteractions({
  dados,
  setDados,
  fetcher,
  selectedRanges,
  orderedColumns,
  fillRange
}: any) {

  // Lógica de Preenchimento em Massa (Drag-to-Fill)
  const handleFillEnd = (colKey: string) => {
    if (!fillRange || selectedRanges.length === 0) return;
    
    // Pega a linha fonte (a linha da alça de preenchimento)
    const lastRange = selectedRanges[selectedRanges.length - 1];
    const sourceRowIdx = Math.max(lastRange.start.rowIdx, lastRange.end.rowIdx);
    const sourceRow = dados[sourceRowIdx];
    if (!sourceRow) return;

    const newValue = sourceRow[colKey];
    const idsToUpdate: number[] = [];
    const nextDados = [...dados];

    const minRow = Math.min(fillRange.start.rowIdx, fillRange.end.rowIdx);
    const maxRow = Math.max(fillRange.start.rowIdx, fillRange.end.rowIdx);

    for (let i = minRow; i <= maxRow; i++) {
      if (nextDados[i]) {
        nextDados[i] = { ...nextDados[i], [colKey]: newValue };
        idsToUpdate.push(nextDados[i].id);
      }
    }

    setDados(nextDados);

    if (idsToUpdate.length > 0) {
      const formData = new FormData();
      formData.append("intent", "bulkUpdate");
      formData.append("ids", JSON.stringify(idsToUpdate));
      formData.append("campo", colKey);
      formData.append("valor", newValue || "");
      fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
    }
  };

  // Interceptador CTRL+C para cópia de matriz multicelular (Estilo Excel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedRanges.length === 0) return;
        
        const selectedCells = new Set<string>();
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;

        // Mapeia coordenadas selecionadas
        selectedRanges.forEach((range: any) => {
          const r1 = Math.min(range.start.rowIdx, range.end.rowIdx);
          const r2 = Math.max(range.start.rowIdx, range.end.rowIdx);
          const c1 = Math.min(range.start.colIdx, range.end.colIdx);
          const c2 = Math.max(range.start.colIdx, range.end.colIdx);
          
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              selectedCells.add(`${r},${c}`);
              if (r < minRow) minRow = r;
              if (r > maxRow) maxRow = r;
              if (c < minCol) minCol = c;
              if (c > maxCol) maxCol = c;
            }
          }
        });

        if (selectedCells.size === 0) return;

        let tsv = "";
        for (let r = minRow; r <= maxRow; r++) {
          const rowVals = [];
          let hasCellInRow = false;
          for (let c = minCol; c <= maxCol; c++) {
            if (selectedCells.has(`${r},${c}`)) {
              hasCellInRow = true;
              const colDef = orderedColumns[c - 2];
              if (colDef && dados[r]) {
                const val = dados[r][colDef.key];
                let strVal = val === null || val === undefined ? "" : val.toString();
                strVal = strVal.replace(/\r?\n|\r/g, " ");
                rowVals.push(strVal);
              } else {
                rowVals.push("");
              }
            } else {
              rowVals.push("");
            }
          }
          if (hasCellInRow) {
            tsv += rowVals.join("\t") + "\n";
          }
        }

        navigator.clipboard.writeText(tsv.trimEnd());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRanges, orderedColumns, dados]);

  return { handleFillEnd };
}
