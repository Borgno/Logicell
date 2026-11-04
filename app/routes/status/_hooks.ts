import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { statusQuery } from "~/lib/status";
import type { StatusOperacao } from "~/types/status";

// Renomear muda o status gravado nas operações: a grid relê também.
function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: statusQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: ["operacoes"] }),
    ]);
}

export function useCreateStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (nome: string) => api.post<StatusOperacao>("/status", { nome }),
    onSuccess: invalidate,
  });
}

export function useUpdateStatus(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (patch: { nome?: string; ativo?: boolean }) =>
      api.patch<StatusOperacao>(`/status/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useReorderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.put<{ data: StatusOperacao[] }>("/status/ordem", { ids }),
    onSuccess: (page) => queryClient.setQueryData(statusQuery.queryKey, page),
  });
}

export function useDeleteStatus(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api.delete<void>(`/status/${id}`),
    onSuccess: invalidate,
  });
}
