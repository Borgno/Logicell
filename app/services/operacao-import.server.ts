import crypto from "crypto";
import prisma from "~/lib/prisma.server";

import { ExcelParser } from "./excel-parser.server";
import { OperacaoService } from "./operacao.server";
import { PastaService } from "./pasta.server";
import { MotorRoteamentoService } from "./motor-roteamento.server";
import { BackupService } from "./backup.server";

export class OperacaoImportService {
  static async processarPlanilha(buffer: Buffer, originalName: string, usuario: string = "Sistema", modo: string = "SUBSTITUIR") {
    OperacaoService.invalidarCache();
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // MÁQUINA DO TEMPO (BACKUP DA VERSÃO ANTERIOR)
    // Antes de processar a nova planilha, pegamos a última importação (que é a versão atual do usuário)
    // e tiramos uma "foto" do banco de dados com todas as alterações manuais que ele fez até agora.
    const ultimaImportacao = await prisma.importacao.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (ultimaImportacao) {
      await BackupService.criarBackup(ultimaImportacao.id);
    }
    // ----------------------------------------------------

    const importacao = await prisma.importacao.create({
      data: { nomeArquivo: originalName, usuario, qtdRegistros: 0, hashArquivo: hash }
    });

    const parsedData = ExcelParser.analisarBuffer(buffer, importacao.id);
    const spreadsheetOps = parsedData.operacoes;

    // --- AUTOMAÇÃO (ROTEAMENTO) ---
    await MotorRoteamentoService.aplicarRegrasRoteamento(spreadsheetOps);

    const spreadsheetSignatures = new Set(spreadsheetOps.map((op: any) => op.hash_assinatura));

    const inboxItems = await prisma.operacao.findMany({
      select: { id: true, hash_assinatura: true }
    });

    const removidos = await this.aplicarRegraSubstituicao(modo, inboxItems, spreadsheetSignatures);

    const resultado = await prisma.operacao.createMany({ 
      data: spreadsheetOps as any,
      skipDuplicates: true 
    });

    await prisma.importacao.update({
      where: { id: importacao.id },
      data: { qtdRegistros: parsedData.totalLido }
    });
        
    PastaService.invalidarCache();
    OperacaoService.invalidarCache(); 

    return { 
      totalLido: parsedData.totalLido, 
      adicionados: resultado.count, 
      ignorados: parsedData.totalLido - resultado.count,
      removidos,
      modo,
      importId: importacao.id 
    };
  }

  static async desfazerImportacao(importacaoId: number) {
    await BackupService.restaurarBackup(importacaoId);
  }

  private static async aplicarRegraSubstituicao(modo: string, inboxItems: { id: number, hash_assinatura: string | null }[], spreadsheetSignatures: Set<string>): Promise<number> {
    if (modo !== "SUBSTITUIR") return 0;

    const idsParaApagar = inboxItems
      .filter(item => item.hash_assinatura && !spreadsheetSignatures.has(item.hash_assinatura))
      .map(item => item.id);

    if (idsParaApagar.length === 0) return 0;

    const resultDel = await prisma.operacao.deleteMany({ where: { id: { in: idsParaApagar } } });
    return resultDel.count;
  }
}
