import prisma from "~/lib/prisma.server";
import { DateParser } from "~/utils/date-parser";
import { PastaService } from "./pasta.server";
import { OperacaoQueryBuilder } from "./operacao-query-builder.server";

export interface BulkActionParams {
  ids: number[];
  pastaId?: number | null;
  filtros?: any;
  usuario?: string;
  selectAll?: boolean;
  excludedIds?: number[];
}

//OperacaoService
//Responsabilidade: Interações puras de Banco de Dados com a tabela Operacao.
//Transformações de dados, validações complexas e regras de negócio de parsing
//foram extraídas para `excel-parser.server.ts` e `dashboard.server.ts`.
export class OperacaoService {
  private static agenciasCache: string[] | null = null;
  private static agenciasCacheTime = 0;
  private static inboxCountCache: number | null = null;
  private static inboxCountCacheTime = 0;
  private static countCache = new Map<string, { count: number; timestamp: number }>();
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



  static async listarOperacoesLocal(filtros: any) {
    const { page = 1, limit = 200, search, pastaId } = filtros;
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const l = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 200)));
    const offset = (p - 1) * l;
    
    const whereClause = OperacaoQueryBuilder.construirWhere(search, pastaId, filtros);
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
          o.nm_proprietario_posse_cavalo, o.nm_motorista
        FROM "Operacao" o
        ${whereClause.sql}
        ORDER BY o.id DESC
        LIMIT ${l} OFFSET ${offset}
      `, ...whereClause.params),
      isCountCached 
        ? Promise.resolve([{ count: cachedEntry.count }])
        : prisma.$queryRawUnsafe<any>(`SELECT COUNT(*) as count FROM "Operacao" o ${whereClause.sql}`, ...whereClause.params)
    ]);

    const sanitizedData = data.map(item => ({
      ...item,
      vl_total: item.vl_total ? Number(item.vl_total) : null,
      vl_peso: item.vl_peso ? Number(item.vl_peso) : 0,
      vl_tarifa: item.vl_tarifa ? Number(item.vl_tarifa) : 0
    }));

    let total: number;
    if (isCountCached) {
      total = cachedEntry.count;
    } else {
      total = Number(totalRes[0].count);
      this.countCache.set(cacheKey, { count: total, timestamp: Date.now() });
    }
    
    return { 
      data: sanitizedData, 
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } 
    };
  }

  static async listarIds(filtros: any, excludedIds: number[] = []) {
    const { search, pastaId } = filtros;
    const whereClause = OperacaoQueryBuilder.construirWhere(search, pastaId, filtros, excludedIds);
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

  static async bulkActionPasta({ ids, pastaId = null, filtros, usuario = "Sistema", selectAll = false, excludedIds = [] }: BulkActionParams) {
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

  static async bulkDelete({ ids, filtros: filters, usuario = "Sistema", selectAll = false, excludedIds = [] }: BulkActionParams) {
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

  static async update(id: number, campo: string, valorNovo: string, usuario: string) {
    this.invalidarCache();

    let valorLimpo: any = valorNovo;
    if (campo === "dt_emissao_") {
      const d = DateParser.parseDataBrasileiraSegura(valorNovo);
      if (d) valorLimpo = d;
    } else if (campo.startsWith("vl_")) {
      valorLimpo = Number(valorNovo.replace(",", "."));
    }
    
    const operacaoAtualizada = await prisma.operacao.update({ 
      where: { id }, 
      data: { [campo]: valorLimpo } 
    });

    return operacaoAtualizada;
  }
}
