import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { PrazoCliente, Prazos } from "~/types/pasta";

export const prazosQuery = queryOptions({
  queryKey: ["prazos"],
  queryFn: ({ signal }) => api.get<Prazos>("/prazos", { signal }),
});

export const sugestoesQuery = (search: string) =>
  queryOptions({
    queryKey: ["prazos", "sugestoes", search],
    queryFn: ({ signal }) =>
      api.get<{ data: string[] }>(`/prazos/sugestoes?${new URLSearchParams({ search })}`, {
        signal,
      }),
    select: (page) => page.data,
    enabled: search.length >= 2,
    staleTime: 60_000,
  });

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["prazos"] });
}

export function useSetPadrao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prazoDias: number) => api.put<Prazos>("/prazos/padrao", { prazoDias }),
    onSuccess: (prazos) => queryClient.setQueryData(prazosQuery.queryKey, prazos),
  });
}

export function useCreatePrazoCliente() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { cliente: string; prazoDias: number }) =>
      api.post<PrazoCliente>("/prazos/clientes", input),
    onSuccess: invalidate,
  });
}

export function useUpdatePrazoCliente(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (prazoDias: number) =>
      api.patch<PrazoCliente>(`/prazos/clientes/${id}`, { prazoDias }),
    onSuccess: invalidate,
  });
}

export function useDeletePrazoCliente(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api.delete<void>(`/prazos/clientes/${id}`),
    onSuccess: invalidate,
  });
}
