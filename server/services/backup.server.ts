import prisma from "../lib/prisma.server";
import { PastaService } from "./pasta.server";
import { OperacaoService } from "./operacao.server";

//json_agg devolve timestamps sem timezone ("2026-09-13T12:00:00.000", sem
//"Z"); sem isso o JS interpretaria a string como hora local do processo e
//deslocaria o valor. Trata a ausência de timezone como UTC (mesma leitura
//que o Prisma faz da coluna "timestamp without time zone").
function paraDataUTC(valor: any): Date | undefined {
  if (!valor) return undefined;
  if (typeof valor === "string" && !/[Zz]|[+-]\d\d:?\d\d$/.test(valor)) {
    return new Date(`${valor}Z`);
  }
  return new Date(valor);
}

export class BackupService {
  //Tira a "foto" inteira dentro do Postgres (json_agg): nenhuma linha da
  //Operacao passa pelo Node, então 7 mil registros não cruzam a rede duas
  //vezes. json_agg serializa datas sem timezone ("...T12:00:00.000", sem "Z");
  //ver paraDataUTC nos métodos de restauração abaixo. A própria query acha a
  //última importação (subquery), então o chamador não precisa de um SELECT
  //separado antes — se ainda não existe nenhuma importação, a subquery não
  //retorna linha e o INSERT vira um no-op.
  static async criarBackup() {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SnapshotImportacao" ("importacaoId", pastas, regras, operacoes, "createdAt")
       SELECT ultima.id,
         COALESCE((SELECT json_agg(p) FROM "Pasta" p), '[]'::json),
         COALESCE((SELECT json_agg(r) FROM "RegraAutomacao" r), '[]'::json),
         COALESCE((SELECT json_agg(o) FROM "Operacao" o), '[]'::json),
         now()
       FROM (SELECT id FROM "Importacao" ORDER BY "createdAt" DESC LIMIT 1) AS ultima
       ON CONFLICT ("importacaoId") DO UPDATE SET
         pastas = EXCLUDED.pastas,
         regras = EXCLUDED.regras,
         operacoes = EXCLUDED.operacoes`
    );
  }

  static async restaurarBackup(importacaoId: number) {
    const snapshot = await (prisma as any).snapshotImportacao.findUnique({
      where: { importacaoId }
    });

    if (!snapshot) {
      throw new Error("Nenhum backup encontrado para esta importação.");
    }

    // Snapshot com ~7 mil operações pode passar do timeout padrão de 5 s do
    // Prisma; 60 s de folga (maxWait = tempo esperando um slot do pool).
    await prisma.$transaction(async (tx) => {
      await BackupService.limparDadosAtuais(tx);
      await BackupService.restaurarPastas(tx, snapshot.pastas);
      await BackupService.restaurarRegras(tx, snapshot.regras);
      await BackupService.restaurarOperacoes(tx, snapshot.operacoes);
    }, { timeout: 60_000, maxWait: 10_000 });

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
      createdAt: paraDataUTC(p.createdAt),
      updatedAt: paraDataUTC(p.updatedAt),
    }));
    await tx.pasta.createMany({ data: pastas });
  }

  private static async restaurarRegras(tx: any, regrasRaw: any) {
    if (!Array.isArray(regrasRaw) || regrasRaw.length === 0) return;
    const regras = regrasRaw.map((r: any) => ({
      ...r,
      createdAt: paraDataUTC(r.createdAt),
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
      createdAt: paraDataUTC(op.createdAt),
      updatedAt: paraDataUTC(op.updatedAt),
      dt_emissao_: paraDataUTC(op.dt_emissao_) ?? null,
      dt_quitacao_saldo: paraDataUTC(op.dt_quitacao_saldo) ?? null,
      data_status: paraDataUTC(op.data_status) ?? null,
    }));
    await tx.operacao.createMany({ data: ops });
  }

  private static async resetarSequencias() {
    await prisma.$executeRawUnsafe(`SELECT setval('"Pasta_id_seq"', COALESCE((SELECT MAX(id) FROM "Pasta"), 1))`);
    await prisma.$executeRawUnsafe(`SELECT setval('"RegraAutomacao_id_seq"', COALESCE((SELECT MAX(id) FROM "RegraAutomacao"), 1))`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Operacao_id_seq"', COALESCE((SELECT MAX(id) FROM "Operacao"), 1))`);
  }
}
