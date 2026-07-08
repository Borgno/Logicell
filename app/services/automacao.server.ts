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

  static async adicionarRegra(pastaId: number, tipo: 'agencia' | 'cliente', valor: string) {
    this.invalidarCache();
    
    if (tipo === 'agencia') {
      const existe = await prisma.regraAutomacao.findFirst({
        where: {
          agencia: {
            equals: valor,
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
          agencia: valor,
        }
      });
    } else {
      const existe = await prisma.regraAutomacao.findFirst({
        where: {
          cliente: {
            equals: valor,
            mode: 'insensitive'
          }
        }
      });

      if (existe) {
        if (existe.pastaId === pastaId) return existe;
        throw new Error(`Este cliente já está associado a outra pasta (ID: ${existe.pastaId}). Remova-o de lá primeiro.`);
      }

      return prisma.regraAutomacao.create({
        data: {
          pastaId,
          cliente: valor,
        }
      });
    }
  }

  static async removerRegra(id: number) {
    this.invalidarCache();
    return prisma.regraAutomacao.delete({
      where: { id }
    });
  }

  // Retorna dois mapas para o motor de importação ser O(1)
  static async obterMapasRoteamento(): Promise<{ mapaAgencia: Map<string, number>, mapaCliente: Map<string, number> }> {
    const regras = await prisma.regraAutomacao.findMany();
    const mapaAgencia = new Map<string, number>();
    const mapaCliente = new Map<string, number>();
    
    for (const r of regras) {
      if (r.agencia) {
        mapaAgencia.set(r.agencia.toUpperCase(), r.pastaId);
      }
      if (r.cliente) {
        mapaCliente.set(r.cliente.toUpperCase(), r.pastaId);
      }
    }
    return { mapaAgencia, mapaCliente };
  }
}
