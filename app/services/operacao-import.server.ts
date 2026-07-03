import crypto from "crypto";
import prisma from "~/lib/prisma.server";
import { AutomacaoService } from "./automacao.server";
import { ExcelParser } from "./excel-parser.server";
import { OperacaoService } from "./operacao.server";
import { PastaService } from "./pasta.server";

export class OperacaoImportService {
  static async processarPlanilha(buffer: Buffer, originalName: string, usuario: string = "Sistema", modo: string = "SUBSTITUIR") {
    OperacaoService.invalidarCache();
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    const importacao = await prisma.importacao.create({
      data: { nomeArquivo: originalName, usuario, qtdRegistros: 0, hashArquivo: hash }
    });

    const parsedData = ExcelParser.analisarBuffer(buffer, importacao.id);
    const spreadsheetOps = parsedData.operacoes;

    // --- AUTOMAÇÃO (ROTEAMENTO) ---
    const mapas = await AutomacaoService.obterMapasRoteamento();
    if (mapas.mapaAgencia.size > 0 || mapas.mapaCliente.size > 0) {
      for (const op of spreadsheetOps as any[]) {
        let matchedPastaId = null;

        if (op.nm_pessoa_pagador) {
          const clienteClean = String(op.nm_pessoa_pagador).trim().toUpperCase();
          if (mapas.mapaCliente.has(clienteClean)) {
            matchedPastaId = mapas.mapaCliente.get(clienteClean);
          }
        }

        if (!matchedPastaId && op.nm_agencia) {
          const agenciaClean = String(op.nm_agencia).trim().toUpperCase();
          if (mapas.mapaAgencia.has(agenciaClean)) {
            matchedPastaId = mapas.mapaAgencia.get(agenciaClean);
          }
        }

        if (matchedPastaId) {
          op.pastaId = matchedPastaId;
        }
      }
    }

    const spreadsheetSignatures = new Set(spreadsheetOps.map((op: any) => op.hash_assinatura));

    const inboxItems = await prisma.operacao.findMany({
      select: { id: true, hash_assinatura: true }
    });

    let removidos = 0;
    if (modo === "SUBSTITUIR") {
      const idsParaApagar = inboxItems
        .filter(item => item.hash_assinatura && !spreadsheetSignatures.has(item.hash_assinatura))
        .map(item => item.id);

      if (idsParaApagar.length > 0) {
        const resultDel = await prisma.operacao.deleteMany({ where: { id: { in: idsParaApagar } } });
        removidos = resultDel.count;
      }
    }

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
}
