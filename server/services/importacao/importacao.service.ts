import { createHash } from "node:crypto";
import { prisma } from "../../db/client";
import { Prisma } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";
import { recordAudit } from "../audit/audit.service";
import { invalidatePastas } from "../pastas/pastas.service";
import { invalidateRegras, mapasRoteamento } from "../regras/regras.service";
import { rotear } from "../regras/roteamento";
import { lerPlanilha, type OperacaoImportada } from "./planilha";

// Importação da planilha do ERP. Antes de cada importação, o estado inteiro (pastas, regras e
// operações) é fotografado e preso à importação anterior: desfazer uma importação é restaurar essa
// foto. As consultas pesadas rodam dentro do Postgres; nenhuma linha da tabela atravessa a rede duas
// vezes.

export type ModoImportacao = "SUBSTITUIR" | "ADICIONAR";

// Quantas fotos ficam guardadas. Cada uma tem o sistema inteiro (uns 2,3 MB hoje).
export const SNAPSHOTS_GUARDADOS = 30;

// Colunas que a planilha preenche, mais as que a importação atribui. Mesma lista no INSERT e no
// SELECT do json_populate_recordset.
const COLUNAS_IMPORTADAS = [
  "importacaoId",
  "pastaId",
  "nm_agencia",
  "cd_pessoa_pagador",
  "nm_pessoa_pagador",
  "nr_cpf_cnpj_raiz",
  "nr_cpf_cnpj_pagador",
  "nr_ctrc",
  "id_tipo_documento",
  "nm_pessoa_remetente",
  "nm_cidade_origem",
  "ds_sigla_origem",
  "nm_pessoa_destinatario",
  "nm_cidade_destino",
  "ds_sigla_destino",
  "nm_produto",
  "vl_peso",
  "vl_tarifa",
  "vl_total",
  "nr_nf",
  "ds_placa",
  "nm_pessoa_matriz",
  "nr_contrato",
  "nr_chave_acesso",
  "nm_pessoa_usuario_lancamento",
  "id_tipo_ctrc",
  "nm_proprietario_posse_cavalo",
  "nm_motorista",
  "status",
  "comentarios",
  "dt_emissao_",
  "dt_quitacao_saldo",
  "hash_assinatura",
];
const COLUNAS_SQL = Prisma.raw(COLUNAS_IMPORTADAS.map((coluna) => `"${coluna}"`).join(", "));

// Foto do estado atual, presa à última importação. Sem importação ainda, não grava nada.
async function fotografar() {
  await prisma.$executeRaw`
    INSERT INTO "SnapshotImportacao" ("importacaoId", pastas, regras, operacoes, "createdAt")
    SELECT ultima.id,
           COALESCE((SELECT json_agg(p) FROM "Pasta" p), '[]'::json),
           COALESCE((SELECT json_agg(r) FROM "RegraAutomacao" r), '[]'::json),
           COALESCE((SELECT json_agg(o) FROM "Operacao" o), '[]'::json),
           now()
      FROM (SELECT id FROM "Importacao" ORDER BY id DESC LIMIT 1) AS ultima
    ON CONFLICT ("importacaoId") DO UPDATE
       SET pastas = EXCLUDED.pastas, regras = EXCLUDED.regras, operacoes = EXCLUDED.operacoes`;
}

type Ator = { id: string; fullName: string };

export async function importarPlanilha(input: {
  buffer: Buffer;
  nomeArquivo: string;
  modo: ModoImportacao;
  ator: Ator;
}) {
  // A leitura é só CPU: uma planilha inválida para aqui, antes de qualquer escrita.
  const { operacoes, totalLido } = await lerPlanilha(input.buffer);
  const hashArquivo = createHash("sha256").update(input.buffer).digest("hex");

  const [mapas] = await Promise.all([mapasRoteamento(), fotografar()]);
  const linhas = operacoes.map((op) => ({ ...op, pastaId: rotear(op, mapas) }));

  // Criar a importação, apagar e inserir valem juntos: uma falha no meio não deixa o sistema sem as
  // operações apagadas e sem as novas.
  const resultado = await prisma.$transaction(
    async (tx) => {
      const importacao = await tx.importacao.create({
        data: {
          nomeArquivo: input.nomeArquivo,
          usuario: input.ator.fullName,
          qtdRegistros: totalLido,
          hashArquivo,
        },
      });

      // Substituir: sai o que não veio na planilha nova; o que veio de novo fica como está, com pasta,
      // status e observação.
      const removidas =
        input.modo === "SUBSTITUIR"
          ? await tx.$executeRaw`
              DELETE FROM "Operacao"
               WHERE hash_assinatura IS NOT NULL
                 AND NOT (hash_assinatura = ANY(${linhas.map((op) => op.hash_assinatura)}::text[]))`
          : 0;

      // Linha repetida (mesma assinatura) é ignorada pelo ON CONFLICT.
      const adicionadas = linhas.length
        ? await tx.$executeRaw`
            INSERT INTO "Operacao" (${COLUNAS_SQL}, "createdAt", "updatedAt")
            SELECT ${COLUNAS_SQL}, now(), now()
              FROM json_populate_recordset(NULL::"Operacao", ${JSON.stringify(
                linhas.map(
                  (op): OperacaoImportada & { importacaoId: number; pastaId: number | null } => ({
                    ...op,
                    importacaoId: importacao.id,
                  }),
                ),
              )}::json)
            ON CONFLICT DO NOTHING`
        : 0;

      await recordAudit(
        {
          actorId: input.ator.id,
          action: "importacao.created",
          targetType: "importacao",
          targetId: String(importacao.id),
          data: { nomeArquivo: input.nomeArquivo, modo: input.modo, adicionadas, removidas },
        },
        tx,
      );
      return { importacao, adicionadas, removidas };
    },
    // Uma planilha de 7 mil linhas passa do timeout padrão de 5 s do Prisma em produção.
    { timeout: 60_000, maxWait: 10_000 },
  );

  // Só as últimas fotos ficam: a importação mais antiga deixa de poder ser desfeita.
  await prisma.$executeRaw`
    DELETE FROM "SnapshotImportacao"
     WHERE "importacaoId" NOT IN (
       SELECT "importacaoId" FROM "SnapshotImportacao" ORDER BY "importacaoId" DESC LIMIT ${SNAPSHOTS_GUARDADOS})`;

  return {
    importacao: toPublic(resultado.importacao, false),
    modo: input.modo,
    totalLido,
    adicionadas: resultado.adicionadas,
    ignoradas: totalLido - resultado.adicionadas,
    removidas: resultado.removidas,
  };
}

// --- Lista ---------------------------------------------------------------------------------------

type ImportacaoRow = {
  id: number;
  nomeArquivo: string;
  usuario: string;
  qtdRegistros: number;
  createdAt: Date;
};

function toPublic(row: ImportacaoRow, podeDesfazer: boolean) {
  return {
    id: row.id,
    nomeArquivo: row.nomeArquivo,
    usuario: row.usuario,
    qtdRegistros: row.qtdRegistros,
    createdAt: row.createdAt.toISOString(),
    podeDesfazer,
  };
}

// Mais recentes primeiro. A mais recente é o estado atual; as outras podem ser desfeitas enquanto a
// foto delas existir.
export async function listImportacoes(query: { search?: string; page: number; pageSize: number }) {
  const where: Prisma.ImportacaoWhereInput = query.search
    ? {
        OR: [
          { nomeArquivo: { contains: query.search, mode: "insensitive" } },
          { usuario: { contains: query.search, mode: "insensitive" } },
        ],
      }
    : {};
  const [rows, total, ultima] = await Promise.all([
    prisma.importacao.findMany({
      where,
      select: {
        id: true,
        nomeArquivo: true,
        usuario: true,
        qtdRegistros: true,
        createdAt: true,
        snapshot: { select: { id: true } },
      },
      orderBy: { id: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.importacao.count({ where }),
    prisma.importacao.findFirst({ select: { id: true }, orderBy: { id: "desc" } }),
  ]);
  return {
    data: rows.map((row) => toPublic(row, row.snapshot !== null && row.id !== ultima?.id)),
    meta: { page: query.page, pageSize: query.pageSize, total },
  };
}

// --- Desfazer ------------------------------------------------------------------------------------

function colunas(campos: Record<string, string>, troca: Record<string, Prisma.Sql> = {}) {
  const nomes = Object.values(campos);
  return {
    destino: Prisma.raw(nomes.map((nome) => `"${nome}"`).join(", ")),
    origem: Prisma.join(nomes.map((nome) => troca[nome] ?? Prisma.raw(`s."${nome}"`))),
  };
}

// Volta o sistema ao estado guardado na foto da importação: pastas, regras e operações como estavam
// logo antes da importação seguinte, que é apagada junto com as posteriores. Tudo numa transação.
export async function desfazerImportacao(actorId: string, importacaoId: number) {
  const [importacao, ultima] = await Promise.all([
    prisma.importacao.findUnique({
      where: { id: importacaoId },
      select: { id: true, nomeArquivo: true, snapshot: { select: { id: true } } },
    }),
    prisma.importacao.findFirst({ select: { id: true }, orderBy: { id: "desc" } }),
  ]);
  if (!importacao) throw new ApiProblem(404, "IMPORTACAO_NOT_FOUND", "Importação não encontrada.");
  if (importacao.id === ultima?.id) {
    throw new ApiProblem(409, "IMPORTACAO_ATUAL", "Esta importação já é a versão atual.");
  }
  if (!importacao.snapshot) {
    throw new ApiProblem(
      409,
      "SEM_SNAPSHOT",
      `A foto desta importação já foi descartada: só as últimas ${SNAPSHOTS_GUARDADOS} podem ser desfeitas.`,
    );
  }

  // Faturista que deixou de existir, ou importação apagada agora, viram null: as FKs recusariam.
  const pasta = colunas(Prisma.PastaScalarFieldEnum, {
    faturistaId: Prisma.sql`(SELECT u.id FROM users u WHERE u.id = s."faturistaId")`,
  });
  const regra = colunas(Prisma.RegraAutomacaoScalarFieldEnum);
  const operacao = colunas(Prisma.OperacaoScalarFieldEnum, {
    importacaoId: Prisma.sql`(SELECT i.id FROM "Importacao" i WHERE i.id = s."importacaoId")`,
  });

  const desfeitas = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`DELETE FROM "Operacao"`;
      await tx.$executeRaw`DELETE FROM "RegraAutomacao"`;
      await tx.$executeRaw`DELETE FROM "Pasta"`;
      // As importações seguintes saem; a foto delas vai junto (cascade).
      const apagadas = await tx.importacao.deleteMany({ where: { id: { gt: importacaoId } } });

      await tx.$executeRaw`
        INSERT INTO "Pasta" (${pasta.destino})
        SELECT ${pasta.origem}
          FROM jsonb_populate_recordset(NULL::"Pasta",
               (SELECT pastas FROM "SnapshotImportacao" WHERE "importacaoId" = ${importacaoId})) s`;
      await tx.$executeRaw`
        INSERT INTO "RegraAutomacao" (${regra.destino})
        SELECT ${regra.origem}
          FROM jsonb_populate_recordset(NULL::"RegraAutomacao",
               (SELECT regras FROM "SnapshotImportacao" WHERE "importacaoId" = ${importacaoId})) s`;
      await tx.$executeRaw`
        INSERT INTO "Operacao" (${operacao.destino})
        SELECT ${operacao.origem}
          FROM jsonb_populate_recordset(NULL::"Operacao",
               (SELECT operacoes FROM "SnapshotImportacao" WHERE "importacaoId" = ${importacaoId})) s`;

      // Os ids voltaram da foto: as sequências continuam do maior.
      for (const tabela of ["Pasta", "RegraAutomacao", "Operacao"]) {
        await tx.$executeRaw`
          SELECT setval(pg_get_serial_sequence(${`"${tabela}"`}, 'id'),
                        COALESCE((SELECT MAX(id) FROM ${Prisma.raw(`"${tabela}"`)}), 0) + 1, false)`;
      }

      await recordAudit(
        {
          actorId,
          action: "importacao.restored",
          targetType: "importacao",
          targetId: String(importacaoId),
          data: { nomeArquivo: importacao.nomeArquivo, importacoesDesfeitas: apagadas.count },
        },
        tx,
      );
      return apagadas.count;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  invalidatePastas();
  invalidateRegras();
  return { importacaoId, importacoesDesfeitas: desfeitas };
}
