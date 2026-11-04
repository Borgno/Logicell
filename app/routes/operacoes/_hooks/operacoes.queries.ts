import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { api } from "~/lib/api";
import { filtrosParaApi, type GridParams } from "./useGridParams";

// Escopo da grid: a Caixa de Entrada ou uma pasta.
export type Escopo = "inbox" | number;

export type Operacao = Record<string, string | number | null> & {
  id: number;
  pastaId: number | null;
  emissaoAntiga: boolean;
  placaDuplicada: boolean;
};

type Pagina = {
  data: Operacao[];
  meta: { page: number; pageSize: number; total: number; totalValor: number };
};

export const PAGE_SIZE = 200;

export function listQueryString(escopo: Escopo, params: GridParams) {
  const query = new URLSearchParams({ pasta: String(escopo) });
  if (params.sort) query.set("sort", params.sort);
  if (params.search) query.set("search", params.search);
  for (const filtro of filtrosParaApi(params.filtros)) query.append("filtro", filtro);
  return query;
}

// Rolagem infinita: 200 linhas por página, a próxima pedida perto do fim da grid.
export const operacoesQuery = (escopo: Escopo, params: GridParams) =>
  infiniteQueryOptions({
    queryKey: ["operacoes", "list", escopo, params],
    queryFn: ({ pageParam, signal }) => {
      const query = listQueryString(escopo, params);
      query.set("page", String(pageParam));
      query.set("pageSize", String(PAGE_SIZE));
      return api.get<Pagina>(`/operacoes?${query}`, { signal });
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined,
    staleTime: 30_000,
  });

export type OperacaoStats = {
  caixaDeEntrada: { total: number; emissoesAntigas: number; valorEmissoesAntigas: number };
  pastas: {
    pastaId: number;
    total: number;
    emissoesAntigas: number;
    valorEmissoesAntigas: number;
  }[];
};

export const operacaoStatsQuery = queryOptions({
  queryKey: ["operacoes", "stats"],
  queryFn: ({ signal }) => api.get<OperacaoStats>("/operacaoStats", { signal }),
  staleTime: 30_000,
});

export const ordemColunasQuery = queryOptions({
  queryKey: ["colunas"],
  queryFn: ({ signal }) => api.get<{ ordem: string[] | null }>("/colunas", { signal }),
  select: (body) => body.ordem,
  staleTime: Infinity,
});

export function useSalvarOrdemColunas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ordem: string[]) => api.put<{ ordem: string[] }>("/colunas", { ordem }),
    onMutate: (ordem) => queryClient.setQueryData(ordemColunasQuery.queryKey, { ordem }),
    onError: () => queryClient.invalidateQueries({ queryKey: ordemColunasQuery.queryKey }),
  });
}

// Troca uma linha em todas as listas carregadas, sem refazer a busca.
function trocarLinha(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
  update: (row: Operacao) => Operacao,
) {
  queryClient.setQueriesData<InfiniteData<Pagina>>({ queryKey: ["operacoes", "list"] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((row) => (row.id === id ? update(row) : row)),
          })),
        }
      : data,
  );
}

// Edição de célula: a tela já mostra o valor digitado; a resposta do servidor (data convertida,
// placa duplicada recalculada) substitui a linha. Se falhar, a lista é relida.
export function useEditarCelula() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; campo: string; valor: string | null }) =>
      api.patch<Operacao>(`/operacoes/${input.id}`, { campo: input.campo, valor: input.valor }),
    onMutate: ({ id, campo, valor }) =>
      trocarLinha(queryClient, id, (row) => ({ ...row, [campo]: valor })),
    onSuccess: (row) => trocarLinha(queryClient, row.id, () => row),
    onError: () => queryClient.invalidateQueries({ queryKey: ["operacoes"] }),
  });
}

export type Selecao =
  | { ids: number[] }
  | { todas: { pasta: string; filtro: string[]; search?: string; excluidos: number[] } };

// Mover e excluir mudam contagens de outras pastas: tudo de operações é relido.
function useInvalidarOperacoes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["operacoes"] });
}

export function useAtualizarEmLote() {
  const invalidate = useInvalidarOperacoes();
  return useMutation({
    mutationFn: (
      input:
        | { selecao: Selecao; pastaId: number | null }
        | { selecao: Selecao; campo: string; valor: string | null },
    ) => api.patch<{ afetadas: number }>("/operacoes", input),
    onSuccess: invalidate,
  });
}

export function useExcluirEmLote() {
  const invalidate = useInvalidarOperacoes();
  return useMutation({
    mutationFn: (selecao: Selecao) => api.delete<{ afetadas: number }>("/operacoes", { selecao }),
    onSuccess: invalidate,
  });
}
