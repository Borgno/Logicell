import ExcelJS from "exceljs";

// Planilha sintética no formato do ERP, montada na hora: linhas como arrays, a primeira pode ser a
// linha de totais que a planilha real traz em cima do cabeçalho.
export async function montarPlanilha(linhas: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");
  for (const linha of linhas) sheet.addRow(linha);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export const CABECALHO = [
  "nm_agencia",
  "dt_emissao_",
  "nm_pessoa_pagador",
  "nr_ctrc",
  "id_tipo_documento",
  "nm_produto",
  "nr_nf",
  "ds_placa",
  "vl_total",
];

// Uma linha no formato do CABECALHO.
export function linha(campos: {
  agencia?: string;
  emissao?: Date | string;
  cliente?: string;
  ctrc: string | number;
  tipo?: string;
  produto?: string;
  nf?: string | number;
  placa?: string;
  total?: number | string;
}) {
  return [
    campos.agencia ?? "matriz-sp",
    campos.emissao ?? null,
    campos.cliente ?? "ACME",
    campos.ctrc,
    campos.tipo ?? "CTE",
    campos.produto ?? null,
    campos.nf ?? "1",
    campos.placa ?? null,
    campos.total ?? 100,
  ];
}
