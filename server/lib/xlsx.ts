import ExcelJS from "exceljs";

// Planilha de exportação com uma aba: cabeçalho em negrito e congelado na rolagem.
export function createSheet(name: string, columns: Partial<ExcelJS.Column>[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return { workbook, sheet };
}

export async function toBuffer(workbook: ExcelJS.Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
