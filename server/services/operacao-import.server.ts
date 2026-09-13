import crypto from "crypto";
import prisma from "../lib/prisma.server";

import { ExcelParser } from "./excel-parser.server";
import { OperacaoService } from "./operacao.server";
import { PastaService } from "./pasta.server";
import { AutomacaoService } from "./automacao.server";
import { MotorRoteamentoService } from "./motor-roteamento.server";
import { BackupService } from "./backup.server";

//Colunas da Operacao preenchidas pela planilha (De-Para do excel-parser +
//importacaoId/pastaId/hash_assinatura, atribuídos depois do parse). Usada
//pelo INSERT ... SELECT ... FROM json_populate_recordset abaixo (B3): mesma
//ordem nas duas listas de colunas da query.
const COLUNAS_OPERACAO = [
  "importacaoId", "pastaId", "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz",
  "nr_cpf_cnpj_pagador", "nr_ctrc", "id_tipo_documento", "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem",
  "nm_pessoa_destinatario", "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "vl_peso", "vl_tarifa", "vl_total",
  "nr_nf", "ds_placa", "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
  "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "status", "comentarios", "dt_emissao_",
  "dt_quitacao_saldo", "hash_assinatura",
] as const;
const COLUNAS_OPERACAO_SQL = COLUNAS_OPERACAO.map(c => `"${c}"`).join(",");

export class OperacaoImportService {
  static async processarPlanilha(buffer: Buffer, originalName: string, usuario: string = "Sistema", modo: string = "SUBSTITUIR") {
    OperacaoService.invalidarCache();
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Parse (CPU, não depende do banco) antes de qualquer query.
    const parsedData = ExcelParser.analisarBuffer(buffer);
    const spreadsheetOps = parsedData.operacoes;

    // MÁQUINA DO TEMPO (BACKUP DA VERSÃO ANTERIOR, já acha a última importação
    // sozinha) + mapas de roteamento: nenhum depende do outro, então saem no
    // mesmo lote em vez de em sequência. Aguardados juntos: uma falha no
    // backup vira erro desta request, não uma rejeição solta que derruba o
    // processo.
    const [mapas] = await Promise.all([
      AutomacaoService.obterMapasRoteamento(),
      BackupService.criarBackup(),
    ]);

    // --- AUTOMAÇÃO (ROTEAMENTO) ---
    MotorRoteamentoService.aplicarRegrasRoteamento(spreadsheetOps, mapas);

    const importacao = await prisma.importacao.create({
      data: { nomeArquivo: originalName, usuario, qtdRegistros: parsedData.totalLido, hashArquivo: hash }
    });

    for (const op of spreadsheetOps as any[]) {
      op.importacaoId = importacao.id;
    }

    const spreadsheetSignatures = spreadsheetOps.map((op: any) => op.hash_assinatura as string);

    const removidos = await this.aplicarRegraSubstituicao(modo, spreadsheetSignatures);
    const adicionados = await this.inserirOperacoes(spreadsheetOps);

    PastaService.invalidarCache();
    OperacaoService.invalidarCache();

    return {
      totalLido: parsedData.totalLido,
      adicionados,
      ignorados: parsedData.totalLido - adicionados,
      removidos,
      modo,
      importId: importacao.id
    };
  }

  static async desfazerImportacao(importacaoId: number) {
    await BackupService.restaurarBackup(importacaoId);
  }

  //Substituição em 1 ida: apaga direto no banco quem não veio na planilha nova,
  //sem trazer a tabela inteira para o Node primeiro.
  private static async aplicarRegraSubstituicao(modo: string, assinaturas: string[]): Promise<number> {
    if (modo !== "SUBSTITUIR") return 0;

    return prisma.$executeRawUnsafe(
      `DELETE FROM "Operacao" WHERE hash_assinatura IS NOT NULL AND NOT (hash_assinatura = ANY($1::text[]))`,
      assinaturas
    );
  }

  //Inserção em 1 ida: json_populate_recordset casa os campos do JSON pelas
  //colunas da Operacao. ON CONFLICT DO NOTHING sem alvo é o mesmo que o
  //skipDuplicates do createMany antigo (ignora qualquer violação de unique,
  //na prática a de hash_assinatura) e não depende de o índice ter esse nome
  //no banco. createdAt/updatedAt não vêm da planilha — preenchidos com now().
  private static async inserirOperacoes(spreadsheetOps: any[]): Promise<number> {
    if (spreadsheetOps.length === 0) return 0;

    return prisma.$executeRawUnsafe(
      `INSERT INTO "Operacao" (${COLUNAS_OPERACAO_SQL}, "createdAt", "updatedAt")
       SELECT ${COLUNAS_OPERACAO_SQL}, now(), now()
       FROM json_populate_recordset(NULL::"Operacao", $1::json)
       ON CONFLICT DO NOTHING`,
      JSON.stringify(spreadsheetOps)
    );
  }
}
