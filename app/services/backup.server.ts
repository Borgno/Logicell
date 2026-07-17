import prisma from "~/lib/prisma.server";
import { PastaService } from "./pasta.server";
import { OperacaoService } from "./operacao.server";

export class BackupService {
  static async criarBackup(importacaoId: number) {
    const todasPastas = await prisma.pasta.findMany();
    const todasRegras = await prisma.regraAutomacao.findMany();
    const todasOperacoes = await prisma.operacao.findMany();

    await (prisma as any).snapshotImportacao.upsert({
      where: { importacaoId },
      update: {
        pastas: todasPastas,
        regras: todasRegras,
        operacoes: todasOperacoes
      },
      create: {
        importacaoId,
        pastas: todasPastas,
        regras: todasRegras,
        operacoes: todasOperacoes
      }
    });
  }

  static async restaurarBackup(importacaoId: number) {
    const snapshot = await (prisma as any).snapshotImportacao.findUnique({
      where: { importacaoId }
    });

    if (!snapshot) {
      throw new Error("Nenhum backup encontrado para esta importação.");
    }

    await prisma.$transaction(async (tx) => {
      await BackupService.limparDadosAtuais(tx);
      await BackupService.restaurarPastas(tx, snapshot.pastas);
      await BackupService.restaurarRegras(tx, snapshot.regras);
      await BackupService.restaurarOperacoes(tx, snapshot.operacoes);
    });

    await BackupService.resetarSequencias();

    await prisma.importacao.deleteMany({
      where: { id: { gt: importacaoId } }
    });

    PastaService.invalidarCache();
    OperacaoService.invalidarCache();
  }

  private static async limparDadosAtuais(tx: any) {
    await tx.operacao.deleteMany();
    await tx.regraAutomacao.deleteMany();
    await tx.pasta.deleteMany();
  }

  private static async restaurarPastas(tx: any, pastasRaw: any) {
    if (!Array.isArray(pastasRaw) || pastasRaw.length === 0) return;
    const pastas = pastasRaw.map((p: any) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
    }));
    await tx.pasta.createMany({ data: pastas });
  }

  private static async restaurarRegras(tx: any, regrasRaw: any) {
    if (!Array.isArray(regrasRaw) || regrasRaw.length === 0) return;
    const regras = regrasRaw.map((r: any) => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
    }));
    await tx.regraAutomacao.createMany({ data: regras });
  }

  private static async restaurarOperacoes(tx: any, operacoesRaw: any) {
    if (!Array.isArray(operacoesRaw) || operacoesRaw.length === 0) return;
    
    const validImports = await tx.importacao.findMany({ select: { id: true } });
    const validImportIds = new Set(validImports.map((i: any) => i.id));

    const ops = operacoesRaw.map((op: any) => ({
      ...op,
      importacaoId: op.importacaoId && validImportIds.has(op.importacaoId) ? op.importacaoId : null,
      createdAt: op.createdAt ? new Date(op.createdAt) : undefined,
      updatedAt: op.updatedAt ? new Date(op.updatedAt) : undefined,
      dt_emissao_: op.dt_emissao_ ? new Date(op.dt_emissao_) : undefined,
    }));
    await tx.operacao.createMany({ data: ops });
  }

  private static async resetarSequencias() {
    await prisma.$executeRawUnsafe(`SELECT setval('"Pasta_id_seq"', COALESCE((SELECT MAX(id) FROM "Pasta"), 1))`);
    await prisma.$executeRawUnsafe(`SELECT setval('"RegraAutomacao_id_seq"', COALESCE((SELECT MAX(id) FROM "RegraAutomacao"), 1))`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Operacao_id_seq"', COALESCE((SELECT MAX(id) FROM "Operacao"), 1))`);
  }
}
