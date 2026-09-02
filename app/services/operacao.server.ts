import prisma from "~/lib/prisma.server";
import { DateParser } from "~/utils/date-parser";
import { PastaService } from "./pasta.server";
import { OperacaoQueryBuilder } from "./operacao-query-builder.server";

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
  private static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutos
  private static readonly SHORT_TTL = 1000 * 30;    // 30 segundos
  private static readonly COUNT_CACHE_TTL = 1000 * 30; // 30 segundos

  static invalidarCache() {
    this.agenciasCache = null;
    this.agenciasCacheTime = 0;
    this.inboxCountCache = null;
    this.inboxCountCacheTime = 0;
    this.countCache.clear();
    PastaService.invalidarCache();
  }

  // Whitelist de colunas ordenáveis (anti SQL injection) — datas e valores numéricos
  private static readonly SORTABLE_COLUMNS: Record<string, string> = {
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
    
    const whereClause = OperacaoQueryBuilder.construirWhere(pastaId, filtros);
    const cacheKey = JSON.stringify({ sql: whereClause.sql, params: whereClause.params });
    const cachedEntry = this.countCache.get(cacheKey);
    const isCountCached = cachedEntry && Date.now() - cachedEntry.timestamp < this.COUNT_CACHE_TTL;

    // Otimização: Paralelizando a busca de dados e a contagem (COUNT).
    // Antes, o código esperava os dados carregarem para só então iniciar a contagem.
    // Isso somava o tempo das duas requisições (1.5s + 1.8s = 3.3s).
    // Agora, elas rodam juntas, caindo o tempo total pela metade!
    const [data, totalRes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          o.id, o.nm_agencia, o.dt_emissao_, o.cd_pessoa_pagador, o.nm_pessoa_pagador,
          o.nr_cpf_cnpj_raiz, o.nr_cpf_cnpj_pagador, o.nr_ctrc, o.status, o.comentarios,
          o.id_tipo_documento, o.nm_pessoa_remetente, o.nm_cidade_origem, o.ds_sigla_origem,
          o.nm_pessoa_destinatario, o.nm_cidade_destino, o.ds_sigla_destino, o.nm_produto,
          o.vl_peso, o.vl_tarifa, o.vl_total, o.nr_nf, o.ds_placa, o.nm_pessoa_matriz,
          o.nr_contrato, o.nr_chave_acesso, o.nm_pessoa_usuario_lancamento, o.id_tipo_ctrc,
          o.nm_proprietario_posse_cavalo, o.nm_motorista, o.data_status, o.id_solicitacao, o.dt_quitacao_saldo
        FROM "Operacao" o
        ${whereClause.sql}
        ${orderClause}
        LIMIT ${l} OFFSET ${offset}
      `, ...whereClause.params),
      isCountCached 
        ? Promise.resolve([{ count: cachedEntry.count, totalVl: cachedEntry.totalVl }])
        : prisma.$queryRawUnsafe<any>(`SELECT COUNT(*) as count, COALESCE(SUM("vl_total"), 0) AS "totalVl" FROM "Operacao" o ${whereClause.sql}`, ...whereClause.params)
    ]);

    const sanitizedData = data.map(item => ({
      ...item,
      vl_total: item.vl_total ? Number(item.vl_total) : null,
      vl_peso: item.vl_peso ? Number(item.vl_peso) : 0,
      vl_tarifa: item.vl_tarifa ? Number(item.vl_tarifa) : 0
    }));

    let total: number;
    let totalVl: number;
    if (isCountCached) {
      total = cachedEntry.count;
      totalVl = cachedEntry.totalVl;
    } else {
      total = Number(totalRes[0].count);
      totalVl = Number(totalRes[0].totalVl) || 0;
      this.countCache.set(cacheKey, { count: total, totalVl, timestamp: Date.now() });
    }
    
    return { 
      data: sanitizedData, 
      meta: { total, totalVl, page: p, limit: l, totalPages: Math.ceil(total / l) } 
    };
  }

  static async listarIds(filtros: any, excludedIds: number[] = []) {
    const { pastaId } = filtros;
    const whereClause = OperacaoQueryBuilder.construirWhere(pastaId, filtros, excludedIds);
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
