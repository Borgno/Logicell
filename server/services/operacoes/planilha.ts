import ExcelJS from "exceljs";
import { COLUNAS } from "./colunas";
import type { OperacaoRow } from "./operacoes.service";

// Planilha da visão atual da grid, com as colunas na ordem pedida (a mesma da tela) e os tipos
// certos: data como data e valor como número, para quem abre poder somar e filtrar no Excel.
export async function montarPlanilha(rows: OperacaoRow[], ordem: string[]) {
  const colunas = ordem.length
    ? [
        ...ordem.map((key) => COLUNAS.find((coluna) => coluna.key === key)!).filter(Boolean),
        ...COLUNAS.filter((coluna) => !ordem.includes(coluna.key)),
      ]
    : COLUNAS;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Operações");
  sheet.columns = colunas.map((coluna) => ({
    header: coluna.label,
    key: coluna.key,
    width: coluna.tipo === "texto" ? 24 : 14,
    style:
      coluna.tipo === "data"
        ? { numFmt: "dd/mm/yyyy" }
        : coluna.tipo === "numero"
          ? { numFmt: "#,##0.00" }
          : {},
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(
      Object.fromEntries(
        colunas.map((coluna) => {
          const value = row[coluna.key];
          // O exceljs grava a data pelo instante UTC, e a operação é meia-noite UTC: o dia não muda.
          if (coluna.tipo === "data" && typeof value === "string")
            return [coluna.key, new Date(value)];
          return [coluna.key, value];
        }),
      ),
    );
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
