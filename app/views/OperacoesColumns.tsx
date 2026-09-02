import { ArrowDown, ArrowUp, Filter } from "lucide-react";
import { SelectColumn } from 'react-data-grid';
import { formatarMoeda } from "~/utils/formatters";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const SORTABLE_COLUMNS = ["dt_emissao_", "data_status", "dt_quitacao_saldo", "vl_peso", "vl_tarifa", "vl_total"];

export function getOperacoesColumns({
  orderedColumns,
  columnWidths,
  columnFilters,
  selectedRanges,
  isDragging,
  setOpenFilterCol,
  setSelectedRanges,
  setIsDragging,
  isFillDragging,
  setIsFillDragging,
  fillRange,
  setFillRange,
  handleFillEnd,
  totalVl,
}: any) {
  const defs: any[] = [
    SelectColumn,
    {
      key: "rowIndex",
      name: "Nº",
      width: columnWidths["rowIndex"] || 40,
      minWidth: 25,
      resizable: true,
      frozen: true,
      renderHeaderCell: () => <span className="text-xs font-black uppercase tracking-wider text-slate-400">Nº</span>,
      renderCell: (props: any) => props.rowIdx + 1
    }
  ];

  orderedColumns.forEach((col: any) => {
    const isSortable = SORTABLE_COLUMNS.includes(col.key);
    defs.push({
      key: col.key,
      name: col.label,
      draggable: true,
      resizable: true,
      sortable: isSortable,
      minWidth: 30,
      width: columnWidths[col.key] || parseInt(col.width) || 150,
      renderHeaderCell: ({ sortDirection }: any) => {
        const hasFilter = !!columnFilters[col.key];
        return (
          <div className={cn("flex items-center justify-between w-full group", isSortable && "cursor-pointer")}>
            <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-400 truncate pr-2">
              <span className="truncate">{col.label}</span>
              {isSortable && sortDirection && (
                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                  {sortDirection === "ASC" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </span>
              )}
              {col.key === "vl_total" && (
                <span className="text-primary normal-case ml-1">= {formatarMoeda(totalVl)}</span>
              )}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilterCol({ key: col.key, rect: e.currentTarget.getBoundingClientRect() });
              }}
              className={cn("p-1.5 rounded-lg transition-all", hasFilter ? "text-slate-700 bg-slate-200 dark:bg-slate-700 dark:text-slate-200" : "text-transparent group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              <Filter size={14} />
            </button>
          </div>
        );
      },
      renderEditCell: (props: any) => {
        let editValue = props.row[col.key];
        return (
          <input
            autoFocus
            className="w-full h-full px-2 outline-none border-2 border-indigo-500 rounded text-xs bg-white text-black"
            value={editValue || ""}
            onChange={(e) => props.onRowChange({ ...props.row, [col.key]: e.target.value })}
            onBlur={() => props.onClose(true)}
          />
        );
      },
      renderCell: (props: any) => {
        const value = props.row[col.key];
        let displayValue: any = value;
        
        if (col.key === "status") {
          displayValue = value || "";
        } else if (value === null || value === undefined) {
          displayValue = "";
        } else if (col.key === "dt_emissao_" || col.key === "data_status") {
          displayValue = value || "";
        } else if (col.isCurrency) {
          displayValue = formatarMoeda(value);
        }

        const colIdx = orderedColumns.indexOf(col) + 2;
        const isSelected = selectedRanges.some((r: any) => {
          return props.rowIdx >= Math.min(r.start.rowIdx, r.end.rowIdx) && 
                  props.rowIdx <= Math.max(r.start.rowIdx, r.end.rowIdx) && 
                  colIdx >= Math.min(r.start.colIdx, r.end.colIdx) && 
                  colIdx <= Math.max(r.start.colIdx, r.end.colIdx);
        });

        const lastRange = selectedRanges[selectedRanges.length - 1];
        const isBottomRight = lastRange && 
          props.rowIdx === Math.max(lastRange.start.rowIdx, lastRange.end.rowIdx) &&
          colIdx === Math.max(lastRange.start.colIdx, lastRange.end.colIdx);

        // Lógica visual do Tracejado de Drag-to-Fill
        const isFillTarget = fillRange && 
          props.rowIdx >= Math.min(fillRange.start.rowIdx, fillRange.end.rowIdx) &&
          props.rowIdx <= Math.max(fillRange.start.rowIdx, fillRange.end.rowIdx) &&
          colIdx >= Math.min(fillRange.start.colIdx, fillRange.end.colIdx) &&
          colIdx <= Math.max(fillRange.start.colIdx, fillRange.end.colIdx);
          
        const isSupportedFillCol = col.key === "status" || col.key === "comentarios" || col.key === "id_solicitacao";

        return (
          <div 
            className="w-full h-full flex items-center relative select-none"
            onMouseUp={() => {
              if (isFillDragging) {
                handleFillEnd(col.key);
                setIsFillDragging(false);
                setFillRange(null);
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if ((e.target as HTMLElement).id === "fill-handle") return; // Não iniciar seleção normal no drag

              const pos = { rowIdx: props.rowIdx, colIdx };
              
              if (e.ctrlKey || e.metaKey) {
                setSelectedRanges((prev: any) => [...prev, { start: pos, end: pos }]);
              } else if (e.shiftKey || e.altKey) {
                setSelectedRanges((prev: any) => {
                  if (prev.length === 0) return [{ start: pos, end: pos }];
                  const newRanges = [...prev];
                  newRanges[newRanges.length - 1] = { ...newRanges[newRanges.length - 1], end: pos };
                  return newRanges;
                });
              } else {
                setSelectedRanges([{ start: pos, end: pos }]);
              }
              setIsDragging(true);
            }}
            onMouseEnter={() => {
              const pos = { rowIdx: props.rowIdx, colIdx };
              if (isDragging) {
                setSelectedRanges((prev: any) => {
                  if (prev.length === 0) return prev;
                  const newRanges = [...prev];
                  newRanges[newRanges.length - 1] = { ...newRanges[newRanges.length - 1], end: pos };
                  return newRanges;
                });
              } else if (isFillDragging) {
                setFillRange((prev: any) => {
                  if (!prev) return prev;
                  return { start: prev.start, end: pos };
                });
              }
            }}
          >
            {isSelected && <div className="absolute -inset-x-2 -inset-y-2 bg-[rgba(0,102,255,0.15)] pointer-events-none" />}
            {isFillTarget && <div className="absolute inset-0 border-2 border-dashed border-primary bg-[rgba(0,102,255,0.1)] pointer-events-none" />}
            
            <div className="relative truncate w-full">{displayValue}</div>
            
            {isBottomRight && isSupportedFillCol && (
              <div 
                id="fill-handle"
                className="absolute -bottom-2 -right-2 w-3 h-3 bg-primary border border-white dark:border-[#0f1217] cursor-crosshair"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.button !== 0) return;
                  setIsFillDragging(true);
                  setFillRange({ start: { rowIdx: props.rowIdx, colIdx }, end: { rowIdx: props.rowIdx, colIdx } });
                }}
              />
            )}
          </div>
        );
      }
    });
  });

  return defs;
}
