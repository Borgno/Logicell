import { normalizar, type RegraRow } from "./roteamento";

// Verificador de conflitos da tela de automações. Uma regra de cliente ou agência está em conflito
// quando outra pasta tem o mesmo cliente ou agência e as duas são genéricas (sem produto), ou as duas
// têm ao menos um produto em comum. Nos dois casos o motor manda a operação para a Caixa de Entrada.

type RegraComId = RegraRow & { id: number };

type PerfilPasta = {
  produtos: Set<string>;
  agencias: Set<string>;
  clientes: Set<string>;
};

// Ids das regras em conflito.
export function regrasEmConflito(regras: RegraComId[]): Set<number> {
  const perfis = new Map<number, PerfilPasta>();
  for (const regra of regras) {
    const perfil = perfis.get(regra.pastaId) ?? {
      produtos: new Set<string>(),
      agencias: new Set<string>(),
      clientes: new Set<string>(),
    };
    const produto = normalizar(regra.produto);
    const agencia = normalizar(regra.agencia);
    const cliente = normalizar(regra.cliente);
    if (produto) perfil.produtos.add(produto);
    if (agencia) perfil.agencias.add(agencia);
    if (cliente) perfil.clientes.add(cliente);
    perfis.set(regra.pastaId, perfil);
  }

  const conflitos = new Set<number>();
  for (const regra of regras) {
    const cliente = normalizar(regra.cliente);
    const agencia = normalizar(regra.agencia);
    if (!cliente && !agencia) continue;
    const perfil = perfis.get(regra.pastaId)!;
    const generica = perfil.produtos.size === 0;

    for (const [outraId, outra] of perfis) {
      if (outraId === regra.pastaId) continue;
      const mesmaChave =
        (cliente !== null && outra.clientes.has(cliente)) ||
        (agencia !== null && outra.agencias.has(agencia));
      if (!mesmaChave) continue;
      const outraGenerica = outra.produtos.size === 0;
      const produtoEmComum = [...perfil.produtos].some((produto) => outra.produtos.has(produto));
      if ((generica && outraGenerica) || (!generica && !outraGenerica && produtoEmComum)) {
        conflitos.add(regra.id);
        break;
      }
    }
  }
  return conflitos;
}
