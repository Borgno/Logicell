/**
 * Registro Central de Mensagens e Alertas do Sistema
 * Centraliza todos os textos para facilitar a manutenção e garantir consistência.
 */

export const MESSAGES = {
  // --- NOTIFICAÇÕES (TOASTS) ---
  toasts: {
    createFolder: {
      message: "Pasta criada com sucesso!",
      type: "success" as const
    },
    renameFolder: {
      message: "Pasta renomeada com sucesso!",
      type: "success" as const
    },
    deleteFolder: {
      message: "Pasta e itens excluídos com sucesso!",
      type: "info" as const
    },
    bulkMove: {
      message: "Itens movidos com sucesso",
      type: "success" as const
    },
    bulkDelete: {
      message: "Itens excluídos com sucesso",
      type: "error" as const // Vermelho para exclusão
    },
    update: {
      message: "Alteração salva com sucesso!",
      type: "success" as const
    },
    excelError: {
      title: "Operação não concluída",
      message: "Ocorreu um erro ao gerar o arquivo Excel ou a operação foi cancelada.",
      type: "info" as const
    },
    generatingExcel: {
      message: "Gerando arquivo Excel...",
      type: "info" as const
    },
    downloadStarted: {
      message: "Download iniciado!",
      type: "success" as const
    }
  },

  // --- ALERTAS E MODAIS DE CONFIRMAÇÃO ---
  alerts: {
    importSuccess: (adicionados: number, ignorados: number, removidos: number = 0, modo: string = "SUBSTITUIR") => ({
      title: "Importação Concluída",
      message: `Modo: ${modo === "SUBSTITUIR" ? "Substituir (Sincronização)" : "Apenas Adicionar"}\n\n✅ Novos adicionados: ${adicionados} itens\n⚠️ Mantidos/Ignorados: ${ignorados} itens${modo === "SUBSTITUIR" ? `\n❌ Antigos removidos: ${removidos} itens` : ""}`,
      variant: "success" as const
    }),
    
    deleteFolderConfirm: (nome: string) => ({
      title: "Excluir Pasta?",
      message: `Tem certeza que deseja excluir "${nome}"?\nTodos os itens dentro desta pasta também serão permanentemente apagados.`,
      variant: "danger" as const
    }),

    bulkMoveConfirm: (count: number, pastaNome: string) => ({
      title: "Mover Itens?",
      message: `Deseja mover ${count} itens para "${pastaNome}"?`,
      variant: "primary" as const
    }),

    bulkDeleteConfirm: (count: number) => ({
      title: "Excluir permanentemente?",
      message: `Você está prestes a excluir ${count} itens. Esta ação não pode ser desfeita.`,
      variant: "danger" as const
    })
  },

  // --- ERROS GENÉRICOS ---
  errors: {
    network: "Erro de conexão. Verifique sua internet.",
    server: "Ocorreu um erro interno no servidor. Tente novamente mais tarde.",
    invalidAction: "Ação não permitida ou inválida."
  }
};
