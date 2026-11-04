import { prisma } from "../../db/client";
import { Prisma } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";
import { EMISSAO_ANTIGA, FROM } from "../operacoes/filtros";
import type { RoleCode } from "../users/users.service";

// Dashboard das operações: a soma por faturista, as opções dos filtros e o "cubo" do detalhe de um
// faturista. Cada um é uma ida ao banco; o detalhe é recalculado no navegador a partir do cubo, sem
// request por clique.

// Valor de filtro que representa "vazio" (sem status, sem agência...), fora do domínio dos dados.
export const FILTRO_VAZIO = "__vazio__";

export type DashboardFiltros = {
  // Id do faturista, ou "sem" (Caixa de Entrada e pastas sem faturista).
  faturista?: string;
  // Id da pasta, ou "inbox".
  pasta?: string;
  cliente?: string;
  status?: string;
  tipo?: string;
  tipoCte?: string;
  agencia?: string;
  // Só as emissões antigas.
  antigas?: boolean;
  // Período de emissão, AAAA-MM-DD, extremos inclusivos.
  de?: string;
  ate?: string;
};

type Ator = { id: string; role: RoleCode };

// O usuário comum só vê as pastas em que é faturista. Supervisor e admin veem tudo.
function recorte(ator: Ator, filtros: DashboardFiltros): DashboardFiltros {
  return ator.role === "user" ? { ...filtros, faturista: ator.id } : filtros;
}

const igual = (coluna: string, valor?: string) => {
  if (!valor) return null;
  const col = Prisma.raw(`o."${coluna}"`);
  return valor === FILTRO_VAZIO
    ? Prisma.sql`(${col} IS NULL OR BTRIM(${col}::text) = '')`
    : Prisma.sql`${col} = ${valor}`;
};

function where(filtros: DashboardFiltros) {
  const partes: (Prisma.Sql | null)[] = [
    igual("status", filtros.status),
    igual("id_tipo_documento", filtros.tipo),
    igual("id_tipo_ctrc", filtros.tipoCte),
    igual("nm_agencia", filtros.agencia),
    igual("nm_pessoa_pagador", filtros.cliente),
  ];
  // As datas são meia-noite UTC: "até" vira menor que o dia seguinte, que usa o índice.
  if (filtros.de) partes.push(Prisma.sql`o.dt_emissao_ >= ${filtros.de}::date`);
  if (filtros.ate) partes.push(Prisma.sql`o.dt_emissao_ < ${filtros.ate}::date + interval '1 day'`);
  if (filtros.pasta === "inbox") partes.push(Prisma.sql`o."pastaId" IS NULL`);
  else if (filtros.pasta) partes.push(Prisma.sql`o."pastaId" = ${Number(filtros.pasta)}`);
  if (filtros.faturista === "sem") {
    partes.push(
      Prisma.sql`(o."pastaId" IS NULL OR o."pastaId" IN (SELECT id FROM "Pasta" WHERE "faturistaId" IS NULL))`,
    );
  } else if (filtros.faturista) {
    partes.push(
      Prisma.sql`o."pastaId" IN (SELECT id FROM "Pasta" WHERE "faturistaId" = ${filtros.faturista})`,
    );
  }
  if (filtros.antigas) partes.push(EMISSAO_ANTIGA);
  const validas = partes.filter((parte): parte is Prisma.Sql => parte !== null);
  return validas.length ? Prisma.sql`WHERE ${Prisma.join(validas, " AND ")}` : Prisma.empty;
}

const semFiltro = (filtros: DashboardFiltros) =>
  Object.values(filtros).every((valor) => valor === undefined || valor === false || valor === "");

// --- Resumo --------------------------------------------------------------------------------------

export type FaturistaResumo = {
  // null: Caixa de Entrada e pastas sem faturista.
  faturistaId: string | null;
  nome: string;
  supervisor: string | null;
  valor: number;
  quantidade: number;
};

// A visão sem filtro é a mesma para todos os supervisores e admins, e o front relê a cada 30 s: um
// minuto de cache faz o segundo poll não ir ao banco.
const RESUMO_TTL = 60_000;
let resumoCache: { value: Promise<FaturistaResumo[]>; expiresAt: number } | null = null;

function somarPorFaturista(filtros: DashboardFiltros) {
  return prisma.$queryRaw<
    {
      faturistaId: string | null;
      nome: string | null;
      supervisor: string | null;
      valor: unknown;
      quantidade: bigint;
    }[]
  >`
    SELECT pa."faturistaId", u.name AS nome, s.name AS supervisor,
           COALESCE(SUM(o.vl_total), 0) AS valor, COUNT(*) AS quantidade
      FROM ${FROM}
      LEFT JOIN "Pasta" pa ON pa.id = o."pastaId"
      LEFT JOIN users u ON u.id = pa."faturistaId"
      LEFT JOIN users s ON s.id = u."supervisorId"
      ${where(filtros)}
     GROUP BY 1, 2, 3
     ORDER BY 4 DESC`.then((rows) =>
    rows.map((row) => ({
      faturistaId: row.faturistaId,
      nome: row.nome ?? "Sem faturista",
      supervisor: row.supervisor,
      valor: Number(row.valor),
      quantidade: Number(row.quantidade),
    })),
  );
}

export async function getResumo(ator: Ator, input: DashboardFiltros) {
  const filtros = recorte(ator, input);
  let faturistas: Promise<FaturistaResumo[]>;
  if (semFiltro(filtros)) {
    if (!resumoCache || resumoCache.expiresAt < Date.now()) {
      const value = somarPorFaturista(filtros);
      resumoCache = { value, expiresAt: Date.now() + RESUMO_TTL };
      value.catch(() => (resumoCache = null));
    }
    faturistas = resumoCache.value;
  } else {
    faturistas = somarPorFaturista(filtros);
  }
  const lista = await faturistas;
  return {
    total: {
      valor: lista.reduce((soma, item) => soma + item.valor, 0),
      quantidade: lista.reduce((soma, item) => soma + item.quantidade, 0),
    },
    faturistas: lista,
  };
}

// --- Opções --------------------------------------------------------------------------------------

export type Opcoes = {
  faturistas: { id: string; nome: string }[];
  pastas: { id: number; nome: string; faturistaId: string | null }[];
  clientes: string[];
  status: string[];
  tipos: string[];
  tiposCte: string[];
  agencias: string[];
};

// Os valores distintos mudam devagar (só a importação traz novos): cinco minutos de cache.
const OPCOES_TTL = 5 * 60_000;
let opcoesCache: { value: Promise<Opcoes>; expiresAt: number } | null = null;

const distintos = (coluna: string, limite = 5000) =>
  Prisma.sql`(SELECT COALESCE(json_agg(v ORDER BY v), '[]') FROM (
    SELECT DISTINCT ${Prisma.raw(`"${coluna}"`)} AS v FROM "Operacao"
     WHERE ${Prisma.raw(`"${coluna}"`)} IS NOT NULL AND BTRIM(${Prisma.raw(`"${coluna}"`)}) <> ''
     LIMIT ${limite}) d)`;

function lerOpcoes() {
  return prisma.$queryRaw<[Opcoes]>`
    SELECT
      (SELECT COALESCE(json_agg(f ORDER BY f.nome), '[]') FROM (
         SELECT DISTINCT u.id, u.name AS nome FROM "Pasta" pa JOIN users u ON u.id = pa."faturistaId") f) AS faturistas,
      (SELECT COALESCE(json_agg(p ORDER BY p.nome), '[]') FROM (
         SELECT id, nome, "faturistaId" FROM "Pasta") p) AS pastas,
      ${distintos("nm_pessoa_pagador")} AS clientes,
      ${distintos("status")} AS status,
      ${distintos("id_tipo_documento")} AS tipos,
      ${distintos("id_tipo_ctrc")} AS "tiposCte",
      ${distintos("nm_agencia")} AS agencias`.then(([row]) => row);
}

export function invalidateOpcoes() {
  opcoesCache = null;
}

// Para os testes, que apagam o banco entre um caso e outro.
export function clearDashboardCache() {
  opcoesCache = null;
  resumoCache = null;
}

export async function getOpcoes(ator: Ator): Promise<Opcoes> {
  if (!opcoesCache || opcoesCache.expiresAt < Date.now()) {
    const value = lerOpcoes();
    opcoesCache = { value, expiresAt: Date.now() + OPCOES_TTL };
    value.catch(() => (opcoesCache = null));
  }
  const opcoes = await opcoesCache.value;
  if (ator.role !== "user") return opcoes;
  return {
    ...opcoes,
    faturistas: opcoes.faturistas.filter((item) => item.id === ator.id),
    pastas: opcoes.pastas.filter((item) => item.faturistaId === ator.id),
  };
}

// --- Cubo do faturista ---------------------------------------------------------------------------

export type CuboLinha = {
  status: string | null;
  tipo: string | null;
  agencia: string | null;
  tipoCte: string | null;
  cliente: string | null;
  pastaId: number | null;
  valor: number;
  quantidade: number;
  primeira: string | null;
  ultima: string | null;
  antigas: number;
  valorAntigas: number;
};

// O recorte de um faturista agrupado pelas cinco dimensões do detalhe e pela pasta. Tem poucas
// centenas de linhas: o navegador soma por cima dele a cada clique de filtro do detalhe.
export async function getCubo(ator: Ator, faturistaId: string | null, input: DashboardFiltros) {
  if (ator.role === "user" && faturistaId !== ator.id) {
    throw new ApiProblem(403, "FORBIDDEN", "Você só pode ver o dashboard das suas pastas.");
  }
  const filtros = { ...input, faturista: faturistaId ?? "sem" };
  const [row] = await prisma.$queryRaw<
    [{ linhas: CuboLinha[] | null; pastas: CuboPasta[] | null }]
  >`
    WITH f AS (
      SELECT o.status, o.id_tipo_documento, o.nm_agencia, o.id_tipo_ctrc, o.nm_pessoa_pagador,
             o."pastaId", o.vl_total, o.dt_emissao_, ${EMISSAO_ANTIGA} AS antiga
        FROM ${FROM} ${where(filtros)}
    )
    SELECT
      (SELECT json_agg(c) FROM (
         SELECT status, id_tipo_documento AS tipo, nm_agencia AS agencia, id_tipo_ctrc AS "tipoCte",
                nm_pessoa_pagador AS cliente, "pastaId",
                COALESCE(SUM(vl_total), 0)::float8 AS valor,
                COUNT(*)::int AS quantidade,
                to_char(MIN(dt_emissao_), 'YYYY-MM-DD') AS primeira,
                to_char(MAX(dt_emissao_), 'YYYY-MM-DD') AS ultima,
                (COUNT(*) FILTER (WHERE antiga))::int AS antigas,
                COALESCE(SUM(vl_total) FILTER (WHERE antiga), 0)::float8 AS "valorAntigas"
           FROM f GROUP BY 1, 2, 3, 4, 5, 6) c) AS linhas,
      (SELECT json_agg(p) FROM (
         SELECT id, nome, cor FROM "Pasta" WHERE id IN (SELECT "pastaId" FROM f)) p) AS pastas`;
  return { faturistaId, linhas: row.linhas ?? [], pastas: row.pastas ?? [] };
}

type CuboPasta = { id: number; nome: string; cor: string | null };
