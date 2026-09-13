import prisma from "../lib/prisma.server";
import { DateParser } from "../utils/date-parser";
import { PastaService } from "./pasta.server";
import { OperacaoQueryBuilder } from "./operacao-query-builder.server";
import { PrazoService } from "./prazo.server";

export interface BulkActionParams {
  ids: number[];
  pastaId?: number | null;
  filtros?: any;
  selectAll?: boolean;
  excludedIds?: number[];
}

//OperacaoService
//Responsabilidade: Interações puras de Banco de Dados com a tabela Operacao.
//Transformações de dados, validações complexas e regras de negócio de parsing
//foram extraídas para `excel-parser.server.ts` e `operacao-query-builder.server.ts`.
export class OperacaoService {
  private static agenciasCache: string[] | null = null;
  private static agenciasCacheTime = 0;
  private static inboxCountCache: number | null = null;
  private static inboxCountCacheTime = 0;
  private static countCache = new Map<string, { count: number; totalVl: number; timestamp: number }>();
  // Placas duplicadas por pasta (Caixa de Entrada = pastaId null)
  private static dupsCache = new Map<string, { placas: Set<string>; timestamp: number }>();
  private static antigasCache: { porPasta: Record<string, { quantidade: number; valor: number }>; timestamp: number } | null = null;
  private static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutos
  private static readonly SHORT_TTL = 1000 * 30;    // 30 segundos
  private static readonly COUNT_CACHE_TTL = 1000 * 60; // 60 segundos

  static invalidarCache() {
    this.agenciasCache = null;
    this.agenciasCacheTime = 0;
    this.inboxCountCache = null;
    this.inboxCountCacheTime = 0;
    this.countCache.clear();
    this.dupsCache.clear();
    this.antigasCache = null;
    PastaService.invalidarCache();
  }

  // Whitelist de colunas ordenáveis (anti SQL injection) — datas, CTe e valores numéricos
  private static readonly SORTABLE_COLUMNS: Record<string, string> = {
    // nr_ctrc é texto no banco: ordena numericamente quando só tem dígitos
    nr_ctrc: `CASE WHEN o.nr_ctrc ~ '^[0-9]+$' THEN o.nr_ctrc::numeric END`,
    dt_emissao_: "o.dt_emissao_",
    data_status: "o.data_status",
    dt_quitacao_saldo: "o.dt_quitacao_saldo",
    vl_peso: "o.vl_peso",
    vl_tarifa: "o.vl_tarifa",
    vl_total: "o.vl_total",
  };

  private static montarOrderBy(filtros: any): string {
    const sortCol = filtros.sortCol;
    const coluna = this.SORTABLE_COLUMNS[sortCol];
    if (!coluna) return "ORDER BY o.id DESC";

    const isDesc = filtros.sortDir === "desc";
    const dir = isDesc ? "DESC" : "ASC";
    const nulls = isDesc ? "NULLS FIRST" : "NULLS LAST";

    // id DESC como desempate para paginação estável
    return `ORDER BY ${coluna} ${dir} ${nulls}, o.id DESC`;
  }


  static async listarOperacoesLocal(filtros: any) {
    const { page = 1, limit = 200, pastaId } = filtros;
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const l = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 200)));
    const offset = (p - 1) * l;

    const orderClause = this.montarOrderBy(filtros);
    // Resolve pastaNome -> pastaId uma vez (cache) para usar tanto no WHERE
    // quanto nas placas duplicadas, que hoje recebem o pastaId cru.
    const pid = await OperacaoQueryBuilder.resolverPastaId(pastaId, filtros);
    const whereClause = await OperacaoQueryBuilder.construirWhere(pastaId, filtros);
    const cacheKey = JSON.stringify({ sql: whereClause.sql, params: whereClause.params });
    const cachedEntry = this.countCache.get(cacheKey);
    const isCountCached = cachedEntry && Date.now() - cachedEntry.timestamp < this.COUNT_CACHE_TTL;

    // Uma única ida ao banco: COUNT e SUM vêm como colunas de janela (OVER()),
    // eliminando a segunda query (COUNT+SUM) que antes dobrava o round-trip
    // de rede — o gargalo real aqui é latência (VPS/DB na Europa), não o SQL.
    const data = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          o.id, o.nm_agencia, o.dt_emissao_, o.cd_pessoa_pagador, o.nm_pessoa_pagador,
          o.nr_cpf_cnpj_raiz, o.nr_cpf_cnpj_pagador, o.nr_ctrc, o.status, o.comentarios,
          o.id_tipo_documento, o.nm_pessoa_remetente, o.nm_cidade_origem, o.ds_sigla_origem,
          o.nm_pessoa_destinatario, o.nm_cidade_destino, o.ds_sigla_destino, o.nm_produto,
          o.vl_peso, o.vl_tarifa, o.vl_total, o.nr_nf, o.ds_placa, o.nm_pessoa_matriz,
          o.nr_contrato, o.nr_chave_acesso, o.nm_pessoa_usuario_lancamento, o.id_tipo_ctrc,
          o.nm_proprietario_posse_cavalo, o.nm_motorista, o.data_status, o.id_solicitacao, o.dt_quitacao_saldo,
          COUNT(*) OVER() AS _total_count,
          COALESCE(SUM(o.vl_total) OVER(), 0) AS _total_vl
        FROM "Operacao" o
        ${whereClause.sql}
        ${orderClause}
        LIMIT ${l} OFFSET ${offset}
      `, ...whereClause.params);

    const [placasDuplicadas, regras] = await Promise.all([
      this.placasDuplicadasDaPasta(pid),
      PrazoService.regras(),
    ]);
    const agora = Date.now();
    const MILIS_DIA = 24 * 60 * 60 * 1000;

    const sanitizedData = data.map((item) => {
      const { _total_count, _total_vl, ...rest } = item;

      // Placa duplicada dentro do escopo da pasta atual (ex.: Caixa de Entrada)
      const placa = rest.ds_placa ? String(rest.ds_placa).trim() : "";
      rest.placaDuplicada = placa !== "" && placasDuplicadas.has(placa.toUpperCase());

      // Emissão antiga: data de emissão anterior ao prazo do cliente (ou padrão)
      const cliente = rest.nm_pessoa_pagador ? String(rest.nm_pessoa_pagador).trim().toUpperCase() : "";
      const prazoDias = regras.porCliente[cliente] ?? regras.padraoDias;
      const dt = rest.dt_emissao_ ? new Date(rest.dt_emissao_).getTime() : null;
      rest.emissaoAntiga = dt !== null && dt < agora - prazoDias * MILIS_DIA;

      return {
        ...rest,
        vl_total: rest.vl_total ? Number(rest.vl_total) : null,
        vl_peso: rest.vl_peso ? Number(rest.vl_peso) : 0,
        vl_tarifa: rest.vl_tarifa ? Number(rest.vl_tarifa) : 0,
      };
    });

    let total: number;
    let totalVl: number;
    if (isCountCached) {
      total = cachedEntry.count;
      totalVl = cachedEntry.totalVl;
    } else if (data.length > 0) {
      total = Number(data[0]._total_count) || 0;
      totalVl = Number(data[0]._total_vl) || 0;
      this.countCache.set(cacheKey, { count: total, totalVl, timestamp: Date.now() });
    } else {
      // Página além do fim dos resultados: a janela não tem linha para reportar totais
      const totalRes = await prisma.$queryRawUnsafe<any>(
        `SELECT COUNT(*) as count, COALESCE(SUM("vl_total"), 0) AS "totalVl" FROM "Operacao" o ${whereClause.sql}`,
        ...whereClause.params
      );
      total = Number(totalRes[0].count);
      totalVl = Number(totalRes[0].totalVl) || 0;
    }

    return {
      data: sanitizedData,
      meta: { total, totalVl, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  static async listarIds(filtros: any, excludedIds: number[] = []) {
    const { pastaId } = filtros;
    const whereClause = await OperacaoQueryBuilder.construirWhere(pastaId, filtros, excludedIds);
    const ids: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "Operacao" o ${whereClause.sql}`, ...whereClause.params);
    return ids.map(i => i.id);
  }



  static async contarInbox() { 
    if (this.inboxCountCache !== null && Date.now() - this.inboxCountCacheTime < this.SHORT_TTL) {
      return this.inboxCountCache;
    }
    const count = await prisma.operacao.count({ where: { pastaId: null } });
    this.inboxCountCache = count;
    this.inboxCountCacheTime = Date.now();
    return count;
  }

  // Placas com mais de uma ocorrência dentro da pasta (pastaId null = Caixa de Entrada).
  static async placasDuplicadasDaPasta(pastaId: number | string | null | undefined): Promise<Set<string>> {
    const pid = pastaId === "" || pastaId === undefined || isNaN(Number(pastaId)) ? null : Number(pastaId);
    const cacheKey = pid === null ? "inbox" : `pasta:${pid}`;
    const cached = this.dupsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.COUNT_CACHE_TTL) {
      return cached.placas;
    }

    const rows = await prisma.$queryRawUnsafe<{ ds_placa: string }[]>(
      `SELECT UPPER(BTRIM(ds_placa)) AS ds_placa
       FROM "Operacao"
       WHERE ds_placa IS NOT NULL AND BTRIM(ds_placa) <> ''
         AND "pastaId" IS NOT DISTINCT FROM $1
       GROUP BY UPPER(BTRIM(ds_placa))
       HAVING COUNT(*) > 1`,
      pid
    );

    const placas = new Set(rows.map((r) => r.ds_placa));
    this.dupsCache.set(cacheKey, { placas, timestamp: Date.now() });
    return placas;
  }

  // Emissões com atraso por pasta, com quantidade e valor (chave "inbox" =
  // Caixa de Entrada / pastaId null; demais chaves = id da pasta).
  static async emissoesAntigasPorPasta(): Promise<Record<string, { quantidade: number; valor: number }>> {
    if (this.antigasCache && Date.now() - this.antigasCache.timestamp < this.COUNT_CACHE_TTL) {
      return this.antigasCache.porPasta;
    }

    const regras = await PrazoService.regras();
    const params: any[] = [];
    const condicaoAntigas = OperacaoQueryBuilder.construirCondicaoAntigas(regras, params);

    const rows = await prisma.$queryRawUnsafe<{ pid: number | null; antigas: bigint; valor: any }[]>(
      `SELECT "pastaId" AS pid, COUNT(*) AS antigas, COALESCE(SUM(o.vl_total), 0) AS valor
       FROM "Operacao" o
       WHERE o.dt_emissao_ IS NOT NULL AND ${condicaoAntigas}
       GROUP BY "pastaId"`,
      ...params
    );

    const porPasta: Record<string, { quantidade: number; valor: number }> = {};
    for (const r of rows) {
      porPasta[r.pid === null ? "inbox" : String(r.pid)] = {
        quantidade: Number(r.antigas),
        valor: Number(r.valor) || 0,
      };
    }
    this.antigasCache = { porPasta, timestamp: Date.now() };
    return porPasta;
  }

  // Compatibilidade: apenas a contagem (usada pela sidebar/boot).
  static async contarEmissoesAntigasPorPasta(): Promise<Record<string, number>> {
    const detalhado = await this.emissoesAntigasPorPasta();
    const porPasta: Record<string, number> = {};
    for (const [chave, item] of Object.entries(detalhado)) {
      porPasta[chave] = item.quantidade;
    }
    return porPasta;
  }

  static async buscarAgencias() {
    if (this.agenciasCache && Date.now() - this.agenciasCacheTime < this.CACHE_TTL) {
      return this.agenciasCache;
    }
    // DISTINCT é 3-5x mais rápido que groupBy do Prisma em tabelas grandes
    const rows = await prisma.$queryRaw<{ nm_agencia: string }[]>`
      SELECT DISTINCT nm_agencia FROM "Operacao"
      WHERE nm_agencia IS NOT NULL AND nm_agencia <> ''
      ORDER BY nm_agencia ASC
    `;
    this.agenciasCache = rows.map(r => r.nm_agencia);
    this.agenciasCacheTime = Date.now();
    return this.agenciasCache;
  }

  static async bulkActionPasta({ ids, pastaId = null, filtros, selectAll = false, excludedIds = [] }: BulkActionParams) {
    const finalPastaId = (pastaId === null || isNaN(pastaId)) ? null : pastaId;
    let affectedIds = ids;

    if (selectAll && filtros) {
      affectedIds = await this.listarIds(filtros, excludedIds);
    }

    if (affectedIds.length === 0) {
      this.invalidarCache();
      return { success: true };
    }

    // Executa o update
    await prisma.operacao.updateMany({
      where: { id: { in: affectedIds } },
      data: { pastaId: finalPastaId }
    });

    this.invalidarCache();
    await PastaService.invalidarCache();
    return { success: true };
  }

  static async bulkDelete({ ids, filtros: filters, selectAll = false, excludedIds = [] }: BulkActionParams) {
    let affectedIds = ids;
    if (selectAll && filters) {
      affectedIds = await this.listarIds(filters, excludedIds);
    }

    if (affectedIds.length > 0) {
      await prisma.operacao.deleteMany({ where: { id: { in: affectedIds } } });
    }

    this.invalidarCache();
    await PastaService.invalidarCache();
    return { success: true };
  }

  static async update(id: number, campo: string, valorNovo: string) {
    this.invalidarCache();

    let valorLimpo: any = valorNovo;
    if (campo === "dt_emissao_" || campo === "data_status" || campo === "dt_quitacao_saldo") {
      const d = DateParser.parseDataBrasileiraSegura(valorNovo);
      if (d) valorLimpo = d;
      else if (campo === "data_status") valorLimpo = null;
    } else if (campo.startsWith("vl_")) {
      valorLimpo = Number(valorNovo.replace(",", "."));
    }
    
    const dataUpdate: any = { [campo]: valorLimpo };
    if (campo === "status") {
      const operacaoAtual = await prisma.operacao.findUnique({
        where: { id },
        select: { status: true }
      });
      if (operacaoAtual?.status !== valorLimpo) {
        dataUpdate.data_status = new Date();
      }
    }
    
    const operacaoAtualizada = await prisma.operacao.update({ 
      where: { id }, 
      data: dataUpdate 
    });

    return operacaoAtualizada;
  }

  static async bulkUpdate(ids: number[], campo: string, valor: string) {
    if (!['status', 'comentarios', 'id_solicitacao'].includes(campo)) {
      throw new Error("Campo não permitido para atualização em lote");
    }

    if (ids.length === 0) return { success: true };

    const dataUpdate: any = { [campo]: valor };
    
    if (campo === "status") {
      dataUpdate.data_status = new Date();
      await prisma.operacao.updateMany({
        where: { id: { in: ids }, status: { not: valor } },
        data: dataUpdate
      });
    } else {
      await prisma.operacao.updateMany({
        where: { id: { in: ids } },
        data: dataUpdate
      });
    }
    
    this.invalidarCache();
    return { success: true };
  }
}
