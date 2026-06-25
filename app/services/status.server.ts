import prisma from "~/lib/prisma.server";

export class StatusService {
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
    const data = await prisma.statusOperacao.findMany({
      orderBy: { nome: "asc" }
    });
    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  static async criar(nome: string, cor?: string, usuario: string = "Sistema") {
    this.invalidarCache();
    const nomeNormalizado = nome.trim().toUpperCase();

    const existe = await prisma.statusOperacao.findFirst({
      where: { nome: { equals: nomeNormalizado, mode: "insensitive" } }
    });

    if (existe) {
      return existe; // If already exists, just return it
    }

    const novo = await prisma.statusOperacao.create({
      data: { nome: nomeNormalizado, cor }
    });

    return novo;
  }

  static async excluir(id: number) {
    this.invalidarCache();
    return prisma.statusOperacao.delete({
      where: { id }
    });
  }
}
