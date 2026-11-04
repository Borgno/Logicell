import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { PastaComRegras, Regra, TipoRegra } from "~/types/pasta";

export const regrasQuery = queryOptions({
  queryKey: ["regras"],
  queryFn: ({ signal }) => api.get<{ data: PastaComRegras[] }>("/regras", { signal }),
  select: (page) => page.data,
});

// Uma regra nova ou removida muda a marca de conflito de outras pastas: a lista inteira é relida.
export function useCreateRegra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { pastaId: number; tipo: TipoRegra; valor: string }) =>
      api.post<Regra>("/regras", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["regras"] }),
  });
}

export function useDeleteRegra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/regras/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["regras"] }),
  });
}
