import prisma from "~/lib/prisma.server";

export class PastaService {
  private static cache: any[] | null = null;
  private static cacheTime = 0;
  private static readonly TTL = 1000 * 60; // 1 minuto

  static invalidarCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  static async listar() {
    if (this.cache && (Date.now() - this.cacheTime < this.TTL)) {
      return this.cache;
    }
    const data = await prisma.pasta.findMany({
      orderBy: { nome: "asc" },
      include: {
        _count: {
          select: { operacoes: true }
        }
      }
    });
    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  static async buscarPorId(id: number) {
    return prisma.pasta.findUnique({
      where: { id }
    });
  }

  static async criar(nome: string, usuario: string = "Sistema") {
    this.invalidarCache();
    
    // Validar se já existe
    const existe = await prisma.pasta.findUnique({ where: { nome } });
    if (existe) {
      throw new Error("Já existe uma pasta com este nome.");
    }

    const pasta = await prisma.pasta.create({
      data: { nome }
    });

    prisma.auditoria.create({
      data: {
        tipo: "CREATE",
        entidade: "PASTA",
        detalhes: JSON.stringify({ mensagem: `Criou a pasta: ${nome}` }),
        usuario
      } as any
    }).catch(e => console.error("Erro auditoria pasta create:", e));

    return pasta;
  }

  static async atualizar(id: number, nome: string, usuario: string = "Sistema") {
    this.invalidarCache();
    
    // Validar se o novo nome já existe para outra pasta
    const existe = await prisma.pasta.findFirst({
      where: {
        nome,
        id: { not: id }
      }
    });
    if (existe) {
      throw new Error("Já existe uma pasta com este nome.");
    }

    const antiga = await this.buscarPorId(id);
    const pasta = await prisma.pasta.update({
      where: { id },
      data: { nome }
    });

    prisma.auditoria.create({
      data: {
        tipo: "UPDATE",
        entidade: "PASTA",
        detalhes: JSON.stringify({ 
          mensagem: `Renomeou pasta de "${antiga?.nome}" para "${nome}"`,
          antigo: antiga?.nome,
          novo: nome 
        }),
        usuario
      } as any
    }).catch(e => console.error("Erro auditoria pasta update:", e));

    return pasta;
  }

  static async excluir(id: number, usuario: string = "Sistema") {
    this.invalidarCache();
    const pasta = await this.buscarPorId(id);
    
    // Transação para garantir que itens e pasta sejam excluídos juntos
    const res = await prisma.$transaction(async (tx) => {
      // 1. Excluir todas as operações que pertencem a esta pasta
      await tx.operacao.deleteMany({
        where: { pastaId: id }
      });

      // 2. Excluir a pasta em si
      return tx.pasta.delete({
        where: { id }
      });
    });

    prisma.auditoria.create({
      data: {
        tipo: "DELETE",
        entidade: "PASTA",
        detalhes: JSON.stringify({ mensagem: `Excluiu a pasta: ${pasta?.nome}`, nome: pasta?.nome }),
        usuario
      } as any
    }).catch(e => console.error("Erro auditoria pasta delete:", e));

    return res;
  }
}
