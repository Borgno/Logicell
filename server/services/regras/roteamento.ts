// Motor de roteamento: decide a pasta de uma operação nova pelas regras de automação. Regra pura, sem
// banco; a importação monta os mapas uma vez e chama rotear para cada linha.
//
// Cliente (pagador) tem precedência sobre agência. Entre as pastas candidatas, a que tem produtos na
// regra é match forte quando o produto da operação bate; a sem produto é match fraco. Um match forte
// único vence; dois ou mais vão para a Caixa de Entrada (null). Sem forte, vale o mesmo para o fraco.
// Toda comparação é em caixa alta e sem espaço nas pontas.

export type RegraRow = {
  pastaId: number;
  agencia: string | null;
  cliente: string | null;
  produto: string | null;
};

export type MapasRoteamento = {
  porAgencia: Map<string, number[]>;
  porCliente: Map<string, number[]>;
  produtosPorPasta: Map<number, Set<string>>;
};

export type OperacaoRoteavel = {
  nm_pessoa_pagador?: string | null;
  nm_agencia?: string | null;
  nm_produto?: string | null;
};

export function normalizar(valor: string | null | undefined) {
  return valor?.trim().toUpperCase() || null;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function montarMapas(regras: RegraRow[]): MapasRoteamento {
  const mapas: MapasRoteamento = {
    porAgencia: new Map(),
    porCliente: new Map(),
    produtosPorPasta: new Map(),
  };
  for (const regra of regras) {
    const agencia = normalizar(regra.agencia);
    const cliente = normalizar(regra.cliente);
    const produto = normalizar(regra.produto);
    if (agencia) push(mapas.porAgencia, agencia, regra.pastaId);
    if (cliente) push(mapas.porCliente, cliente, regra.pastaId);
    if (produto) {
      const produtos = mapas.produtosPorPasta.get(regra.pastaId) ?? new Set<string>();
      produtos.add(produto);
      mapas.produtosPorPasta.set(regra.pastaId, produtos);
    }
  }
  return mapas;
}

// Pasta da operação, ou null para a Caixa de Entrada.
export function rotear(operacao: OperacaoRoteavel, mapas: MapasRoteamento): number | null {
  const cliente = normalizar(operacao.nm_pessoa_pagador);
  const agencia = normalizar(operacao.nm_agencia);
  const candidatas =
    (cliente && mapas.porCliente.get(cliente)) || (agencia && mapas.porAgencia.get(agencia)) || [];
  if (candidatas.length === 0) return null;

  const produto = normalizar(operacao.nm_produto);
  // Set: a mesma pasta pode ter o cliente cadastrado duas vezes e não pode contar como ambígua.
  const fortes = new Set<number>();
  const fracos = new Set<number>();
  for (const pastaId of candidatas) {
    const produtos = mapas.produtosPorPasta.get(pastaId);
    if (!produtos || produtos.size === 0) fracos.add(pastaId);
    else if (produto && produtos.has(produto)) fortes.add(pastaId);
  }

  if (fortes.size > 0) return fortes.size === 1 ? [...fortes][0] : null;
  return fracos.size === 1 ? [...fracos][0] : null;
}
