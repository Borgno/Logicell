import crypto from "crypto";
import prisma from "~/lib/prisma.server";
import { DateParser } from "~/utils/date-parser";
import { AutomacaoService } from "./automacao.server";
import { ExcelParser } from "./excel-parser.server";
import { PastaService } from "./pasta.server";

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

  private static invalidarCache() {
    this.agenciasCache = null;
    this.agenciasCacheTime = 0;
    this.inboxCountCache = null;
    this.inboxCountCacheTime = 0;
    this.countCache.clear();
    PastaService.invalidarCache();
  }

  static async processarPlanilha(buffer: Buffer, originalName: string, usuario: string = "Sistema", modo: string = "SUBSTITUIR") {
    this.invalidarCache();
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

        // Tenta rotear por cliente primeiro
        if (op.nm_pessoa_pagador) {
          const clienteClean = String(op.nm_pessoa_pagador).trim().toUpperCase();
          if (mapas.mapaCliente.has(clienteClean)) {
            matchedPastaId = mapas.mapaCliente.get(clienteClean);
          }
        }

        // Se não roteou por cliente, tenta por agência
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
    // -----------------------------

    // 1. Assinaturas da Planilha Nova (hashes gerados no parser)
    const spreadsheetSignatures = new Set(spreadsheetOps.map((op: any) => op.hash_assinatura));

    // 2. Buscar APENAS o id e o hash_assinatura (Ultra rápido, baixa pouquíssimos dados)
    const inboxItems = await prisma.operacao.findMany({
      select: { id: true, hash_assinatura: true }
    });

    // 3. Tratamento de Exclusão baseado no Modo
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

    // 4. Inserir novos itens (skipDuplicates garante que itens já em pastas não sejam duplicados)
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


  static async listarOperacoesLocal(filtros: any) {
    const { page = 1, limit = 200, search, pastaId } = filtros;
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const l = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 200)));
    const offset = (p - 1) * l;
    
    const whereClause = this.construirWhere(search, pastaId, filtros);
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
    const whereClause = this.construirWhere(search, pastaId, filtros, excludedIds);
    const ids: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "Operacao" o ${whereClause.sql}`, ...whereClause.params);
    return ids.map(i => i.id);
  }

  private static processarFiltrosDinamicos(filtros: any, whereAnd: string[], params: any[]) {
    const colunasValidas = [
      "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz", 
      "nr_cpf_cnpj_pagador", "nr_ctrc", "status", "comentarios", "id_tipo_documento",
      "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem", "nm_pessoa_destinatario",
      "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "nr_nf", "ds_placa",
      "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
      "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "dt_emissao_",
      "vl_peso", "vl_tarifa", "vl_total"
    ];

    for (const [key, val] of Object.entries(filtros)) {
      if (key.startsWith("colFilter_") && typeof val === 'string') {
        const colName = key.replace("colFilter_", "");
        if (colunasValidas.includes(colName)) {
          const separatorIdx = val.indexOf(":");
          if (separatorIdx > -1) {
              const type = val.substring(0, separatorIdx);
              const value = val.substring(separatorIdx + 1);
              const isNumeric = colName.startsWith("vl_");
              
              if (type === "blank") {
                whereAnd.push(`("${colName}" IS NULL OR "${colName}"::TEXT = '')`);
              } else if (type === "notBlank") {
                whereAnd.push(`("${colName}" IS NOT NULL AND "${colName}"::TEXT <> '')`);
              } else if (type === "equals" && value !== "") {
                params.push(value);
                if (colName === "dt_emissao_") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                } else if (isNumeric) {
                    whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                } else {
                    whereAnd.push(`"${colName}" ILIKE $${params.length}`);
                }
              } else if (type === "contains" && value !== "") {
                params.push(`%${value}%`);
                if (colName === "dt_emissao_") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                } else {
                    whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                }
              }
          }
        }
      }
    }
  }

  private static construirWhere(search: string, pastaId: any, filtros: any, excludedIds: number[] = []) {
    const whereAnd: string[] = [];
    const params: any[] = [];

    this.processarFiltrosDinamicos(filtros, whereAnd, params);

    const addFilter = (condition: string, value: any) => {
      params.push(value);
      whereAnd.push(`${condition} $${params.length}`);
    };

    if (filtros.nm_agencia) addFilter(`nm_agencia =`, filtros.nm_agencia);
    if (filtros.nm_pessoa_pagador) addFilter(`nm_pessoa_pagador ILIKE`, `%${filtros.nm_pessoa_pagador}%`);
    if (filtros.nm_pessoa_remetente) addFilter(`nm_pessoa_remetente ILIKE`, `%${filtros.nm_pessoa_remetente}%`);
    if (filtros.nm_pessoa_destinatario) addFilter(`nm_pessoa_destinatario ILIKE`, `%${filtros.nm_pessoa_destinatario}%`);
    if (filtros.nm_produto) addFilter(`nm_produto ILIKE`, `%${filtros.nm_produto}%`);
    if (filtros.ds_placa) addFilter(`ds_placa ILIKE`, `%${filtros.ds_placa}%`);
    if (filtros.min_peso) addFilter(`vl_peso >=`, Number(filtros.min_peso));
    if (filtros.max_peso) addFilter(`vl_peso <=`, Number(filtros.max_peso));
    if (filtros.min_total) addFilter(`vl_total >=`, Number(filtros.min_total));
    if (filtros.max_total) addFilter(`vl_total <=`, Number(filtros.max_total));
    if (filtros.status) addFilter(`status =`, filtros.status);

    if (pastaId && pastaId !== "null") { 
      addFilter(`"pastaId" =`, Number(pastaId)); 
    } else { 
      whereAnd.push(`"pastaId" IS NULL`); 
    }

    if (excludedIds && excludedIds.length > 0) {
      const placeholders = excludedIds.map((id) => {
        params.push(id);
        return `$${params.length}`;
      });
      whereAnd.push(`id NOT IN (${placeholders.join(", ")})`);
    }

    return { sql: whereAnd.length > 0 ? `WHERE ${whereAnd.join(" AND ")}` : "", params };
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

    // Paraleliza: busca os itens e os nomes das pastas ao mesmo tempo
    const sourcePastaId = affectedIds.length > 0 ? (
      await prisma.operacao.findFirst({ where: { id: affectedIds[0] }, select: { pastaId: true } })
    )?.pastaId : null;

    const [items, finalPasta, sourcePasta] = await Promise.all([
      prisma.operacao.findMany({
        where: { id: { in: affectedIds } },
        select: { id: true, nr_ctrc: true, nm_agencia: true, nr_nf: true, vl_total: true, dt_emissao_: true }
      }),
      finalPastaId ? PastaService.buscarPorId(finalPastaId) : Promise.resolve(null),
      sourcePastaId ? PastaService.buscarPorId(sourcePastaId) : Promise.resolve(null)
    ]);

    const finalPastaNome = finalPasta?.nome ?? "Caixa de Entrada";
    const sourcePastaNome = sourcePasta?.nome ?? "Caixa de Entrada";

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
      // 1. Pega os dados completos antes de apagar (Chave de Negócio)
      const items = await prisma.operacao.findMany({
        where: { id: { in: affectedIds } },
        select: { 
          id: true, nr_ctrc: true, nm_agencia: true, nr_nf: true, 
          vl_total: true, dt_emissao_: true 
        }
      });

      // 2. Apaga
      await prisma.operacao.deleteMany({ where: { id: { in: affectedIds } } });
    }

    this.invalidarCache();
    await PastaService.invalidarCache();
    return { success: true };
  }

  static async update(id: number, campo: string, valorNovo: string, usuario: string) {
    this.invalidarCache();

    const res = await prisma.$transaction(async (tx) => {
      // 1. Pega o estado anterior
      const atual = await tx.operacao.findUnique({ where: { id } }) as any;
      if (!atual) throw new Error("Operação não encontrada");
      
      const valorAntigo = atual[campo] !== null && atual[campo] !== undefined ? String(atual[campo]) : "";
      
      // 2. Prepara o valor pro DB com base no campo
      let valorLimpo: any = valorNovo;
      if (campo === "dt_emissao_") {
        const d = DateParser.parseDataBrasileiraSegura(valorNovo);
        if (d) valorLimpo = d;
      } else if (campo.startsWith("vl_")) {
        valorLimpo = Number(valorNovo.replace(",", "."));
      }
      
      // 3. Efetiva o update
      const operacaoAtualizada = await tx.operacao.update({ 
        where: { id }, 
        data: { [campo]: valorLimpo } 
      });

      return { operacaoAtualizada, valorAntigo, valorLimpo: String(valorLimpo) };
    });



    return res.operacaoAtualizada;
  }
}
