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

    // OTIMIZAÇÃO: Busca contagens, faturamento, volumes e breakdowns por pasta/status em uma única query
    // e evita buscar log de importações desnecessariamente para sub-pastas.
    const [allCounts, porAgencia, porProduto, topOrigens, topDestinos, todasPastas, ultimasImportacoes] = await Promise.all([
      prisma.operacao.groupBy({
        by: ['status', 'pastaId'],
        _count: { id: true },
        _sum: { vl_total: true, vl_peso: true },
        where
      }),
      prisma.operacao.groupBy({ 
        by: ["nm_agencia"], 
        _sum: { vl_total: true }, 
        orderBy: { _sum: { vl_total: "desc" } }, 
        take: 15,
        where
      }),
      prisma.operacao.groupBy({ 
        by: ["nm_produto"], 
        _count: { id: true }, 
        orderBy: { _count: { id: "desc" } }, 
        take: 15,
        where
      }),
      prisma.operacao.groupBy({ 
        by: ["nm_cidade_origem"], 
        _count: { id: true }, 
        orderBy: { _count: { id: "desc" } }, 
        take: 10,
        where
      }),
      prisma.operacao.groupBy({ 
        by: ["nm_cidade_destino"], 
        _count: { id: true }, 
        orderBy: { _count: { id: "desc" } }, 
        take: 10,
        where
      }),
      prisma.pasta.findMany({ select: { id: true, nome: true } }),
      pastaId === undefined 
        ? prisma.importacao.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
        : Promise.resolve([])
    ]);

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
