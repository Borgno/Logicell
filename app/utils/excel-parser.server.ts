import * as XLSX from "xlsx";
import { DateParser } from "./date-parser";
import crypto from "crypto";

export interface OperacaoType {
  nm_agencia: string;
  dt_emissao_: Date | null;
  cd_pessoa_pagador?: string | null;
  nm_pessoa_pagador?: string | null;
  nr_cpf_cnpj_raiz?: string | null;
  nr_cpf_cnpj_pagador?: string | null;
  nr_ctrc: string;
  id_tipo_documento?: string | null;
  nm_pessoa_remetente?: string | null;
  nm_cidade_origem?: string | null;
  ds_sigla_origem?: string | null;
  nm_pessoa_destinatario?: string | null;
  nm_cidade_destino?: string | null;
  ds_sigla_destino?: string | null;
  nm_produto?: string | null;
  vl_peso?: number | null;
  vl_tarifa?: number | null;
  vl_total?: number | null;
  nr_nf?: string | null;
  ds_placa?: string | null;
  nm_pessoa_matriz?: string | null;
  nr_contrato?: string | null;
  nr_chave_acesso?: string | null;
  nm_pessoa_usuario_lancamento?: string | null;
  id_tipo_ctrc?: string | null;
  nm_proprietario_posse_cavalo?: string | null;
  nm_motorista?: string | null;
  status?: string | null;
  comentarios?: string | null;
  hash_assinatura?: string | null;
}


// Utilitário Server-Side para Ler e Padronizar Arquivos Excel
// Realiza toda a extração, Mapeamento (De-Para das colunas) e Validação.
export class ExcelParser {
  // Remove espaços duplos e padroniza os traços da agência
  private static padronizarAgencia(nome: string): string {
    if (!nome) return "";
    return nome.toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
  }

//Converte um buffer de Excel cru para uma lista de operações rigidamente validadas e tipadas
  static analisarBuffer(buffer: Buffer, importacaoId: number): { operacoes: OperacaoType[], totalLido: number } {
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

    const operacoes = rawData.map((row) => {
      const get = (keys: string[]) => {
        for (const key of keys) {
          const val = row[key];
          if (val !== undefined && val !== null && String(val).trim() !== "") return val;
        }
        return null;
      };

      const dtCrua = get(["dt_emissao_", "DATA EMISSÃO", "EMISSÃO", "EMISSAO"]);
      // Respeitando o comportamento original de parse de data, centralizado no DateParser
      const dt_emissao_ = DateParser.parseDataBrasileiraSegura(dtCrua);
      
      if (!dt_emissao_ || isNaN(dt_emissao_.getTime())) {
        throw new Error(`Data de Emissão inválida ou ausente na linha ${rawData.indexOf(row) + 2}. Certifique-se de que a coluna "Data Emissão" está preenchida corretamente.`);
      }
      
      const op = {
        importacaoId,
        nm_agencia: this.padronizarAgencia(String(get(["nm_agencia", "AGÊNCIA", "AGENCIA"]) || "DESCONHECIDA")),
        dt_emissao_,
        cd_pessoa_pagador: String(get(["cd_pessoa_pagador", "CÓD. PAGADOR", "COD PAGADOR", "CÓDIGO"]) || ""),
        nm_pessoa_pagador: String(get(["nm_pessoa_pagador", "PAGADOR", "CLIENTE"]) || ""),
        nr_cpf_cnpj_raiz: String(get(["nr_cpf_cnpj_raiz", "CNPJ RAIZ", "RAIZ"]) || ""),
        nr_cpf_cnpj_pagador: String(get(["nr_cpf_cnpj_pagador", "CPF/CNPJ PAGADOR", "CNPJ"]) || ""),
        nr_ctrc: String(get(["nr_ctrc", "CTRC", "CTE", "CT-E"]) || "0").trim(),
        id_tipo_documento: String(get(["id_tipo_documento", "TIPO DOC", "TIPO"]) || ""),
        nm_pessoa_remetente: String(get(["nm_pessoa_remetente", "REMETENTE"]) || ""),
        nm_cidade_origem: String(get(["nm_cidade_origem", "CIDADE ORIGEM", "ORIGEM"]) || ""),
        ds_sigla_origem: String(get(["ds_sigla_origem", "UF ORIGEM", "UF_ORI"]) || ""),
        nm_pessoa_destinatario: String(get(["nm_pessoa_destinatario", "DESTINATÁRIO", "DESTINATARIO"]) || ""),
        nm_cidade_destino: String(get(["nm_cidade_destino", "CIDADE DESTINO", "DESTINO"]) || ""),
        ds_sigla_destino: String(get(["ds_sigla_destino", "UF DESTINO", "UF_DES"]) || ""),
        nm_produto: String(get(["nm_produto", "PRODUTO"]) || ""),
        vl_peso: Number(get(["vl_peso", "PESO", "PESO REAL"]) || 0),
        vl_tarifa: Number(get(["vl_tarifa", "TARIFA"]) || 0),
        vl_total: get(["vl_total", "VALOR TOTAL", "TOTAL", "VALOR"]) ? Number(get(["vl_total", "VALOR TOTAL", "TOTAL", "VALOR"])) : null,
        nr_nf: get(["nr_nf", "NF", "NOTA FISCAL"]) ? String(get(["nr_nf", "NF", "NOTA FISCAL"])).trim() : null,
        ds_placa: String(get(["ds_placa", "PLACA"]) || ""),
        nm_pessoa_matriz: String(get(["nm_pessoa_matriz", "MATRIZ"]) || ""),
        nr_contrato: String(get(["nr_contrato", "CONTRATO"]) || ""),
        nr_chave_acesso: String(get(["nr_chave_acesso", "CHAVE ACESSO", "CHAVE DE ACESSO"]) || ""),
        nm_pessoa_usuario_lancamento: String(get(["nm_pessoa_usuario_lancamento", "USUÁRIO", "USUARIO"]) || ""),
        id_tipo_ctrc: String(get(["id_tipo_ctrc", "TIPO CTE", "TIPO CTe"]) || ""),
        nm_proprietario_posse_cavalo: String(get(["nm_proprietario_posse_cavalo", "PROPRIETÁRIO", "PROPRIETARIO"]) || ""),
        nm_motorista: String(get(["nm_motorista", "MOTORISTA"]) || ""),
        status: get(["status", "Status"]) ? String(get(["status", "Status"])).trim().toUpperCase() : null,
        comentarios: get(["comentarios", "OBSERVAÇÃO", "OBSERVACAO"]) ? String(get(["comentarios", "OBSERVAÇÃO", "OBSERVACAO"])).trim() : null,
      };

      const hashStr = `${op.nm_agencia}|${op.nr_ctrc}|${op.nr_nf || ""}|${op.vl_total ? op.vl_total.toFixed(2) : "0.00"}`;
      (op as any).hash_assinatura = crypto.createHash("md5").update(hashStr).digest("hex");

      return op as OperacaoType; 
    });

    return { operacoes, totalLido: rawData.length };
  }
}
