import { QueryClient, useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  init: ["init"] as const,
  dashboard: ["dashboard"] as const,
  automacoes: ["automacoes"] as const,
  usuarios: (page: number) => ["usuarios", page] as const,
  perfil: ["perfil"] as const,
  faturistas: ["faturistas"] as const,
  prazos: ["prazos"] as const,
};

export interface InitData {
  user: any;
  pastas: any[];
  totalInbox: number;
  columnOrder: string[] | null;
  // Contagem de emissões antigas por pasta (chave "inbox" = Caixa de Entrada).
  emissaoAntigasPorPasta: Record<string, number>;
}

// Extraída para ser reaproveitada pelo AuthContext (boot com uma única
// request: sem /auth/me separado, ver AuthContext.tsx).
export const fetchInit = () => api.get<InitData>("/init");

// Dados de boot (sidebar + ordem de colunas). Mantidos frescos com polling
// leve apenas com a aba em foco — é o que dá o "tempo real" dos contadores
// da sidebar sem custo quando o usuário não está olhando.
export function useInit() {
  return useQuery({
    queryKey: queryKeys.init,
    queryFn: fetchInit,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });
}

export interface Faturista {
  id: string;
  nome: string;
  email: string;
}

// Lista de usuários ativos que podem ser atribuídos como faturista de uma
// pasta. Só busca quando o formulário de criar/editar pasta está aberto —
// o select não aparece em mais lugar nenhum.
export function useFaturistas(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.faturistas,
    queryFn: () => api.get<{ faturistas: Faturista[] }>("/pastas/faturistas"),
    staleTime: 60_000,
    enabled,
  });
}

export interface PrazoClienteItem {
  id: number;
  cliente: string;
  prazoDias: number;
}

// Regras de "emissão antiga": prazo padrão global + exceções por cliente.
export function usePrazos() {
  return useQuery({
    queryKey: queryKeys.prazos,
    queryFn: () => api.get<{ padrao: number; clientes: PrazoClienteItem[] }>("/prazos"),
    staleTime: 60_000,
  });
}

export interface DashboardGrupo {
  chave: string | null;
  valor: number;
  quantidade: number;
}

export interface DashboardFaturistaGrupo extends DashboardGrupo {
  faturistaId: string | null;
}

// Filtros globais. `faturistaId` aceita id real ou "sem" (sem responsável).
export interface DashboardFiltros {
  faturistaId?: string;
  pastaId?: string;
  pagador?: string;
  status?: string;
  tipoDocumento?: string;
  tipoCte?: string;
  agencia?: string;
}

export interface DashboardGeral {
  valorTotal: number;
  quantidade: number;
  totalPastas: number;
  totalFaturistas: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  porFaturista: DashboardFaturistaGrupo[];
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
}

export interface DashboardPastaResumo {
  pastaId: number | null;
  nome: string;
  cor: string | null;
  faturistaId: string | null;
  faturistaNome: string | null;
  valor: number;
  quantidade: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  primeiraEmissao: string | null;
  ultimaEmissao: string | null;
}

export interface DashboardPastaDetalhe {
  pasta: DashboardPastaResumo;
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
}

export interface DashboardResumo {
  geral: DashboardGeral;
  pastas: DashboardPastaResumo[];
}

// Detalhe agregado de um faturista (drill-down do acordeão "Por faturista").
export interface DashboardFaturistaDetalhe {
  faturistaId: string | null;
  faturistaNome: string | null;
  valor: number;
  quantidade: number;
  totalPastas: number;
  emissaoAntigas: number;
  emissaoAntigasValor: number;
  primeiraEmissao: string | null;
  ultimaEmissao: string | null;
  porStatus: DashboardGrupo[];
  porTipoDocumento: DashboardGrupo[];
  porAgencia: DashboardGrupo[];
  porTipoCte: DashboardGrupo[];
  topPagadores: DashboardGrupo[];
  pastas: DashboardPastaResumo[];
}

// Opções distintas para os selects de filtro.
export interface DashboardOpcoes {
  faturistas: { id: string; nome: string }[];
  pastas: { id: number; nome: string }[];
  clientes: string[];
  status: string[];
  tiposDocumento: string[];
  tiposCte: string[];
  agencias: string[];
}

export function filtrosParaQuery(filtros: DashboardFiltros): string {
  const p = new URLSearchParams();
  if (filtros.faturistaId) p.set("faturista", filtros.faturistaId);
  if (filtros.pastaId) p.set("pasta", filtros.pastaId);
  if (filtros.pagador) p.set("cliente", filtros.pagador);
  if (filtros.status) p.set("status", filtros.status);
  if (filtros.tipoDocumento) p.set("tipo", filtros.tipoDocumento);
  if (filtros.tipoCte) p.set("tipoCte", filtros.tipoCte);
  if (filtros.agencia) p.set("agencia", filtros.agencia);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

//Visão geral + lista de pastas da tela inicial. Atualiza sozinha em segundo
//plano (intervalo + foco na aba) para manter os valores frescos sem botão.
export function useDashboard(filtros: DashboardFiltros = {}) {
  const qs = filtrosParaQuery(filtros);
  return useQuery({
    queryKey: [...queryKeys.dashboard, filtros] as const,
    queryFn: () => api.get<DashboardResumo>(`/dashboard${qs}`),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

//Detalhamento de uma pasta sob demanda (ao expandir na lista).
export function useDashboardPasta(pastaId: number | "inbox" | null, enabled: boolean) {
  const chave = pastaId === null ? "inbox" : String(pastaId);
  return useQuery({
    queryKey: ["dashboard", "pasta", chave] as const,
    queryFn: () => api.get<DashboardPastaDetalhe>(`/dashboard/pastas/${chave}`),
    enabled,
    staleTime: 60_000,
  });
}

//Detalhamento de um faturista sob demanda (ao expandir no acordeão).
export function useDashboardFaturista(
  faturistaId: string | null,
  filtros: DashboardFiltros,
  enabled: boolean
) {
  const chave = faturistaId === null ? "sem" : faturistaId;
  const qs = filtrosParaQuery(filtros);
  return useQuery({
    queryKey: ["dashboard", "faturista", chave, filtros] as const,
    queryFn: () =>
      api.get<DashboardFaturistaDetalhe>(`/dashboard/faturistas/${encodeURIComponent(chave)}${qs}`),
    enabled,
    staleTime: 60_000,
  });
}

//Opções de filtro (faturistas, clientes, status, tipos, agências).
export function useDashboardOpcoes() {
  return useQuery({
    queryKey: ["dashboard", "opcoes"] as const,
    queryFn: () => api.get<DashboardOpcoes>("/dashboard/opcoes"),
    staleTime: 5 * 60_000,
  });
}