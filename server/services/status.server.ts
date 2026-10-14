import prisma from "../lib/prisma.server";
import { OperacaoService } from "./operacao.server";

export interface StatusItem {
  id: number;
  nome: string;
  ordem: number;
  ativo: boolean;
}

function erro400(mensagem: string) {
  const err: any = new Error(mensagem);
  err.status = 400;
  return err;
}

//StatusService
//Responsabilidade: lista fechada de opções do campo status da Operacao.
//Operacao.status segue texto sem FK: a trava é feita aqui, no servidor.
export class StatusService {
  private static cache: StatusItem[] | null = null;
  private static cacheTime = 0;
  private static readonly TTL = 1000 * 60; // 1 minuto

  static invalidarCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  //Toda escrita aqui muda o que a grid mostra (nomes, renomeações).
  private static invalidarTudo() {
    this.invalidarCache();
    OperacaoService.invalidarCache();
  }

  static async listar(): Promise<StatusItem[]> {
    if (!this.cache || Date.now() - this.cacheTime >= this.TTL) {
      this.cache = await prisma.statusOperacao.findMany({
        select: { id: true, nome: true, ordem: true, ativo: true },
        orderBy: [{ ordem: "asc" }, { id: "asc" }],
      });
      this.cacheTime = Date.now();
    }
    return this.cache;
  }

  static async ativos(): Promise<string[]> {
    return (await this.listar()).filter((s) => s.ativo).map((s) => s.nome);
  }

  static normalizar(valor: string): string {
    return valor.trim().toUpperCase();
  }

  //Nome cadastrado (ativo) equivalente ao valor, ignorando caixa e espaços; null se não existir.
  static async canonico(valor: string): Promise<string | null> {
    const chave = this.normalizar(valor);
    const item = (await this.listar()).find((s) => s.ativo && this.normalizar(s.nome) === chave);
    return item?.nome ?? null;
  }

  //Mapa chave normalizada -> nome cadastrado, inclusive inativos (importação).
  static async mapaCanonico(): Promise<Map<string, string>> {
    return new Map((await this.listar()).map((s) => [this.normalizar(s.nome), s.nome]));
  }

  private static async garantirNomeLivre(nome: string, ignorarId?: number) {
    const existe = await prisma.statusOperacao.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" }, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    });
    if (existe) throw erro400("Já existe um status com este nome.");
  }

  static async criar(nomeBruto: string) {
    const nome = nomeBruto.trim();
    if (!nome) throw erro400("Informe o nome do status.");
    await this.garantirNomeLivre(nome);

    const ultimo = await prisma.statusOperacao.aggregate({ _max: { ordem: true } });
    const criado = await prisma.statusOperacao.create({
      data: { nome, ordem: (ultimo._max.ordem ?? 0) + 1 },
    });
    this.invalidarTudo();
    return criado;
  }

  //Renomear leva junto as operações que estavam com o nome antigo.
  static async renomear(id: number, nomeBruto: string) {
    const nome = nomeBruto.trim();
    if (!nome) throw erro400("Informe o nome do status.");
    const atual = await prisma.statusOperacao.findUnique({ where: { id } });
    if (!atual) throw erro400("Status não encontrado.");
    if (atual.nome === nome) return;
    await this.garantirNomeLivre(nome, id);

    await prisma.$transaction([
      prisma.statusOperacao.update({ where: { id }, data: { nome } }),
      prisma.operacao.updateMany({ where: { status: atual.nome }, data: { status: nome } }),
    ]);
    this.invalidarTudo();
  }

  static async definirAtivo(id: number, ativo: boolean) {
    await prisma.statusOperacao.update({ where: { id }, data: { ativo } });
    this.invalidarTudo();
  }

  //Recebe os ids na ordem final e grava ordem 1..n.
  static async reordenar(ids: number[]) {
    await prisma.$transaction(
      ids.map((id, i) => prisma.statusOperacao.update({ where: { id }, data: { ordem: i + 1 } }))
    );
    this.invalidarTudo();
  }

  static async remover(id: number) {
    const atual = await prisma.statusOperacao.findUnique({ where: { id } });
    if (!atual) throw erro400("Status não encontrado.");
    const emUso = await prisma.operacao.count({ where: { status: atual.nome } });
    if (emUso > 0) {
      throw erro400(`Este status está em ${emUso} operação(ões). Desative em vez de excluir.`);
    }
    await prisma.statusOperacao.delete({ where: { id } });
    this.invalidarTudo();
  }
}
