import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { Cubo } from "../_lib/cubo";

export type FaturistaResumo = {
  faturistaId: string | null;
  nome: string;
  supervisor: string | null;
  valor: number;
  quantidade: number;
};

export type Resumo = {
  total: { valor: number; quantidade: number };
  faturistas: FaturistaResumo[];
};

export type Opcoes = {
  faturistas: { id: string; nome: string }[];
  pastas: { id: number; nome: string; faturistaId: string | null }[];
  clientes: string[];
  status: string[];
  tipos: string[];
  tiposCte: string[];
  agencias: string[];
};

// Filtros do dashboard, na URL: o link guarda a visão.
export const CAMPOS = [
  "faturista",
  "pasta",
  "cliente",
  "status",
  "tipo",
  "tipoCte",
  "agencia",
  "antigas",
  "de",
  "ate",
] as const;
export type Filtros = Partial<Record<(typeof CAMPOS)[number], string>>;

export function filtrosDaUrl(searchParams: URLSearchParams): Filtros {
  const filtros: Filtros = {};
  for (const campo of CAMPOS) {
    const valor = searchParams.get(campo);
    if (valor) filtros[campo] = valor;
  }
  return filtros;
}

const queryString = (filtros: Filtros) =>
  new URLSearchParams(filtros as Record<string, string>).toString();

// O dashboard se atualiza sozinho a cada 30 s enquanto a aba está aberta, como no sistema antigo.
export const resumoQuery = (filtros: Filtros) =>
  queryOptions({
    queryKey: ["dashboard", "resumo", filtros],
    queryFn: ({ signal }) => api.get<Resumo>(`/dashboard?${queryString(filtros)}`, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

export const opcoesQuery = queryOptions({
  queryKey: ["dashboard", "opcoes"],
  queryFn: ({ signal }) => api.get<Opcoes>("/dashboard/opcoes", { signal }),
  staleTime: 5 * 60_000,
});

export const cuboQuery = (faturistaId: string | null, filtros: Filtros) =>
  queryOptions({
    queryKey: ["dashboard", "cubo", faturistaId, filtros],
    queryFn: ({ signal }) =>
      api.get<Cubo>(`/dashboard/faturistas/${faturistaId ?? "sem"}/cubo?${queryString(filtros)}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
