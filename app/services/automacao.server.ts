import prisma from "~/lib/prisma.server";

export class AutomacaoService {
  private static cache: any[] | null = null;
  private static cacheTime = 0;
  private static readonly TTL = 1000 * 60; // 1 minuto

  static invalidarCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  static async listarRegrasPorPasta() {
    if (this.cache && (Date.now() - this.cacheTime < this.TTL)) {
      return this.cache;
    }
    const data = await prisma.pasta.findMany({
      orderBy: { nome: "asc" },
      include: {
        regras: true,
      }
    });
    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  static async adicionarRegra(pastaId: number, agencia: string) {
    this.invalidarCache();
    
    const existe = await prisma.regraAutomacao.findFirst({
      where: {
        agencia: {
          equals: agencia,
          mode: 'insensitive' // case insensitive for unique constraint
        }
      }
    });

    if (existe) {
      if (existe.pastaId === pastaId) return existe; // Já está nesta pasta, ignora
      throw new Error(`Esta agência já está associada a outra pasta (ID: ${existe.pastaId}). Remova-a de lá primeiro.`);
    }

    return prisma.regraAutomacao.create({
      data: {
        pastaId,
        agencia,
      }
    });
  }

  static async removerRegra(id: number) {
    this.invalidarCache();
    return prisma.regraAutomacao.delete({
      where: { id }
    });
  }

  // Pega um mapa simples Agencia -> PastaId para o motor de importação ser O(1)
  static async obterMapaRoteamento(): Promise<Map<string, number>> {
    const regras = await prisma.regraAutomacao.findMany();
    const mapa = new Map<string, number>();
    for (const r of regras) {
      mapa.set(r.agencia.toUpperCase(), r.pastaId);
    }
    return mapa;
  }
}
