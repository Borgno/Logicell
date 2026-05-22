import prisma from "~/lib/prisma.server";
import crypto from "crypto";
import { PastaService } from "./pasta.server";
import { ExcelParser } from "~/utils/excel-parser.server";
import { DateParser } from "~/utils/date-parser";

/**
 * OperacaoService
 * Responsabilidade: Interações puras de Banco de Dados com a tabela Operacao.
 * Transformações de dados, validações complexas e regras de negócio de parsing
 * foram extraídas para `excel-parser.server.ts`, `schemas/operacao` e `dashboard.server.ts`.
 */
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

  static async processarPlanilha(buffer: Buffer, originalName: string, usuario: string = "Sistema") {
    this.invalidarCache();
    const hash = crypto.createHash("md5").update(buffer).digest("hex");

    const importacao = await prisma.importacao.create({
      data: { nomeArquivo: originalName, usuario, qtdRegistros: 0, hashArquivo: hash }
    });

    const parsedData = ExcelParser.analisarBuffer(buffer, importacao.id);
    const spreadsheetOps = parsedData.operacoes;

    // Gerador de assinatura única
    const getSig = (op: any) => {
      const ag = String(op.nm_agencia || "").trim().toUpperCase();
      const ctrc = String(op.nr_ctrc || "").trim();
      const nf = String(op.nr_nf || "").trim();
      const vl = op.vl_total ? Number(op.vl_total).toFixed(2) : "0.00";
      return `${ag}|${ctrc}|${nf}|${vl}`;
    };

    // 1. Assinaturas da Planilha Nova
    const spreadsheetSignatures = new Set(spreadsheetOps.map(getSig));

    // 2. Buscar TODOS os itens existentes (Caixa de Entrada + todas as Pastas)
    const inboxItems = await prisma.operacao.findMany({
      select: { id: true, nm_agencia: true, nr_ctrc: true, nr_nf: true, vl_total: true, dt_emissao_: true }
    });

    // 3. Identificar o que está em qualquer lugar mas NÃO na planilha nova -> DELETAR
    const idsParaApagar = inboxItems
      .filter(item => !spreadsheetSignatures.has(getSig(item)))
      .map(item => item.id);

    if (idsParaApagar.length > 0) {
      await prisma.operacao.deleteMany({ where: { id: { in: idsParaApagar } } });
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
      importId: importacao.id 
    };
  }

  static async listarOperacoes(filtros: any) {
    // Otimização de Performance:
    // A requisição HTTP para a Edge Function foi totalmente removida.
    // Como o backend Node (React Router / Remix) já possui acesso direto ao Prisma e 
    // ao banco de dados via listarOperacoesLocal, fazer uma requisição na web para outro 
    // servidor (Edge Function) gerava um gargalo massivo de latência (Network Waterfall)
    // e sofria com 'cold starts'.
    return this.listarOperacoesLocal(filtros);
  }

  static async listarOperacoesLocal(filtros: any) {
    const { page = 1, limit = 100, search, pastaId } = filtros;
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const l = Math.max(1, Math.floor(Number(limit) || 100));
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

  static async listarIds(filtros: any) {
    const { search, pastaId } = filtros;
    const whereClause = this.construirWhere(search, pastaId, filtros);
    const ids: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "Operacao" o ${whereClause.sql}`, ...whereClause.params);
    return ids.map(i => i.id);
  }

  private static construirWhere(search: string, pastaId: any, filtros: any) {
    const whereAnd: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (search) {
      const s = `%${search}%`;
      whereAnd.push(`(
        nm_agencia ILIKE $${idx} OR
        cd_pessoa_pagador ILIKE $${idx} OR
        nm_pessoa_pagador ILIKE $${idx} OR
        nr_cpf_cnpj_raiz ILIKE $${idx} OR
        nr_cpf_cnpj_pagador ILIKE $${idx} OR
        nr_ctrc ILIKE $${idx} OR
        status ILIKE $${idx} OR
        comentarios ILIKE $${idx} OR
        id_tipo_documento ILIKE $${idx} OR
        nm_pessoa_remetente ILIKE $${idx} OR
        nm_cidade_origem ILIKE $${idx} OR
        ds_sigla_origem ILIKE $${idx} OR
        nm_pessoa_destinatario ILIKE $${idx} OR
        nm_cidade_destino ILIKE $${idx} OR
        ds_sigla_destino ILIKE $${idx} OR
        nm_produto ILIKE $${idx} OR
        nr_nf ILIKE $${idx} OR
        ds_placa ILIKE $${idx} OR
        nm_pessoa_matriz ILIKE $${idx} OR
        nr_contrato ILIKE $${idx} OR
        nr_chave_acesso ILIKE $${idx} OR
        nm_pessoa_usuario_lancamento ILIKE $${idx} OR
        id_tipo_ctrc ILIKE $${idx} OR
        nm_proprietario_posse_cavalo ILIKE $${idx} OR
        nm_motorista ILIKE $${idx} OR
        TO_CHAR(dt_emissao_, 'DD/MM/YYYY') ILIKE $${idx} OR
        vl_peso::TEXT ILIKE $${idx} OR
        vl_tarifa::TEXT ILIKE $${idx} OR
        vl_total::TEXT ILIKE $${idx}
      )`);
      params.push(s); idx++;
    }

    if (filtros.nm_agencia) { whereAnd.push(`nm_agencia = $${idx}`); params.push(filtros.nm_agencia); idx++; }
    if (filtros.nm_pessoa_pagador) { whereAnd.push(`nm_pessoa_pagador ILIKE $${idx}`); params.push(`%${filtros.nm_pessoa_pagador}%`); idx++; }
    if (filtros.nm_pessoa_remetente) { whereAnd.push(`nm_pessoa_remetente ILIKE $${idx}`); params.push(`%${filtros.nm_pessoa_remetente}%`); idx++; }
    if (filtros.nm_pessoa_destinatario) { whereAnd.push(`nm_pessoa_destinatario ILIKE $${idx}`); params.push(`%${filtros.nm_pessoa_destinatario}%`); idx++; }
    if (filtros.nm_produto) { whereAnd.push(`nm_produto ILIKE $${idx}`); params.push(`%${filtros.nm_produto}%`); idx++; }
    if (filtros.ds_placa) { whereAnd.push(`ds_placa ILIKE $${idx}`); params.push(`%${filtros.ds_placa}%`); idx++; }
    if (filtros.min_peso) { whereAnd.push(`vl_peso >= $${idx}`); params.push(Number(filtros.min_peso)); idx++; }
    if (filtros.max_peso) { whereAnd.push(`vl_peso <= $${idx}`); params.push(Number(filtros.max_peso)); idx++; }
    if (filtros.min_total) { whereAnd.push(`vl_total >= $${idx}`); params.push(Number(filtros.min_total)); idx++; }
    if (filtros.max_total) { whereAnd.push(`vl_total <= $${idx}`); params.push(Number(filtros.max_total)); idx++; }
    if (filtros.status) { whereAnd.push(`status = $${idx}`); params.push(filtros.status); idx++; }

    if (pastaId && pastaId !== "null") { whereAnd.push(`"pastaId" = $${idx}`); params.push(Number(pastaId)); idx++; }
    else { whereAnd.push(`"pastaId" IS NULL`); }

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
    const ags = await prisma.operacao.groupBy({ by: ["nm_agencia"], where: { nm_agencia: { not: "" } }, orderBy: { nm_agencia: "asc" } });
    this.agenciasCache = ags.map(a => a.nm_agencia);
    this.agenciasCacheTime = Date.now();
    return this.agenciasCache;
  }

  static async bulkActionPasta(ids: number[], pastaId: number | null, filtros?: any, usuario: string = "Sistema") {
    const finalPastaId = (pastaId === null || isNaN(pastaId)) ? null : pastaId;
    let affectedIds = ids;

    if (ids.length === 0 && filtros) {
      affectedIds = await this.listarIds(filtros);
    }

    if (affectedIds.length > 0) {
      // 1. Buscar detalhes completos para a auditoria (Chave de Negócio)
      const items = await prisma.operacao.findMany({
        where: { id: { in: affectedIds } },
        select: { 
          id: true, nr_ctrc: true, nm_agencia: true, nr_nf: true, 
          vl_total: true, dt_emissao_: true, pastaId: true 
        }
      });

      // 2. Identificar pastas (De -> Para)
      const finalPastaNome = finalPastaId ? (await PastaService.buscarPorId(finalPastaId))?.nome || String(finalPastaId) : "Caixa de Entrada";
      const sourcePastaId = items[0]?.pastaId;
      const sourcePastaNome = sourcePastaId ? (await PastaService.buscarPorId(sourcePastaId))?.nome || String(sourcePastaId) : "Caixa de Entrada";

      // 3. Executar a ação
      await prisma.operacao.updateMany({
        where: { id: { in: affectedIds } },
        data: { pastaId: finalPastaId }
      });

      // 4. Gravar Auditoria
      const moveDetails = {
        origem: sourcePastaNome,
        destino: finalPastaNome,
        itens: items.map(i => ({ 
          id: i.id, 
          ctrc: i.nr_ctrc, 
          agencia: i.nm_agencia, 
          nf: i.nr_nf, 
          total: i.vl_total, 
          emissao: i.dt_emissao_ 
        }))
      };

      if (affectedIds.length === 1) {
        const item = items[0];
        prisma.auditoria.create({
          data: {
            operacaoId: item.id,
            tipo: "MOVE",
            entidade: "OPERACAO",
            campo: "pastaId",
            valorAntigo: sourcePastaNome,
            valorNovo: finalPastaNome,
            detalhes: JSON.stringify(moveDetails),
            usuario
          } as any
        }).catch(e => console.error("Erro auditoria move:", e));
      } else {
        prisma.auditoria.create({
          data: {
            tipo: "BULK_MOVE",
            entidade: "OPERACAO",
            valorNovo: finalPastaNome,
            detalhes: JSON.stringify(moveDetails),
            usuario
          } as any
        }).catch(e => console.error("Erro auditoria bulk move:", e));
      }
    }

    this.invalidarCache();
    await PastaService.invalidarCache();
    return { success: true };
  }

  static async bulkDelete(ids: number[], filters?: any, usuario: string = "Sistema") {
    let affectedIds = ids;
    if (ids.length === 0 && filters) {
      affectedIds = await this.listarIds(filters);
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

      // 3. Audita com o Snapshot total do item
      const deleteDetails = items.map(i => ({ 
        id: i.id, 
        ctrc: i.nr_ctrc, 
        agencia: i.nm_agencia, 
        nf: i.nr_nf, 
        total: i.vl_total, 
        emissao: i.dt_emissao_ 
      }));

      if (items.length === 1) {
        prisma.auditoria.create({
          data: {
            tipo: "DELETE",
            entidade: "OPERACAO",
            detalhes: JSON.stringify(deleteDetails),
            usuario
          } as any
        }).catch(e => console.error("Erro auditoria delete:", e));
      } else {
        prisma.auditoria.create({
          data: {
            tipo: "BULK_DELETE",
            entidade: "OPERACAO",
            detalhes: JSON.stringify(deleteDetails),
            usuario
          } as any
        }).catch(e => console.error("Erro auditoria bulk delete:", e));
      }
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

    // 4. Grava o rastro na Auditoria fora da transação para performance e estabilidade
    if (res.valorAntigo !== res.valorLimpo) {
      const { operacaoAtualizada: o } = res;
      prisma.auditoria.create({
        data: {
          operacaoId: id,
          tipo: "UPDATE",
          entidade: "OPERACAO",
          campo,
          valorAntigo: res.valorAntigo,
          valorNovo: res.valorLimpo,
          detalhes: JSON.stringify({
            agencia: o.nm_agencia,
            ctrc: o.nr_ctrc,
            nf: o.nr_nf,
            total: o.vl_total,
            emissao: o.dt_emissao_
          }),
          usuario
        } as any
      }).catch(e => console.error("Falha ao gravar auditoria:", e));
    }

    return res.operacaoAtualizada;
  }
}
