import prisma from "../lib/prisma.server";
import { PastaService } from "./pasta.server";
import { OperacaoService } from "./operacao.server";
import { SupabaseAdminService } from "./supabase-admin.server";
import { PrazoService, type PrazoRegras } from "./prazo.server";
import { OperacaoQueryBuilder } from "./operacao-query-builder.server";

// Sentinela usada nos filtros para representar valores vazios/nulos
// (ex.: "Sem status", "Sem agência"). Fica fora do domínio real dos dados.
export const FILTRO_VAZIO = "__vazio__";

// Agrupamento genérico por uma dimensão (status, agência, tipo de documento...).
export interface DashboardGrupo {
  chave: string | null;
  valor: number;
  quantidade: number;
}

// Faturista é uma dimensão derivada da pasta (não do documento): além do nome,
// carrega o id para permitir o drill-down e o supervisor vinculado pelo admin.
export interface DashboardFaturistaGrupo extends DashboardGrupo {
  faturistaId: string | null;
  supervisorNome: string | null;
}

// Filtros globais da dashboard. `faturistaId` aceita um id real ou a sentinela
// "sem" (Caixa de Entrada + pastas sem responsável).
export interface DashboardFiltros {
  faturistaId?: string | null;
  pastaId?: string | null;
  pagador?: string | null;
  status?: string | null;
  tipoDocumento?: string | null;
  tipoCte?: string | null;
  agencia?: string | null;
  // "1" = só emissões antigas (mesma regra de prazo do filtro "Antigos" da grid).
  antigas?: string | null;
  // Período de emissão (YYYY-MM-DD, extremos inclusivos; qualquer um opcional).
  emissaoDe?: string | null;
  emissaoAte?: string | null;
}

export interface DashboardGeral {
  valorTotal: number;
  quantidade: number;
  totalPastas: number;
  totalFaturistas: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  porFaturista: DashboardFaturistaGrupo[];
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
}

export interface DashboardPastaResumo {
  pastaId: number | null;
  nome: string;
  cor: string | null;
  faturistaId: string | null;
  faturistaNome: string | null;
  valor: number;
  quantidade: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  primeiraEmissao: string | null;
  ultimaEmissao: string | null;
}

export interface DashboardPastaDetalhe {
  pasta: DashboardPastaResumo;
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
}

export interface DashboardResumo {
  geral: DashboardGeral;
  pastas: DashboardPastaResumo[];
}

// Detalhe de um faturista pré-agregado por combinação de dimensões (o "cubo").
// O navegador recalcula os sub-filtros do detalhe em cima dele, sem nova
// request a cada clique. Chaves curtas porque viajam uma vez por linha.
export interface DashboardCuboLinha {
  s: string | null; // status
  t: string | null; // id_tipo_documento
  a: string | null; // nm_agencia
  c: string | null; // id_tipo_ctrc
  p: string | null; // nm_pessoa_pagador
  pid: number | null; // pastaId (null = Caixa de Entrada)
  v: number; // soma de vl_total
  q: number; // quantidade
  d1: string | null; // primeira emissão (ISO)
  d2: string | null; // última emissão (ISO)
  aq: number; // emissões antigas: quantidade
  av: number; // emissões antigas: valor
}

export interface DashboardFaturistaCubo {
  faturistaId: string | null;
  faturistaNome: string | null;
  linhas: DashboardCuboLinha[];
  pastas: { id: number; nome: string; cor: string | null }[];
}

// Opções para os selects de filtro da dashboard.
export interface DashboardOpcoes {
  faturistas: { id: string; nome: string }[];
  pastas: { id: number; nome: string; faturistaId: string | null }[];
  clientes: string[];
  status: string[];
  tiposDocumento: string[];
  tiposCte: string[];
  agencias: string[];
}

interface GrupoPasta {
  valor: number;
  quantidade: number;
  primeira: Date | null;
  ultima: Date | null;
}

type AntigasMap = Record<string, { quantidade: number; valor: number }>;

// UMA ida ao banco monta todo o resumo. O recorte filtrado vira uma CTE
// (materializada e reutilizada) e cada agregação volta como JSON. O gargalo é
// a latência de rede (VPS → banco), então 1 round-trip importa mais que o SQL.
function sqlResumo(whereSql: string, condicaoAntigas: string): string {
  return `
WITH filtrada AS (
  SELECT "status", "id_tipo_documento", "nm_agencia", "id_tipo_ctrc",
         "nm_pessoa_pagador", "pastaId", "vl_total", "dt_emissao_"
  FROM "Operacao"
  ${whereSql}
)
SELECT
  (SELECT json_agg(d) FROM (
    SELECT
      "status" AS d_status,
      "id_tipo_documento" AS d_tipo,
      "nm_agencia" AS d_agencia,
      "id_tipo_ctrc" AS d_cte,
      "nm_pessoa_pagador" AS d_pagador,
      COALESCE(SUM("vl_total"), 0) AS valor,
      COUNT(*)::int AS quantidade,
      GROUPING("status") AS g_status,
      GROUPING("id_tipo_documento") AS g_tipo,
      GROUPING("nm_agencia") AS g_agencia,
      GROUPING("id_tipo_ctrc") AS g_cte,
      GROUPING("nm_pessoa_pagador") AS g_pagador
    FROM filtrada
    GROUP BY GROUPING SETS (("status"), ("id_tipo_documento"), ("nm_agencia"), ("id_tipo_ctrc"), ("nm_pessoa_pagador"))
  ) d) AS dimensoes,
  (SELECT json_agg(p) FROM (
    SELECT "pastaId" AS pid,
           COALESCE(SUM("vl_total"), 0) AS valor,
           COUNT(*)::int AS quantidade,
           MIN("dt_emissao_") AS primeira,
           MAX("dt_emissao_") AS ultima
    FROM filtrada
    GROUP BY "pastaId"
  ) p) AS pastas_agregado,
  (SELECT json_agg(a) FROM (
    SELECT "pastaId" AS pid, COUNT(*)::int AS quantidade, COALESCE(SUM("vl_total"), 0) AS valor
    FROM filtrada f
    WHERE f.dt_emissao_ IS NOT NULL AND ${condicaoAntigas}
    GROUP BY "pastaId"
  ) a) AS antigas,
  (SELECT json_build_object(
    'valor', COALESCE(SUM("vl_total"), 0),
    'quantidade', COUNT(*)::int
  ) FROM filtrada) AS total,
  (SELECT json_agg(pa ORDER BY pa.nome) FROM (
    SELECT id, nome, cor, "faturistaId" FROM "Pasta"
  ) pa) AS pastas`;
}

// Cubo do faturista em UMA ida ao banco: o recorte agrupado pelas 5 dimensões
// do detalhe + pasta, e o nome/cor só das pastas que aparecem nele.
function sqlCubo(whereSql: string, condicaoAntigas: string): string {
  return `
WITH filtrada AS (
  SELECT "status", "id_tipo_documento", "nm_agencia", "id_tipo_ctrc",
         "nm_pessoa_pagador", "pastaId", "vl_total", "dt_emissao_"
  FROM "Operacao"
  ${whereSql}
)
SELECT
  (SELECT json_agg(cb) FROM (
    SELECT "status" AS s, "id_tipo_documento" AS t, "nm_agencia" AS a, "id_tipo_ctrc" AS c,
           "nm_pessoa_pagador" AS p, "pastaId" AS pid,
           COALESCE(SUM("vl_total"), 0) AS v,
           COUNT(*)::int AS q,
           MIN("dt_emissao_") AS d1,
           MAX("dt_emissao_") AS d2,
           (COUNT(*) FILTER (WHERE f.dt_emissao_ IS NOT NULL AND ${condicaoAntigas}))::int AS aq,
           COALESCE(SUM("vl_total") FILTER (WHERE f.dt_emissao_ IS NOT NULL AND ${condicaoAntigas}), 0) AS av
    FROM filtrada f
    GROUP BY 1, 2, 3, 4, 5, 6
  ) cb) AS cubo,
  (SELECT json_agg(pa) FROM (
    SELECT id, nome, cor FROM "Pasta" WHERE id IN (SELECT "pastaId" FROM filtrada)
  ) pa) AS pastas`;
}

// Opções dos filtros em UMA ida ao banco (DISTINCTs agregados em JSON).
function sqlOpcoes(): string {
  return `
SELECT
  (SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT "status" AS v FROM "Operacao" WHERE "status" IS NOT NULL AND BTRIM("status") <> '') s) AS status,
  (SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT "id_tipo_documento" AS v FROM "Operacao" WHERE "id_tipo_documento" IS NOT NULL AND BTRIM("id_tipo_documento") <> '') t) AS tipos_documento,
  (SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT "id_tipo_ctrc" AS v FROM "Operacao" WHERE "id_tipo_ctrc" IS NOT NULL AND BTRIM("id_tipo_ctrc") <> '') c) AS tipos_cte,
  (SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT "nm_agencia" AS v FROM "Operacao" WHERE "nm_agencia" IS NOT NULL AND BTRIM("nm_agencia") <> '') a) AS agencias,
  (SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT "nm_pessoa_pagador" AS v FROM "Operacao" WHERE "nm_pessoa_pagador" IS NOT NULL AND BTRIM("nm_pessoa_pagador") <> '' LIMIT 5000) p) AS clientes,
  (SELECT json_agg(pa ORDER BY pa.nome) FROM (SELECT id, nome, cor, "faturistaId" FROM "Pasta") pa) AS pastas`;
}

// Mesma coisa, mas filtrada por pasta + linha de total com MIN/MAX de emissão.
const SQL_DIMENSOES_PASTA = `
  SELECT
    "status" AS d_status,
    "id_tipo_documento" AS d_tipo,
    "nm_agencia" AS d_agencia,
    "id_tipo_ctrc" AS d_cte,
    "nm_pessoa_pagador" AS d_pagador,
    COALESCE(SUM("vl_total"), 0) AS valor,
    COUNT(*)::int AS quantidade,
    MIN("dt_emissao_") AS primeira,
    MAX("dt_emissao_") AS ultima,
    GROUPING("status") AS g_status,
    GROUPING("id_tipo_documento") AS g_tipo,
    GROUPING("nm_agencia") AS g_agencia,
    GROUPING("id_tipo_ctrc") AS g_cte,
    GROUPING("nm_pessoa_pagador") AS g_pagador
  FROM "Operacao"
  WHERE "pastaId" IS NOT DISTINCT FROM $1
  GROUP BY GROUPING SETS (("status"), ("id_tipo_documento"), ("nm_agencia"), ("id_tipo_ctrc"), ("nm_pessoa_pagador"), ())
`;

interface ParsedDimensoes {
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  porPagador: DashboardGrupo[];
  agregado?: { valor: number; quantidade: number; primeira: Date | null; ultima: Date | null };
}

function parsearGroupingSets(rows: any[]): ParsedDimensoes {
  const porStatus: DashboardGrupo[] = [];
  const porTipoDocumento: DashboardGrupo[] = [];
  const porAgencia: DashboardGrupo[] = [];
  const porTipoCte: DashboardGrupo[] = [];
  const porPagador: DashboardGrupo[] = [];
  let agregado: ParsedDimensoes["agregado"];

  for (const r of rows) {
    const valor = Number(r.valor) || 0;
    const quantidade = Number(r.quantidade) || 0;
    if (r.g_status === 0) porStatus.push({ chave: r.d_status ?? null, valor, quantidade });
    else if (r.g_tipo === 0) porTipoDocumento.push({ chave: r.d_tipo ?? null, valor, quantidade });
    else if (r.g_agencia === 0) porAgencia.push({ chave: r.d_agencia ?? null, valor, quantidade });
    else if (r.g_cte === 0) porTipoCte.push({ chave: r.d_cte ?? null, valor, quantidade });
    else if (r.g_pagador === 0) porPagador.push({ chave: r.d_pagador ?? null, valor, quantidade });
    else agregado = { valor, quantidade, primeira: r.primeira ?? null, ultima: r.ultima ?? null };
  }

  const sortDesc = (arr: DashboardGrupo[]) => arr.sort((a, b) => b.valor - a.valor);
  return {
    porStatus: sortDesc(porStatus),
    porTipoDocumento: sortDesc(porTipoDocumento),
    porAgencia: sortDesc(porAgencia),
    porTipoCte: sortDesc(porTipoCte),
    porPagador: sortDesc(porPagador),
    agregado,
  };
}

// Datas vindas de JSON do Postgres (timestamp sem fuso) são tratadas como UTC,
// igual ao que o Prisma faz — evita deslocar o dia conforme o TZ do servidor.
function parseDataUTC(valor: any): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const s = String(valor);
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
}

//DashboardService
//Responsabilidade: visão geral, lista de pastas, detalhamento por pasta e por
//faturista. Otimizado para a latência do banco: poucas idas ao banco + cache em
//memória (o cache só é usado quando não há filtros ativos).
export class DashboardService {
  // O resumo inteiro é cacheado no servidor: o client faz polling de 30s, e o
  // TTL maior que o intervalo garante que o 2º poll seja cache hit.
  private static resumoCache: DashboardResumo | null = null;
  private static resumoCacheTime = 0;
  private static readonly RESUMO_TTL = 1000 * 60;

  private static opcoesCache: DashboardOpcoes | null = null;
  private static opcoesCacheTime = 0;
  private static readonly OPCOES_TTL = 1000 * 60 * 5;

  // Lista de usuários já vem cacheada de SupabaseAdminService (A6a) — sem
  // cache próprio aqui para não duplicar a mesma informação em dois lugares.
  private static async nomesFaturista(): Promise<Map<string, string>> {
    const nomes = new Map<string, string>();
    try {
      const { usuarios } = await SupabaseAdminService.listarUsuarios(1, 1000);
      for (const u of usuarios) nomes.set(u.id, u.nome || u.email);
    } catch {
      // mantém fallback (id) se o Supabase falhar
    }
    return nomes;
  }

  // Nome do supervisor de cada atendente (faturista), da mesma lista cacheada.
  private static async supervisores(): Promise<Map<string, string>> {
    const supervisores = new Map<string, string>();
    try {
      const { usuarios } = await SupabaseAdminService.listarUsuarios(1, 1000);
      for (const u of usuarios) if (u.supervisorNome) supervisores.set(u.id, u.supervisorNome);
    } catch {
      // sem supervisor na tela se o Supabase falhar
    }
    return supervisores;
  }

  private static filtroAtivo(filtros: DashboardFiltros): boolean {
    return Object.values(filtros).some((v) => v !== undefined && v !== null && v !== "");
  }

  // Condições SQL dos filtros globais. As colunas sem alias são qualificadas
  // entre aspas ("status"); com alias usam o prefixo (o.status).
  private static construirWhereFiltros(
    filtros: DashboardFiltros,
    params: any[],
    alias = ""
  ): string[] {
    const col = (nome: string) => (alias ? `${alias}."${nome}"` : `"${nome}"`);
    const conds: string[] = [];

    const addIgual = (nome: string, valor?: string | null) => {
      if (!valor) return;
      if (valor === FILTRO_VAZIO) {
        conds.push(`(${col(nome)} IS NULL OR BTRIM(${col(nome)}::text) = '')`);
      } else {
        params.push(valor);
        conds.push(`${col(nome)} = $${params.length}`);
      }
    };

    addIgual("status", filtros.status);
    addIgual("id_tipo_documento", filtros.tipoDocumento);
    addIgual("id_tipo_ctrc", filtros.tipoCte);
    addIgual("nm_agencia", filtros.agencia);
    addIgual("nm_pessoa_pagador", filtros.pagador);

    // Datas de emissão são meia-noite UTC: "até" vira < dia seguinte (indexável).
    if (filtros.emissaoDe) {
      params.push(filtros.emissaoDe);
      conds.push(`${col("dt_emissao_")} >= $${params.length}::date`);
    }
    if (filtros.emissaoAte) {
      params.push(filtros.emissaoAte);
      conds.push(`${col("dt_emissao_")} < $${params.length}::date + interval '1 day'`);
    }

    // Pasta: "inbox" = Caixa de Entrada (pastaId null); demais = id numérico.
    if (filtros.pastaId) {
      if (filtros.pastaId === "inbox") {
        conds.push(`${col("pastaId")} IS NULL`);
      } else {
        const pid = Number(filtros.pastaId);
        if (Number.isFinite(pid)) {
          params.push(pid);
          conds.push(`${col("pastaId")} = $${params.length}`);
        }
      }
    }

    if (filtros.faturistaId) {
      if (filtros.faturistaId === "sem") {
        conds.push(
          `(${col("pastaId")} IS NULL OR ${col("pastaId")} IN (SELECT id FROM "Pasta" WHERE "faturistaId" IS NULL))`
        );
      } else {
        params.push(filtros.faturistaId);
        conds.push(
          `${col("pastaId")} IN (SELECT id FROM "Pasta" WHERE "faturistaId" = $${params.length})`
        );
      }
    }

    return conds;
  }

  // WHERE da CTE "filtrada" (resumo e cubo): filtros globais + "só antigas".
  private static montarWhere(filtros: DashboardFiltros, regras: PrazoRegras, params: any[]): string {
    const conds = this.construirWhereFiltros(filtros, params);
    // A CTE lê "Operacao" sem alias, então o próprio nome da tabela serve de prefixo.
    if (filtros.antigas) {
      conds.push(
        `("Operacao".dt_emissao_ IS NOT NULL AND ${OperacaoQueryBuilder.construirCondicaoAntigas(regras, params, `"Operacao"`)})`
      );
    }
    return conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  }

  private static montarResumoPasta(
    info: { id: number | null; nome: string; cor: string | null; faturistaId: string | null },
    grupo: GrupoPasta | null,
    antigas: { quantidade: number; valor: number } | null,
    nomes: Map<string, string>
  ): DashboardPastaResumo {
    const valor = grupo?.valor ?? 0;
    const quantidade = grupo?.quantidade ?? 0;
    return {
      pastaId: info.id,
      nome: info.nome,
      cor: info.cor,
      faturistaId: info.faturistaId,
      faturistaNome: info.faturistaId ? nomes.get(info.faturistaId) || "Faturista" : null,
      valor,
      quantidade,
      emissaoAntigas: antigas?.quantidade ?? 0,
      emissaoAntigasValor: antigas?.valor ?? 0,
      primeiraEmissao: grupo?.primeira ? grupo.primeira.toISOString() : null,
      ultimaEmissao: grupo?.ultima ? grupo.ultima.toISOString() : null,
    };
  }

  private static async computarResumo(filtros: DashboardFiltros): Promise<DashboardResumo> {
    const temFiltro = this.filtroAtivo(filtros);

    // Nomes vêm do Supabase (cache longo); regras de prazo também são cacheadas.
    const [regras, nomes, supervisores] = await Promise.all([
      PrazoService.regras(),
      this.nomesFaturista(),
      this.supervisores(),
    ]);

    const params: any[] = [];
    const whereSql = this.montarWhere(filtros, regras, params);
    const condicaoAntigas = OperacaoQueryBuilder.construirCondicaoAntigas(regras, params, "f");

    // 1 única ida ao banco: dimensões, agregado por pasta, atrasos, total e pastas.
    const rows = await prisma.$queryRawUnsafe<any[]>(
      sqlResumo(whereSql, condicaoAntigas),
      ...params
    );
    const row = rows[0] ?? {};

    const { porStatus, porTipoDocumento, porAgencia, porTipoCte, porPagador } =
      parsearGroupingSets(row.dimensoes ?? []);

    const pastas: { id: number; nome: string; cor: string | null; faturistaId: string | null }[] =
      row.pastas ?? [];

    const grupoPorPasta = new Map<number | null, GrupoPasta>();
    for (const g of row.pastas_agregado ?? []) {
      grupoPorPasta.set(g.pid, {
        valor: Number(g.valor) || 0,
        quantidade: Number(g.quantidade) || 0,
        primeira: parseDataUTC(g.primeira),
        ultima: parseDataUTC(g.ultima),
      });
    }

    const antigas: AntigasMap = {};
    for (const a of row.antigas ?? []) {
      antigas[a.pid === null ? "inbox" : String(a.pid)] = {
        quantidade: Number(a.quantidade) || 0,
        valor: Number(a.valor) || 0,
      };
    }

    // Com filtro ativo, só interessam as pastas que têm documentos no recorte.
    const pastasBase = temFiltro ? pastas.filter((p) => grupoPorPasta.has(p.id)) : pastas;

    const pastasResumo: DashboardPastaResumo[] = pastasBase.map((p) =>
      this.montarResumoPasta(
        { id: p.id, nome: p.nome, cor: p.cor, faturistaId: p.faturistaId },
        grupoPorPasta.get(p.id) ?? null,
        antigas[String(p.id)] ?? null,
        nomes
      )
    );

    // Caixa de Entrada (pastaId null) entra na lista apenas se tiver documentos.
    const grupoInbox = grupoPorPasta.get(null);
    if (grupoInbox) {
      pastasResumo.push(
        this.montarResumoPasta(
          { id: null, nome: "Caixa de Entrada", cor: null, faturistaId: null },
          grupoInbox,
          antigas["inbox"] ?? null,
          nomes
        )
      );
    }

    pastasResumo.sort((a, b) => b.valor - a.valor);

    const valorTotal = Number(row.total?.valor) || 0;
    const quantidade = Number(row.total?.quantidade) || 0;
    const emissaoAntigas = Object.values(antigas).reduce((s, a) => s + a.quantidade, 0);
    const emissaoAntigasValor = Object.values(antigas).reduce((s, a) => s + a.valor, 0);
    const faturistas = new Set(pastas.map((p) => p.faturistaId).filter(Boolean));

    // Soma do valor total dos documentos por faturista responsável pela pasta.
    const acumuladoFaturista = new Map<string, DashboardFaturistaGrupo>();
    for (const p of pastasResumo) {
      const chave = p.faturistaId ?? "sem";
      const item = acumuladoFaturista.get(chave) ?? {
        chave: p.faturistaNome ?? "Sem faturista",
        faturistaId: p.faturistaId,
        supervisorNome: p.faturistaId ? supervisores.get(p.faturistaId) ?? null : null,
        valor: 0,
        quantidade: 0,
      };
      item.valor += p.valor;
      item.quantidade += p.quantidade;
      acumuladoFaturista.set(chave, item);
    }
    const porFaturista = [...acumuladoFaturista.values()]
      .filter((g) => g.quantidade > 0)
      .sort((a, b) => b.valor - a.valor);

    return {
      geral: {
        valorTotal,
        quantidade,
        totalPastas: pastasBase.length,
        totalFaturistas: faturistas.size,
        emissaoAntigas,
        emissaoAntigasValor,
        porFaturista,
        porStatus,
        porTipoDocumento,
        porAgencia,
        porTipoCte,
        topPagadores: porPagador.slice(0, 10),
      },
      pastas: pastasResumo,
    };
  }

  static async resumo(filtros: DashboardFiltros = {}): Promise<DashboardResumo> {
    // O cache global só vale para a visão sem filtros (chave única).
    if (!this.filtroAtivo(filtros)) {
      if (this.resumoCache && Date.now() - this.resumoCacheTime < this.RESUMO_TTL) {
        return this.resumoCache;
      }
      const resumo = await this.computarResumo(filtros);
      this.resumoCache = resumo;
      this.resumoCacheTime = Date.now();
      return resumo;
    }

    return this.computarResumo(filtros);
  }

  // Cubo do detalhe de um faturista ("sem" = Caixa de Entrada + pastas sem
  // dono) com os filtros globais. Os sub-filtros do detalhe rodam no navegador.
  static async faturistaCubo(
    faturistaId: string | null,
    filtros: DashboardFiltros = {}
  ): Promise<DashboardFaturistaCubo> {
    const recorte: DashboardFiltros = { ...filtros, faturistaId: faturistaId ?? "sem" };
    const [regras, nomes] = await Promise.all([PrazoService.regras(), this.nomesFaturista()]);

    const params: any[] = [];
    const whereSql = this.montarWhere(recorte, regras, params);
    const condicaoAntigas = OperacaoQueryBuilder.construirCondicaoAntigas(regras, params, "f");
    const rows = await prisma.$queryRawUnsafe<any[]>(sqlCubo(whereSql, condicaoAntigas), ...params);
    const row = rows[0] ?? {};

    const iso = (d: any) => parseDataUTC(d)?.toISOString() ?? null;
    const linhas: DashboardCuboLinha[] = (row.cubo ?? []).map((l: any) => ({
      s: l.s,
      t: l.t,
      a: l.a,
      c: l.c,
      p: l.p,
      pid: l.pid,
      v: Number(l.v) || 0,
      q: Number(l.q) || 0,
      d1: iso(l.d1),
      d2: iso(l.d2),
      aq: Number(l.aq) || 0,
      av: Number(l.av) || 0,
    }));

    return {
      faturistaId,
      faturistaNome: faturistaId ? nomes.get(faturistaId) || "Faturista" : null,
      linhas,
      pastas: row.pastas ?? [],
    };
  }

  // Listas distintas usadas nos selects de filtro. Cache longo: muda pouco.
  static async opcoes(): Promise<DashboardOpcoes> {
    if (this.opcoesCache && Date.now() - this.opcoesCacheTime < this.OPCOES_TTL) {
      return this.opcoesCache;
    }

    // 1 única ida ao banco para todos os DISTINCTs + pastas; nomes vêm do Supabase.
    const [rows, nomes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(sqlOpcoes()),
      this.nomesFaturista(),
    ]);
    const row = rows[0] ?? {};

    const pastas: { id: number; nome: string; faturistaId: string | null }[] = row.pastas ?? [];

    const ids = new Set<string>();
    for (const p of pastas) if (p.faturistaId) ids.add(p.faturistaId);
    const faturistas = [...ids]
      .map((id) => ({ id, nome: nomes.get(id) || "Faturista" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const pastasOpcoes = [...pastas]
      .map((p) => ({ id: p.id, nome: p.nome, faturistaId: p.faturistaId }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const opcoes: DashboardOpcoes = {
      faturistas,
      pastas: pastasOpcoes,
      clientes: row.clientes ?? [],
      status: row.status ?? [],
      tiposDocumento: row.tipos_documento ?? [],
      tiposCte: row.tipos_cte ?? [],
      agencias: row.agencias ?? [],
    };

    this.opcoesCache = opcoes;
    this.opcoesCacheTime = Date.now();
    return opcoes;
  }

  static async pastaDetalhe(pastaId: number | null): Promise<DashboardPastaDetalhe> {
    const [rows, nomes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(SQL_DIMENSOES_PASTA, pastaId),
      this.nomesFaturista(),
    ]);

    const { porStatus, porTipoDocumento, porAgencia, porTipoCte, porPagador, agregado } =
      parsearGroupingSets(rows);

    let info: { id: number | null; nome: string; cor: string | null; faturistaId: string | null };
    let antigas: { quantidade: number; valor: number } | null = null;

    if (pastaId === null) {
      info = { id: null, nome: "Caixa de Entrada", cor: null, faturistaId: null };
      antigas = (await OperacaoService.emissoesAntigasPorPasta().catch((): AntigasMap => ({})))["inbox"] ?? null;
    } else {
      const pasta = await PastaService.buscarPorId(pastaId);
      if (!pasta) {
        const err: any = new Error("Pasta não encontrada.");
        err.status = 404;
        throw err;
      }
      info = { id: pasta.id, nome: pasta.nome, cor: pasta.cor, faturistaId: pasta.faturistaId };
      antigas = (await OperacaoService.emissoesAntigasPorPasta().catch((): AntigasMap => ({})))[String(pastaId)] ?? null;
    }

    const grupo: GrupoPasta = {
      valor: agregado?.valor ?? 0,
      quantidade: agregado?.quantidade ?? 0,
      primeira: agregado?.primeira ?? null,
      ultima: agregado?.ultima ?? null,
    };

    return {
      pasta: this.montarResumoPasta(info, grupo, antigas, nomes),
      porStatus,
      porTipoDocumento,
      porAgencia,
      porTipoCte,
      topPagadores: porPagador.slice(0, 10),
    };
  }
}
