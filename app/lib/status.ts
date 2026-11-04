import { queryOptions } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { StatusOperacao } from "~/types/status";

// A lista inteira, inclusive inativos: vai para o editor de status da grid e para a tela de status.
export const statusQuery = queryOptions({
  queryKey: ["status"],
  queryFn: ({ signal }) => api.get<{ data: StatusOperacao[] }>("/status", { signal }),
  select: (page) => page.data,
  staleTime: 60_000,
});
