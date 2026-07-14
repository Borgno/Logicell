export class VerificadorConflitosService {
  /**
   * Avalia todas as pastas e suas regras para identificar ambiguidades de roteamento.
   * Retorna os mesmos dados enriquecidos com a flag `hasConflict` nas regras.
   */
  static marcarConflitos(data: any[]): any[] {
    const pastasProps = new Map<number, { isGenerica: boolean; produtos: Set<string>; agencias: Set<string>; clientes: Set<string> }>();

    for (const pasta of data) {
      const produtos = new Set<string>();
      const agencias = new Set<string>();
      const clientes = new Set<string>();
      
      for (const r of pasta.regras) {
        if (r.produto) produtos.add(r.produto.toUpperCase());
        if (r.agencia) agencias.add(r.agencia.toUpperCase());
        if (r.cliente) clientes.add(r.cliente.toUpperCase());
      }
      
      pastasProps.set(pasta.id, {
        isGenerica: produtos.size === 0,
        produtos,
        agencias,
        clientes
      });
    }

    return data.map(pasta => {
      const pInfo = pastasProps.get(pasta.id)!;
      
      const regrasComConflito = pasta.regras.map((regra: any) => {
        let hasConflict = false;

        if (regra.agencia || regra.cliente) {
          for (const [qId, qInfo] of pastasProps.entries()) {
            if (qId === pasta.id) continue;

            const mesmoCliente = regra.cliente && qInfo.clientes.has(regra.cliente.toUpperCase());
            const mesmaAgencia = regra.agencia && qInfo.agencias.has(regra.agencia.toUpperCase());

            if (mesmoCliente || mesmaAgencia) {
              // Conflito Tipo 1: Ambas as pastas são genéricas (fallback duplo)
              if (pInfo.isGenerica && qInfo.isGenerica) {
                hasConflict = true;
                break;
              }
              // Conflito Tipo 2: Ambas são específicas e possuem pelo menos um Produto igual (match forte duplo)
              if (!pInfo.isGenerica && !qInfo.isGenerica) {
                const temProdutoEmComum = [...pInfo.produtos].some(prod => qInfo.produtos.has(prod));
                if (temProdutoEmComum) {
                  hasConflict = true;
                  break;
                }
              }
            }
          }
        }
        
        return { ...regra, hasConflict };
      });
      return { ...pasta, regras: regrasComConflito };
    });
  }
}
