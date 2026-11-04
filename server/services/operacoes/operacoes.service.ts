import { prisma } from "../../db/client";
import { Prisma } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";
import { parseSort } from "../../lib/sort";
import { KINDS, notFound } from "../cadastros/guard";
import { validarStatus } from "../status/status.service";
import { CAMPOS_EM_LOTE, COLUNAS, colunaPorKey } from "./colunas";
import {
  EMISSAO_ANTIGA,
  FROM,
  montarWhere,
  parseFiltro,
  PLACA_DUPLICADA_DA_LINHA,
  placaDuplicada,
  type Escopo,
} from "./filtros";
import { parseData, parseNumero } from "./valores";

// Linha da grid: as colunas pelas chaves da API, mais as duas marcas calculadas no servidor.
export type OperacaoRow = Record<string, string | number | null> & {
  id: number;
  pastaId: number | null;
  emissaoAntiga: boolean;
  placaDuplicada: boolean;
};

const COLUNAS_SQL = Prisma.raw(
  COLUNAS.map((coluna) => `o."${coluna.db}" AS "${coluna.key}"`).join(", "),
);

function select(placaDuplicada: Prisma.Sql) {
  return Prisma.sql`o.id, o."pastaId", ${COLUNAS_SQL}, ${EMISSAO_ANTIGA} AS "emissaoAntiga", ${placaDuplicada} AS "placaDuplicada"`;
}

// Decimal vira number e data vira ISO: o JSON da API não carrega tipos do Prisma.
function toRow(raw: Record<string, unknown>): OperacaoRow {
  const row: Record<string, unknown> = {
    id: raw.id,
    pastaId: raw.pastaId ?? null,
    emissaoAntiga: raw.emissaoAntiga === true,
    placaDuplicada: raw.placaDuplicada === true,
  };
  for (const coluna of COLUNAS) {
    const value = raw[coluna.key];
    if (value === null || value === undefined) row[coluna.key] = null;
    else if (value instanceof Date) row[coluna.key] = value.toISOString();
    else if (coluna.tipo === "numero") row[coluna.key] = Number(value);
    else row[coluna.key] = String(value);
  }
  return row as OperacaoRow;
}

// --- Lista ---------------------------------------------------------------------------------------

export type ListQuery = {
  escopo: Escopo;
  filtro: string[];
  search?: string;
  sort?: string;
  page: number;
  pageSize: number;
};

function orderBy(sort?: string) {
  const { field, direction } = parseSort(sort ?? "");
  const coluna = field ? colunaPorKey(field) : undefined;
  if (!coluna?.ordenavel) return Prisma.sql`ORDER BY o.id DESC`;
  // CTe é texto no banco: ordena pelo número quando só tem dígitos.
  const expr =
    coluna.key === "cte"
      ? Prisma.sql`CASE WHEN o.nr_ctrc ~ '^[0-9]+$' THEN o.nr_ctrc::numeric END`
      : Prisma.raw(`o."${coluna.db}"`);
  return direction === "desc"
    ? Prisma.sql`ORDER BY ${expr} DESC NULLS FIRST, o.id DESC`
    : Prisma.sql`ORDER BY ${expr} ASC NULLS LAST, o.id DESC`;
}

async function assertEscopo(escopo: Escopo) {
  if (escopo === "inbox") return;
  const pasta = await prisma.pasta.findUnique({ where: { id: escopo }, select: { id: true } });
  if (!pasta) throw notFound(KINDS.pasta);
}

// Uma ida ao banco: o total e a soma do valor vêm como colunas de janela da própria página.
export async function listOperacoes(query: ListQuery) {
  const filtros = query.filtro.map(parseFiltro);
  const where = montarWhere({ escopo: query.escopo, filtros, search: query.search });
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ${select(placaDuplicada(query.escopo))}, COUNT(*) OVER() AS "_total", COALESCE(SUM(o.vl_total) OVER(), 0) AS "_totalVl"
        FROM ${FROM}
        ${where}
        ${orderBy(query.sort)}
       LIMIT ${query.pageSize} OFFSET ${offset}`,
    assertEscopo(query.escopo),
  ]);

  let total: number;
  let totalValor: number;
  if (rows.length > 0) {
    total = Number(rows[0]._total);
    totalValor = Number(rows[0]._totalVl);
  } else {
    // Página depois do fim: a janela não tem linha para trazer os totais.
    const [totais] = await prisma.$queryRaw<{ total: bigint; valor: unknown }[]>`
      SELECT COUNT(*) AS total, COALESCE(SUM(o.vl_total), 0) AS valor FROM ${FROM} ${where}`;
    total = Number(totais.total);
    totalValor = Number(totais.valor);
  }

  return {
    data: rows.map(toRow),
    meta: { page: query.page, pageSize: query.pageSize, total, totalValor },
  };
}

async function getRow(id: number) {
  const [row] = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT ${select(PLACA_DUPLICADA_DA_LINHA)} FROM ${FROM} WHERE o.id = ${id}`;
  if (!row) throw new ApiProblem(404, "OPERACAO_NOT_FOUND", "Operação não encontrada.");
  return toRow(row);
}

// --- Contadores ----------------------------------------------------------------------------------

// Total e emissões antigas da Caixa de Entrada e de cada pasta, numa query.
export async function getOperacaoStats() {
  const rows = await prisma.$queryRaw<
    { pastaId: number | null; total: bigint; antigas: bigint; valorAntigas: unknown }[]
  >`
    SELECT o."pastaId",
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE ${EMISSAO_ANTIGA}) AS antigas,
           COALESCE(SUM(o.vl_total) FILTER (WHERE ${EMISSAO_ANTIGA}), 0) AS "valorAntigas"
      FROM ${FROM}
     GROUP BY o."pastaId"`;
  const toStats = (row?: (typeof rows)[number]) => ({
    total: Number(row?.total ?? 0),
    emissoesAntigas: Number(row?.antigas ?? 0),
    valorEmissoesAntigas: Number(row?.valorAntigas ?? 0),
  });
  return {
    caixaDeEntrada: toStats(rows.find((row) => row.pastaId === null)),
    pastas: rows
      .filter((row) => row.pastaId !== null)
      .map((row) => ({ pastaId: row.pastaId!, ...toStats(row) })),
  };
}

// --- Edição de um campo --------------------------------------------------------------------------

const invalido = (detail: string) =>
  new ApiProblem(422, "VALIDATION_FAILED", detail, {
    errors: [{ field: "valor", message: detail }],
  });

// Texto vazio limpa o campo. Data e número inválidos dão 422: antes o valor era descartado em
// silêncio e a célula mostrava o que não foi gravado.
function converter(key: string, valor: string | null) {
  const coluna = colunaPorKey(key)!;
  const texto = valor?.trim() ?? "";
  if (texto === "") {
    if (coluna.obrigatoria) throw invalido(`${coluna.label} não pode ficar vazio.`);
    return null;
  }
  if (coluna.tipo === "data") {
    const data = parseData(texto);
    if (!data) throw invalido("Use a data no formato DD/MM/AAAA.");
    return data;
  }
  if (coluna.tipo === "numero") {
    const numero = parseNumero(texto);
    if (numero === null) throw invalido("Use um número, como 1.234,56.");
    return numero;
  }
  return texto;
}

export async function updateOperacao(id: number, input: { campo: string; valor: string | null }) {
  const coluna = colunaPorKey(input.campo)!;
  // Status só aceita uma opção ativa da lista, gravada com o nome cadastrado.
  const valor =
    coluna.key === "status"
      ? await validarStatus(input.valor)
      : converter(input.campo, input.valor);
  // Status grava a data do status só quando muda de fato.
  const set =
    coluna.key === "status"
      ? Prisma.sql`status = ${valor}, data_status = CASE WHEN status IS DISTINCT FROM ${valor} THEN now() ELSE data_status END`
      : Prisma.sql`${Prisma.raw(`"${coluna.db}"`)} = ${valor}`;
  const count = await prisma.$executeRaw`
    UPDATE "Operacao" SET ${set}, "updatedAt" = now() WHERE id = ${id}`;
  if (count === 0) throw new ApiProblem(404, "OPERACAO_NOT_FOUND", "Operação não encontrada.");
  return getRow(id);
}

// --- Lote ----------------------------------------------------------------------------------------

// As linhas marcadas uma a uma, ou todas as que a lista mostra com os filtros, menos as desmarcadas.
export type Selecao =
  { ids: number[] } | { escopo: Escopo; filtro: string[]; search?: string; excluidos: number[] };

function idsDa(selecao: Selecao) {
  if ("ids" in selecao) {
    return selecao.ids.length ? Prisma.sql`(${Prisma.join(selecao.ids)})` : Prisma.sql`(NULL)`;
  }
  const where = montarWhere({
    escopo: selecao.escopo,
    filtros: selecao.filtro.map(parseFiltro),
    search: selecao.search,
    excluidos: selecao.excluidos,
  });
  return Prisma.sql`(SELECT o.id FROM ${FROM} ${where})`;
}

export type Alteracao =
  { pastaId: number | null } | { campo: (typeof CAMPOS_EM_LOTE)[number]; valor: string | null };

export async function updateOperacoes(selecao: Selecao, alteracao: Alteracao) {
  let set: Prisma.Sql;
  if ("pastaId" in alteracao) {
    if (alteracao.pastaId !== null) await assertEscopo(alteracao.pastaId);
    set = Prisma.sql`"pastaId" = ${alteracao.pastaId}`;
  } else if (alteracao.campo === "status") {
    const valor = await validarStatus(alteracao.valor);
    set = Prisma.sql`status = ${valor}, data_status = CASE WHEN status IS DISTINCT FROM ${valor} THEN now() ELSE data_status END`;
  } else {
    const coluna = colunaPorKey(alteracao.campo)!;
    set = Prisma.sql`${Prisma.raw(`"${coluna.db}"`)} = ${alteracao.valor?.trim() || null}`;
  }
  const afetadas = await prisma.$executeRaw`
    UPDATE "Operacao" SET ${set}, "updatedAt" = now() WHERE id IN ${idsDa(selecao)}`;
  return { afetadas };
}

export async function deleteOperacoes(selecao: Selecao) {
  const afetadas = await prisma.$executeRaw`DELETE FROM "Operacao" WHERE id IN ${idsDa(selecao)}`;
  return { afetadas };
}

// --- Planilha ------------------------------------------------------------------------------------

// Teto da planilha: acima disso a pessoa filtra antes. Evita montar centenas de MB na memória.
export const LIMITE_PLANILHA = 50_000;

export async function rowsParaPlanilha(query: Omit<ListQuery, "page" | "pageSize">) {
  const where = montarWhere({
    escopo: query.escopo,
    filtros: query.filtro.map(parseFiltro),
    search: query.search,
  });
  await assertEscopo(query.escopo);
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT ${select(placaDuplicada(query.escopo))} FROM ${FROM} ${where} ${orderBy(query.sort)} LIMIT ${LIMITE_PLANILHA + 1}`;
  if (rows.length > LIMITE_PLANILHA) {
    throw new ApiProblem(
      422,
      "PLANILHA_GRANDE_DEMAIS",
      `A planilha passa de ${LIMITE_PLANILHA.toLocaleString("pt-BR")} linhas. Filtre antes de exportar.`,
    );
  }
  return rows.map(toRow);
}
