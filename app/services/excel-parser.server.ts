import * as XLSX from "xlsx";
import { DateParser } from "../utils/date-parser";
import crypto from "crypto";
import { Prisma } from "@prisma/client";


// Utilitário Server-Side para Ler e Padronizar Arquivos Excel
// Realiza toda a extração, Mapeamento (De-Para das colunas) e Validação.
export class ExcelParser {
  // Remove espaços duplos e padroniza os traços da agência
  private static padronizarAgencia(nome: string): string {
    if (!nome) return "";
    return nome.toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
  }

//Converte um buffer de Excel cru para uma lista de operações rigidamente validadas e tipadas
  static analisarBuffer(buffer: Buffer, importacaoId: number): { operacoes: Prisma.OperacaoCreateManyInput[], totalLido: number } {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Converte para matriz 2D para procurar onde estão os cabeçalhos
    const dataAsArray: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (dataAsArray.length === 0) throw new Error("Planilha vazia");

    let headerRowIndex = 0;
    
    // Conforme sua regra: Verifica a linha 1 (índice 0), se não achar as chaves exatas da interface, tenta a linha 2 (índice 1).
    for (let i = 0; i < Math.min(2, dataAsArray.length); i++) {
      const rowStr = (dataAsArray[i] || []).map(String).map(s => s.toUpperCase());
      // Procurando as chaves EXATAS que vêm na sua planilha
      if (rowStr.includes("NM_AGENCIA") || rowStr.includes("DT_EMISSAO_") || rowStr.includes("NR_CTRC")) {
          headerRowIndex = i;
          break;
      }
    }

    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    if (rawData.length === 0) throw new Error("Não há dados na planilha além dos cabeçalhos");

    // Validação de Cabeçalhos: Exige EXATAMENTE as 4 chaves usadas para gerar a assinatura de duplicidade
    const availableHeaders = Object.keys(rawData[0]).map(h => h.toUpperCase());
    const requiredChecks = [
      { name: "NM_AGENCIA", keys: ["NM_AGENCIA"] },
      { name: "NR_CTRC", keys: ["NR_CTRC"] },
      { name: "NR_NF", keys: ["NR_NF"] },
      { name: "VL_TOTAL", keys: ["VL_TOTAL"] }
    ];

    const missing = requiredChecks.filter(check => 
      !check.keys.some(k => availableHeaders.includes(k))
    );

    if (missing.length > 0) {
      throw new Error(`Arquivo inválido ou com cabeçalhos incorretos. Colunas obrigatórias faltando: ${missing.map(m => m.name).join(", ")}.`);
    }

    const operacoes = rawData.map((row, index) => this.mapearLinha(row, importacaoId, index));

    return { operacoes, totalLido: rawData.length };
  }

  private static mapearLinha(row: any, importacaoId: number, index: number): Prisma.OperacaoCreateManyInput {
    const get = (key: string) => {
      const val = row[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
      return null;
    };

    const dtCrua = get("DT_EMISSAO_");
    const dt_emissao_ = DateParser.parseDataBrasileiraSegura(dtCrua);
    
    if (!dt_emissao_ || isNaN(dt_emissao_.getTime())) {
      throw new Error(`Data de Emissão inválida ou ausente na linha ${index + 2}. Certifique-se de que a coluna "DT_EMISSAO_" está preenchida corretamente.`);
    }
    
    const op = {
      importacaoId,
      nm_agencia: this.padronizarAgencia(String(get("NM_AGENCIA") || "DESCONHECIDA")),
      dt_emissao_,
      cd_pessoa_pagador: String(get("CD_PESSOA_PAGADOR") || ""),
      nm_pessoa_pagador: String(get("NM_PESSOA_PAGADOR") || ""),
      nr_cpf_cnpj_raiz: String(get("NR_CPF_CNPJ_RAIZ") || ""),
      nr_cpf_cnpj_pagador: String(get("NR_CPF_CNPJ_PAGADOR") || ""),
      nr_ctrc: String(get("NR_CTRC") || "0").trim(),
      id_tipo_documento: String(get("ID_TIPO_DOCUMENTO") || ""),
      nm_pessoa_remetente: String(get("NM_PESSOA_REMETENTE") || ""),
      nm_cidade_origem: String(get("NM_CIDADE_ORIGEM") || ""),
      ds_sigla_origem: String(get("DS_SIGLA_ORIGEM") || ""),
      nm_pessoa_destinatario: String(get("NM_PESSOA_DESTINATARIO") || ""),
      nm_cidade_destino: String(get("NM_CIDADE_DESTINO") || ""),
      ds_sigla_destino: String(get("DS_SIGLA_DESTINO") || ""),
      nm_produto: String(get("NM_PRODUTO") || ""),
      vl_peso: Number(get("VL_PESO") || 0),
      vl_tarifa: Number(get("VL_TARIFA") || 0),
      vl_total: get("VL_TOTAL") ? Number(get("VL_TOTAL")) : null,
      nr_nf: get("NR_NF") ? String(get("NR_NF")).trim() : null,
      ds_placa: String(get("DS_PLACA") || ""),
      nm_pessoa_matriz: String(get("NM_PESSOA_MATRIZ") || ""),
      nr_contrato: String(get("NR_CONTRATO") || ""),
      nr_chave_acesso: String(get("NR_CHAVE_ACESSO") || ""),
      nm_pessoa_usuario_lancamento: String(get("NM_PESSOA_USUARIO_LANCAMENTO") || ""),
      id_tipo_ctrc: String(get("ID_TIPO_CTRC") || ""),
      nm_proprietario_posse_cavalo: String(get("NM_PROPRIETARIO_POSSE_CAVALO") || ""),
      nm_motorista: String(get("NM_MOTORISTA") || ""),
      status: get("STATUS") ? String(get("STATUS")).trim().toUpperCase() : null,
      comentarios: get("COMENTARIOS") ? String(get("COMENTARIOS")).trim() : null,
    };

    const hashStr = `${op.nm_agencia}|${op.nr_ctrc}|${op.nr_nf || ""}|${op.vl_total ? op.vl_total.toFixed(2) : "0.00"}`;
    (op as any).hash_assinatura = crypto.createHash("sha256").update(hashStr).digest("hex");

    return op as Prisma.OperacaoCreateManyInput; 
  }
}
