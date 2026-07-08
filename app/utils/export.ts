import * as XLSX from "xlsx";
import { formatarData } from "./formatters";

export function exportarExcel(dados: any[], colunas: any[], nomePasta: string, showAlert: any) {
  try {
    const exportData = dados.map(row => {
      const obj: any = {};
      colunas.forEach(col => {
        let val = row[col.key];
        if (col.key === "dt_emissao_" && val) val = formatarData(val);
        obj[col.label] = val;
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, `Logicell_${nomePasta}.xlsx`);
  } catch (e) {
    showAlert({ title: "Erro na Exportação", message: "Falha ao gerar o arquivo Excel.", variant: "error" });
  }
}
