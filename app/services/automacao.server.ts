import prisma from "~/lib/prisma.server";
import { VerificadorConflitosService } from "./verificador-conflitos.server";

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

    const dataComConflitos = VerificadorConflitosService.marcarConflitos(data);

    this.cache = dataComConflitos;
    this.cacheTime = Date.now();
    return dataComConflitos;
  }

  static async adicionarRegra(pastaId: number, tipo: 'agencia' | 'cliente' | 'produto', valor: string) {
    this.invalidarCache();
    
    if (tipo === 'agencia') {
      const existeNestaPasta = await prisma.regraAutomacao.findFirst({
        where: { agencia: { equals: valor, mode: 'insensitive' }, pastaId }
      });
      if (existeNestaPasta) return { regra: existeNestaPasta };

      const regra = await prisma.regraAutomacao.create({ data: { pastaId, agencia: valor } });
      return { regra };
    } else if (tipo === 'cliente') {
      const existeNestaPasta = await prisma.regraAutomacao.findFirst({
        where: { cliente: { equals: valor, mode: 'insensitive' }, pastaId }
      });
      if (existeNestaPasta) return { regra: existeNestaPasta };

      const regra = await prisma.regraAutomacao.create({ data: { pastaId, cliente: valor } });
      return { regra };
    } else if (tipo === 'produto') {
      const existeNestaPasta = await prisma.regraAutomacao.findFirst({
        where: { produto: { equals: valor, mode: 'insensitive' }, pastaId }
      });
      if (existeNestaPasta) return { regra: existeNestaPasta };

      const regra = await prisma.regraAutomacao.create({ data: { pastaId, produto: valor } });
      return { regra };
    }
    
    throw new Error('Tipo de regra inválido');
  }


  static async removerRegra(id: number) {
    this.invalidarCache();
    return prisma.regraAutomacao.delete({
      where: { id }
    });
  }

  // Retorna mapas para o motor de importação
  static async obterMapasRoteamento(): Promise<{ 
    mapaAgencia: Map<string, number[]>, 
    mapaCliente: Map<string, number[]>,
    mapaProdutosPorPasta: Map<number, Set<string>>
  }> {
    const regras = await prisma.regraAutomacao.findMany();
    const mapaAgencia = new Map<string, number[]>();
    const mapaCliente = new Map<string, number[]>();
    const mapaProdutosPorPasta = new Map<number, Set<string>>();
    
    for (const r of regras) {
      if (r.agencia) {
        const k = r.agencia.toUpperCase();
        if (!mapaAgencia.has(k)) mapaAgencia.set(k, []);
        mapaAgencia.get(k)!.push(r.pastaId);
      }
      if (r.cliente) {
        const k = r.cliente.toUpperCase();
        if (!mapaCliente.has(k)) mapaCliente.set(k, []);
        mapaCliente.get(k)!.push(r.pastaId);
      }
      if (r.produto) {
        if (!mapaProdutosPorPasta.has(r.pastaId)) mapaProdutosPorPasta.set(r.pastaId, new Set<string>());
        mapaProdutosPorPasta.get(r.pastaId)!.add(r.produto.toUpperCase());
      }
    }
    return { mapaAgencia, mapaCliente, mapaProdutosPorPasta };
  }
}
