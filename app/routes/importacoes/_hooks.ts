import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { Page } from "~/types/api";

export type Importacao = {
  id: number;
  nomeArquivo: string;
  usuario: string;
  qtdRegistros: number;
  createdAt: string;
  podeDesfazer: boolean;
};

export type ModoImportacao = "SUBSTITUIR" | "ADICIONAR";

export type ResultadoImportacao = {
  importacao: Importacao;
  modo: ModoImportacao;
  totalLido: number;
  adicionadas: number;
  ignoradas: number;
  removidas: number;
};

export const PAGE_SIZE = 20;

export const importacoesQuery = (params: { search?: string; page: number }) =>
  queryOptions({
    queryKey: ["importacoes", params],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) });
      if (params.search) query.set("search", params.search);
      return api.get<Page<Importacao>>(`/importacoes?${query}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

// Importar e desfazer mudam operações, contagens e o histórico. Desfazer também volta pastas e
// regras: tudo isso é relido.
function useInvalidarTudo() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["importacoes", "operacoes", "pastas", "regras"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export function useImportarPlanilha() {
  const invalidate = useInvalidarTudo();
  return useMutation({
    mutationFn: (input: { arquivo: File; modo: ModoImportacao }) => {
      const form = new FormData();
      form.append("arquivo", input.arquivo);
      form.append("modo", input.modo);
      return api.post<ResultadoImportacao>("/importacoes", form);
    },
    onSuccess: invalidate,
  });
}

export function useDesfazerImportacao() {
  const invalidate = useInvalidarTudo();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ importacaoId: number; importacoesDesfeitas: number }>(
        `/importacoes/${id}/restauracoes`,
      ),
    onSuccess: invalidate,
  });
}
