// Detalhe de um faturista calculado no navegador sobre o cubo que o servidor manda: os filtros
// internos do detalhe (clicar num status, numa agência) não fazem nova request. O cubo tem poucas
// centenas de linhas, então cada clique custa menos de 1 ms.

export const FILTRO_VAZIO = "__vazio__";

export type CuboLinha = {
  status: string | null;
  tipo: string | null;
  agencia: string | null;
  tipoCte: string | null;
  cliente: string | null;
  pastaId: number | null;
  valor: number;
  quantidade: number;
  primeira: string | null;
  ultima: string | null;
  antigas: number;
  valorAntigas: number;
};

export type Cubo = {
  faturistaId: string | null;
  linhas: CuboLinha[];
  pastas: { id: number; nome: string; cor: string | null }[];
};

export type Dimensao = "status" | "tipo" | "agencia" | "tipoCte" | "cliente";
export type SubFiltros = Partial<Record<Dimensao, string>>;

export type Grupo = { chave: string | null; valor: number; quantidade: number };

export type Detalhe = {
  valor: number;
  quantidade: number;
  antigas: number;
  valorAntigas: number;
  primeira: string | null;
  ultima: string | null;
  grupos: Record<Dimensao, Grupo[]>;
  pastas: {
    pastaId: number | null;
    nome: string;
    cor: string | null;
    valor: number;
    quantidade: number;
  }[];
};

// Vazio casa NULL e texto em branco, como no servidor; o resto é igualdade exata.
function casa(valor: string | null, filtro: string) {
  return filtro === FILTRO_VAZIO ? !String(valor ?? "").trim() : valor === filtro;
}

const DIMENSOES: Dimensao[] = ["status", "tipo", "agencia", "tipoCte", "cliente"];

const porValor = <T extends { valor: number }>(itens: Iterable<T>) =>
  [...itens].sort((a, b) => b.valor - a.valor);

export function agregarCubo(cubo: Cubo, sub: SubFiltros): Detalhe {
  const ativos = DIMENSOES.filter((dimensao) => sub[dimensao]);
  const grupos = Object.fromEntries(
    DIMENSOES.map((dimensao) => [dimensao, new Map<string | null, Grupo>()]),
  ) as Record<Dimensao, Map<string | null, Grupo>>;
  const porPasta = new Map<number | null, { valor: number; quantidade: number }>();
  const total = { valor: 0, quantidade: 0, antigas: 0, valorAntigas: 0 };
  let primeira: string | null = null;
  let ultima: string | null = null;

  for (const linha of cubo.linhas) {
    if (!ativos.every((dimensao) => casa(linha[dimensao], sub[dimensao]!))) continue;
    total.valor += linha.valor;
    total.quantidade += linha.quantidade;
    total.antigas += linha.antigas;
    total.valorAntigas += linha.valorAntigas;
    if (linha.primeira && (!primeira || linha.primeira < primeira)) primeira = linha.primeira;
    if (linha.ultima && (!ultima || linha.ultima > ultima)) ultima = linha.ultima;
    for (const dimensao of DIMENSOES) {
      const chave = linha[dimensao];
      const grupo = grupos[dimensao].get(chave) ?? { chave, valor: 0, quantidade: 0 };
      grupo.valor += linha.valor;
      grupo.quantidade += linha.quantidade;
      grupos[dimensao].set(chave, grupo);
    }
    const pasta = porPasta.get(linha.pastaId) ?? { valor: 0, quantidade: 0 };
    pasta.valor += linha.valor;
    pasta.quantidade += linha.quantidade;
    porPasta.set(linha.pastaId, pasta);
  }

  const info = new Map(cubo.pastas.map((pasta) => [pasta.id, pasta]));
  return {
    ...total,
    primeira,
    ultima,
    grupos: Object.fromEntries(
      DIMENSOES.map((dimensao) => [dimensao, porValor(grupos[dimensao].values())]),
    ) as Record<Dimensao, Grupo[]>,
    pastas: porValor(
      [...porPasta].map(([pastaId, soma]) => ({
        pastaId,
        nome:
          pastaId === null ? "Caixa de Entrada" : (info.get(pastaId)?.nome ?? `Pasta ${pastaId}`),
        cor: pastaId === null ? null : (info.get(pastaId)?.cor ?? null),
        ...soma,
      })),
    ),
  };
}
