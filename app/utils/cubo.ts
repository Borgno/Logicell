import type { DashboardCuboLinha, DashboardFaturistaCubo, DashboardGrupo } from "~/lib/query";

// Sentinela de valor vazio nos filtros (mesma do servidor, FILTRO_VAZIO).
export const FILTRO_VAZIO = "__vazio__";

// Sub-filtros do detalhe do faturista: um valor por dimensão (ou FILTRO_VAZIO).
export type CampoDetalhe = "status" | "tipoDocumento" | "agencia" | "tipoCte" | "pagador";
export type SubFiltros = Partial<Record<CampoDetalhe, string>>;

const COLUNA: Record<CampoDetalhe, "s" | "t" | "a" | "c" | "p"> = {
  status: "s",
  tipoDocumento: "t",
  agencia: "a",
  tipoCte: "c",
  pagador: "p",
};

export interface PastaDetalhe {
  pastaId: number | null;
  nome: string;
  cor: string | null;
  valor: number;
  quantidade: number;
}

export interface DetalheFaturista {
  valor: number;
  quantidade: number;
  totalPastas: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  primeiraEmissao: string | null;
  ultimaEmissao: string | null;
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
  pastas: PastaDetalhe[];
}

// Mesma regra do servidor: vazio casa NULL e texto em branco; o resto é igualdade exata.
function casa(valor: string | null, filtro: string): boolean {
  return filtro === FILTRO_VAZIO ? !String(valor ?? "").trim() : valor === filtro;
}

function somar(grupos: Map<string | null, DashboardGrupo>, chave: string | null, l: DashboardCuboLinha) {
  const g = grupos.get(chave);
  if (g) {
    g.valor += l.v;
    g.quantidade += l.q;
  } else {
    grupos.set(chave, { chave, valor: l.v, quantidade: l.q });
  }
}

const ordenar = <T extends { valor: number }>(itens: Iterable<T>) => [...itens].sort((a, b) => b.valor - a.valor);

// Recalcula o detalhe do faturista só com as linhas do cubo que passam nos
// sub-filtros — a mesma conta que o servidor faria, sem ida à rede. O cubo tem
// poucas centenas de linhas, então cada clique custa menos de 1 ms.
export function agregarCubo(cubo: DashboardFaturistaCubo, sub: SubFiltros): DetalheFaturista {
  const filtros = (Object.keys(sub) as CampoDetalhe[])
    .filter((campo) => sub[campo])
    .map((campo) => [COLUNA[campo], sub[campo]!] as const);

  const dims = {
    s: new Map<string | null, DashboardGrupo>(),
    t: new Map<string | null, DashboardGrupo>(),
    a: new Map<string | null, DashboardGrupo>(),
    c: new Map<string | null, DashboardGrupo>(),
    p: new Map<string | null, DashboardGrupo>(),
  };
  const porPasta = new Map<number | null, { valor: number; quantidade: number }>();
  let valor = 0;
  let quantidade = 0;
  let emissaoAntigas = 0;
  let emissaoAntigasValor = 0;
  let primeiraEmissao: string | null = null;
  let ultimaEmissao: string | null = null;

  for (const l of cubo.linhas) {
    if (!filtros.every(([coluna, f]) => casa(l[coluna], f))) continue;

    valor += l.v;
    quantidade += l.q;
    emissaoAntigas += l.aq;
    emissaoAntigasValor += l.av;
    if (l.d1 && (!primeiraEmissao || l.d1 < primeiraEmissao)) primeiraEmissao = l.d1;
    if (l.d2 && (!ultimaEmissao || l.d2 > ultimaEmissao)) ultimaEmissao = l.d2;

    somar(dims.s, l.s, l);
    somar(dims.t, l.t, l);
    somar(dims.a, l.a, l);
    somar(dims.c, l.c, l);
    somar(dims.p, l.p, l);

    const pasta = porPasta.get(l.pid) ?? { valor: 0, quantidade: 0 };
    pasta.valor += l.v;
    pasta.quantidade += l.q;
    porPasta.set(l.pid, pasta);
  }

  const infoPasta = new Map(cubo.pastas.map((p) => [p.id, p]));
  const pastas = ordenar(
    [...porPasta].map(([pastaId, g]) => ({
      pastaId,
      nome: pastaId === null ? "Caixa de Entrada" : (infoPasta.get(pastaId)?.nome ?? `Pasta ${pastaId}`),
      cor: pastaId === null ? null : (infoPasta.get(pastaId)?.cor ?? null),
      valor: g.valor,
      quantidade: g.quantidade,
    }))
  );

  return {
    valor,
    quantidade,
    totalPastas: pastas.length,
    emissaoAntigas,
    emissaoAntigasValor,
    primeiraEmissao,
    ultimaEmissao,
    porStatus: ordenar(dims.s.values()),
    porTipoDocumento: ordenar(dims.t.values()),
    porAgencia: ordenar(dims.a.values()),
    porTipoCte: ordenar(dims.c.values()),
    topPagadores: ordenar(dims.p.values()).slice(0, 10),
    pastas,
  };
}
