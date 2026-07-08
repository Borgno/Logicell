import { Prisma } from "@prisma/client";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { DateParser } from "../utils/date-parser";

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
      const rowStr = (dataAsArray[i] || []).map(String).map(s => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, ""));
      // Procurando chaves comuns
      if (rowStr.includes("NMAGENCIA") || rowStr.includes("AGENCIA") || rowStr.includes("NRCTRC") || rowStr.includes("CTRC") || rowStr.includes("VLTOTAL") || rowStr.includes("VALORTOTAL")) {
          headerRowIndex = i;
          break;
      }
    }

    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    if (rawData.length === 0) throw new Error("Não há dados na planilha além dos cabeçalhos");

    // Validação de Cabeçalhos
    const availableHeaders = Object.keys(rawData[0]).map(h => h.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, ""));
    const requiredChecks = [
      { name: "AGÊNCIA", keys: ["NMAGENCIA", "AGENCIA"] },
      { name: "CTRC", keys: ["NRCTRC", "CTRC", "CTE"] },
      { name: "NF", keys: ["NRNF", "NF", "NOTAFISCAL"] },
      { name: "VALOR TOTAL", keys: ["VLTOTAL", "VALORTOTAL", "TOTAL", "VALOR"] }
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
    const rowNorm: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      const cleanKey = String(k).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "");
      rowNorm[cleanKey] = v;
    }

    const get = (keys: string | string[]) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) {
        const cleanKey = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "");
        const val = rowNorm[cleanKey];
        if (val !== undefined && val !== null && String(val).trim() !== "") return val;
      }
      return null;
    };

    const dtCrua = get(["DT_EMISSAO_", "DATA EMISSÃO", "EMISSÃO", "EMISSAO"]);
    let dt_emissao_ = DateParser.parseDataBrasileiraSegura(dtCrua);
    
    if (dt_emissao_ && isNaN(dt_emissao_.getTime())) {
      dt_emissao_ = null;
    }
    
    const op = {
      importacaoId,
      nm_agencia: this.padronizarAgencia(String(get(["nm_agencia", "AGÊNCIA", "AGENCIA"]) || "DESCONHECIDA")),
      dt_emissao_: dt_emissao_ || null,
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
    (op as any).hash_assinatura = crypto.createHash("sha256").update(hashStr).digest("hex");

    return op as Prisma.OperacaoCreateManyInput; 
  }
}
