import { useCallback, useEffect, useState } from "react";
import { formatarCelula, type ColunaGrid } from "../_lib/colunas";
import type { Operacao } from "./operacoes.queries";

// Seleção de células no estilo planilha, por cima da grid: arrastar seleciona um retângulo, Ctrl
// soma outro, Shift estende o último. Ctrl+C copia como texto separado por tabulação, que cola certo
// no Excel. A alça no canto do último retângulo arrasta o valor para as linhas de baixo ou de cima.

export type Pos = { row: number; col: number };
export type Range = { start: Pos; end: Pos };

const dentro = (range: Range, row: number, col: number) =>
  row >= Math.min(range.start.row, range.end.row) &&
  row <= Math.max(range.start.row, range.end.row) &&
  col >= Math.min(range.start.col, range.end.col) &&
  col <= Math.max(range.start.col, range.end.col);

// Data como DD/MM/AAAA e número com vírgula decimal, sem R$: o Excel em português cola como número.
function textoParaCopiar(coluna: ColunaGrid, value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value).replace(".", ",");
  return (coluna.tipo === "data" ? formatarCelula(coluna, value) : String(value)).replace(
    /\r?\n/g,
    " ",
  );
}

function editando() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function useCellSelection({
  rows,
  colunas,
  onFill,
}: {
  rows: Operacao[];
  colunas: ColunaGrid[];
  // Linhas de destino e o valor da linha de origem, na coluna da alça.
  onFill: (coluna: ColunaGrid, ids: number[], valor: unknown) => void;
}) {
  const [ranges, setRanges] = useState<Range[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fill, setFill] = useState<Range | null>(null);

  // Soltar o mouse em qualquer lugar encerra o arrasto.
  useEffect(() => {
    const onUp = () => setDragging(false);
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const isSelected = useCallback(
    (row: number, col: number) => ranges.some((range) => dentro(range, row, col)),
    [ranges],
  );
  const isFillTarget = useCallback(
    (row: number, col: number) => fill !== null && dentro(fill, row, col),
    [fill],
  );
  const last = ranges.at(-1);
  const isHandle = useCallback(
    (row: number, col: number) =>
      last !== undefined &&
      row === Math.max(last.start.row, last.end.row) &&
      col === Math.max(last.start.col, last.end.col),
    [last],
  );

  const onCellMouseDown = useCallback((pos: Pos, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if (event.ctrlKey || event.metaKey) {
      setRanges((prev) => [...prev, { start: pos, end: pos }]);
    } else if (event.shiftKey) {
      setRanges((prev) =>
        prev.length
          ? [...prev.slice(0, -1), { start: prev.at(-1)!.start, end: pos }]
          : [{ start: pos, end: pos }],
      );
    } else {
      setRanges([{ start: pos, end: pos }]);
    }
    setDragging(true);
  }, []);

  const onCellMouseEnter = useCallback(
    (pos: Pos) => {
      if (dragging) {
        setRanges((prev) =>
          prev.length ? [...prev.slice(0, -1), { start: prev.at(-1)!.start, end: pos }] : prev,
        );
      } else if (fill) {
        // A alça só preenche na vertical, na coluna onde começou.
        setFill((prev) =>
          prev ? { start: prev.start, end: { row: pos.row, col: prev.start.col } } : prev,
        );
      }
    },
    [dragging, fill],
  );

  const onHandleMouseDown = useCallback((pos: Pos, event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    setFill({ start: pos, end: pos });
  }, []);

  const onCellMouseUp = useCallback(() => {
    if (!fill) return;
    const coluna = colunas[fill.start.col];
    const origem = rows[fill.start.row];
    const ids: number[] = [];
    for (
      let row = Math.min(fill.start.row, fill.end.row);
      row <= Math.max(fill.start.row, fill.end.row);
      row++
    ) {
      if (row !== fill.start.row && rows[row]) ids.push(rows[row].id);
    }
    setFill(null);
    if (coluna && origem && ids.length) onFill(coluna, ids, origem[coluna.key]);
  }, [fill, rows, colunas, onFill]);

  // Ctrl+C: o retângulo que envolve todas as seleções, com vazio onde nenhuma passa.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") return;
      if (ranges.length === 0 || editando()) return;
      const rowsIdx = ranges.flatMap((range) => [range.start.row, range.end.row]);
      const colsIdx = ranges.flatMap((range) => [range.start.col, range.end.col]);
      const linhas: string[] = [];
      for (let row = Math.min(...rowsIdx); row <= Math.max(...rowsIdx); row++) {
        const valores: string[] = [];
        let algum = false;
        for (let col = Math.min(...colsIdx); col <= Math.max(...colsIdx); col++) {
          if (isSelected(row, col) && rows[row] && colunas[col]) {
            algum = true;
            valores.push(textoParaCopiar(colunas[col], rows[row][colunas[col].key]));
          } else {
            valores.push("");
          }
        }
        if (algum) linhas.push(valores.join("\t"));
      }
      event.preventDefault();
      void navigator.clipboard.writeText(linhas.join("\n"));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ranges, rows, colunas, isSelected]);

  const clear = useCallback(() => {
    setRanges([]);
    setFill(null);
  }, []);

  return {
    isSelected,
    isFillTarget,
    isHandle,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp,
    onHandleMouseDown,
    clear,
  };
}
