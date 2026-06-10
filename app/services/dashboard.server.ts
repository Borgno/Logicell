import prisma from "~/lib/prisma.server";

export class DashboardService {
  private static cache = new Map<string, { data: any, time: number }>();
  private static readonly TTL = 1000 * 30; // 30 segundos

  /**
   * Agrega todos os dados necessários para o render principal do Dashboard
   * Focado inteiramente em Analytics, livre das regras de negócio de CRUD.
   */
  static async getDashboardMetrics(pastaId?: number | null) {
    const cacheKey = String(pastaId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < this.TTL) {
      return cached.data;
    }

    const where: any = {};
    if (pastaId !== undefined) {
      where.pastaId = pastaId;
    }

    // OTIMIZAÇÃO: Resolvido o EMAXCONNSESSION fazendo as buscas de forma sequencial,
    // para não esgotar o pool de conexões (pool_size 15) do banco com requisições simultâneas.
    const allCounts = await prisma.operacao.groupBy({
      by: ['status', 'pastaId'],
      _count: { id: true },
      _sum: { vl_total: true, vl_peso: true },
      where
    });

    const porAgencia = await prisma.operacao.groupBy({ 
      by: ["nm_agencia"], 
      _sum: { vl_total: true }, 
      orderBy: { _sum: { vl_total: "desc" } }, 
      take: 15,
      where
    });

    const porProduto = await prisma.operacao.groupBy({ 
      by: ["nm_produto"], 
      _count: { id: true }, 
      orderBy: { _count: { id: "desc" } }, 
      take: 15,
      where
    });

    const topOrigens = await prisma.operacao.groupBy({ 
      by: ["nm_cidade_origem"], 
      _count: { id: true }, 
      orderBy: { _count: { id: "desc" } }, 
      take: 10,
      where
    });

    const topDestinos = await prisma.operacao.groupBy({ 
      by: ["nm_cidade_destino"], 
      _count: { id: true }, 
      orderBy: { _count: { id: "desc" } }, 
      take: 10,
      where
    });

    const todasPastas = await prisma.pasta.findMany({ select: { id: true, nome: true } });

    const ultimasImportacoes = pastaId === undefined 
      ? await prisma.importacao.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
      : [];

    let totalVal = 0;
    let totalPeso = 0;
    let totalCount = 0;
    const statusMap: Record<string, number> = {};
    const detailedBreakdowns: Record<string, { id: number | null, label: string, count: number }[]> = {};

    allCounts.forEach(item => {
      const val = Number(item._sum.vl_total || 0);
      const peso = Number(item._sum.vl_peso || 0);
      const count = item._count.id;

      totalVal += val;
      totalPeso += peso;
      totalCount += count;

      if (item.status) {
        statusMap[item.status] = (statusMap[item.status] || 0) + count;
        
        if (!detailedBreakdowns[item.status]) {
          detailedBreakdowns[item.status] = [];
        }
        
        if (item.pastaId === null) {
          detailedBreakdowns[item.status].push({ id: null, label: "Caixa de Entrada", count });
        } else {
          const pasta = todasPastas.find(p => p.id === item.pastaId);
          if (pasta) {
            detailedBreakdowns[item.status].push({ id: pasta.id, label: pasta.nome, count });
          }
        }
      }
    });

    const result = { 
      totais: {
        _sum: {
          vl_total: totalVal,
          vl_peso: totalPeso
        },
        _count: { id: totalCount },
        statusMap
      },
      detailedBreakdowns,
      porAgencia: porAgencia.map(a => ({
        nm_agencia: a.nm_agencia,
        _sum: { vl_total: Number(a._sum.vl_total || 0) }
      })),
      porProduto,
      topOrigens,
      topDestinos,
      ultimasImportacoes 
    };

    this.cache.set(cacheKey, { data: result, time: Date.now() });
    return result;
  }
}
