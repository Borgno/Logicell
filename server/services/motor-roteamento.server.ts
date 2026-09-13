export interface MapasRoteamento {
  mapaAgencia: Map<string, number[]>;
  mapaCliente: Map<string, number[]>;
  mapaProdutosPorPasta: Map<number, Set<string>>;
}

export class MotorRoteamentoService {
  /**
   * Processa uma lista de operações recém-importadas da planilha e define
   * o `pastaId` de cada uma delas com base nos mapas de roteamento (já
   * buscados pelo chamador, em paralelo com o resto da importação — ver
   * operacao-import.server.ts). Modifica a array de operações in-place.
   */
  static aplicarRegrasRoteamento(operacoes: any[], mapas: MapasRoteamento) {
    if (mapas.mapaAgencia.size === 0 && mapas.mapaCliente.size === 0) {
      return; // Nenhuma regra de automação cadastrada
    }

    for (const op of operacoes) {
      let pastasCandidatas: number[] = [];

      // 1. Busca por Cliente tem precedência
      if (op.nm_pessoa_pagador) {
        const clienteClean = String(op.nm_pessoa_pagador).trim().toUpperCase();
        if (mapas.mapaCliente.has(clienteClean)) {
          pastasCandidatas = mapas.mapaCliente.get(clienteClean)!;
        }
      }

      // 2. Fallback para Agência se não encontrar Cliente
      if (pastasCandidatas.length === 0 && op.nm_agencia) {
        const agenciaClean = String(op.nm_agencia).trim().toUpperCase();
        if (mapas.mapaAgencia.has(agenciaClean)) {
          pastasCandidatas = mapas.mapaAgencia.get(agenciaClean)!;
        }
      }

      let pastaIdFinal: number | null = null;
      
      // 3. Aplicação do Sub-filtro de Produto e Resolução de Ambiguidade
      if (pastasCandidatas.length > 0) {
        const produtoOperacao = op.nm_produto ? String(op.nm_produto).trim().toUpperCase() : null;
        
        const pastasMatchForte: number[] = [];
        const pastasMatchFraco: number[] = [];

        for (const pastaId of pastasCandidatas) {
          const produtosDaPasta = mapas.mapaProdutosPorPasta.get(pastaId);
          
          // Match Forte: A pasta exige produtos e a operação corresponde a um deles
          if (produtosDaPasta && produtosDaPasta.size > 0) {
            if (produtoOperacao && produtosDaPasta.has(produtoOperacao)) {
              pastasMatchForte.push(pastaId);
            }
          } 
          // Match Fraco: A pasta é genérica e aceita qualquer produto
          else {
            pastasMatchFraco.push(pastaId);
          }
        }

        // Resolução do Roteamento
        if (pastasMatchForte.length === 1) {
          pastaIdFinal = pastasMatchForte[0];
        } else if (pastasMatchForte.length > 1) {
           // Ambiguidade no match forte: Inbox
          pastaIdFinal = null; 
        } else if (pastasMatchFraco.length === 1) {
          pastaIdFinal = pastasMatchFraco[0];
        } else if (pastasMatchFraco.length > 1) {
           // Ambiguidade no match fraco: Inbox
          pastaIdFinal = null;
        }
      }

      op.pastaId = pastaIdFinal;
    }
  }
}
