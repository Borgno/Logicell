import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { semAcento } from "~/lib/text";
import type { Pasta } from "~/types/pasta";

// Cores das pastas, as mesmas do sistema antigo.
export const PASTA_COLORS = [
  { value: "#64748b", label: "Cinza" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
] as const;

export const DEFAULT_PASTA_COLOR = PASTA_COLORS[0].value;

// Busca sem diferenciar caixa nem acento.
export function normalizeSearch(value: string) {
  return semAcento(value).toLowerCase().trim();
}

// A lista inteira: vai para a sidebar e para a tela de pastas.
export const pastasQuery = queryOptions({
  queryKey: ["pastas"],
  queryFn: ({ signal }) => api.get<{ data: Pasta[] }>("/pastas", { signal }),
  select: (page) => page.data,
  staleTime: 60_000,
});

// A tela de pastas busca pela API (?search=&cor=), como toda lista com DataTable.
export const pastasSearchQuery = (search: string, cor: string | null) =>
  queryOptions({
    queryKey: ["pastas", "search", search, cor],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (cor) query.set("cor", cor);
      return api.get<{ data: Pasta[] }>(`/pastas?${query}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

export const faturistasQuery = queryOptions({
  queryKey: ["faturistas"],
  queryFn: ({ signal }) =>
    api.get<{ data: { id: string; fullName: string }[] }>("/faturistas", { signal }),
  select: (page) => page.data.map((user) => ({ value: user.id, label: user.fullName })),
});

export type PastaInput = { nome: string; cor: string; faturistaId?: string | null };

// Pasta nova ou editada muda a sidebar e a tela de automações.
function useInvalidatePastas() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["pastas"] });
    void queryClient.invalidateQueries({ queryKey: ["regras"] });
  };
}

export function useCreatePasta() {
  const invalidate = useInvalidatePastas();
  return useMutation({
    mutationFn: (input: PastaInput) => api.post<Pasta>("/pastas", input),
    onSuccess: invalidate,
  });
}

export function useUpdatePasta(id: number) {
  const invalidate = useInvalidatePastas();
  return useMutation({
    mutationFn: (input: Partial<PastaInput>) => api.patch<Pasta>(`/pastas/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeletePasta(id: number) {
  const invalidate = useInvalidatePastas();
  return useMutation({
    mutationFn: () => api.delete<void>(`/pastas/${id}`),
    onSuccess: invalidate,
  });
}
