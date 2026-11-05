import prisma from "../lib/prisma.server";

export interface PrazoPastaItem {
  id: number;
  nome: string;
  // Vazio = a pasta usa o prazo padrão.
  prazoDias: number | null;
}

export interface PrazoRegras {
  padraoDias: number;
  // Mapa id da pasta -> prazoDias. Pastas fora do mapa e a Caixa de Entrada usam o padrão.
  porPasta: Record<number, number>;
}

interface CacheShape {
  padraoDias: number;
  pastas: PrazoPastaItem[];
}

//PrazoService
//Responsabilidade: Regras de "emissão antiga" — prazo padrão global
//(Configuracao id=1) + exceções por pasta (Pasta.prazoDias).
export class PrazoService {
  private static cache: CacheShape | null = null;
  private static cacheTime = 0;
  private static readonly TTL = 1000 * 60; // 1 minuto

  static invalidarCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  // Todas as pastas, com ou sem exceção: a tela usa a mesma lista para escolher a pasta.
  static async listar(): Promise<{ padrao: number; pastas: PrazoPastaItem[] }> {
    if (!this.cache || Date.now() - this.cacheTime >= this.TTL) {
      const [config, pastas] = await Promise.all([
        prisma.configuracao.findUnique({ where: { id: 1 } }),
        prisma.pasta.findMany({
          select: { id: true, nome: true, prazoDias: true },
          orderBy: { nome: "asc" },
        }),
      ]);
      this.cache = {
        padraoDias: config?.prazoPadraoDias ?? 10,
        pastas,
      };
      this.cacheTime = Date.now();
    }
    return { padrao: this.cache.padraoDias, pastas: this.cache.pastas };
  }

  // Regras prontas para consulta em cada linha de operação.
  static async regras(): Promise<PrazoRegras> {
    const { padrao, pastas } = await this.listar();
    const porPasta: Record<number, number> = {};
    for (const p of pastas) {
      if (p.prazoDias !== null) porPasta[p.id] = p.prazoDias;
    }
    return { padraoDias: padrao, porPasta };
  }

  static async atualizarPadrao(prazoDias: number) {
    this.invalidarCache();
    await prisma.configuracao.upsert({
      where: { id: 1 },
      update: { prazoPadraoDias: prazoDias },
      create: { id: 1, prazoPadraoDias: prazoDias },
    });
  }

  // `null` remove a exceção e a pasta volta a usar o prazo padrão.
  static async definirPrazoPasta(id: number, prazoDias: number | null) {
    await prisma.pasta.update({ where: { id }, data: { prazoDias } });
    this.invalidarCache();
  }
}
