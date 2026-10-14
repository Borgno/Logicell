import { keepPreviousData, QueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Cargo } from "~/utils/cargos";

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
  status: ["status"] as const,
};

export interface InitData {
  user: any;
  pastas: any[];
  totalInbox: number;
  columnOrder: string[] | null;
  // Contagem de emissões antigas por pasta (chave "inbox" = Caixa de Entrada).
  emissaoAntigasPorPasta: Record<string, number>;
  // Opções ativas do campo status, na ordem cadastrada (editor da grid).
  statusOpcoes: string[];
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
  role: Cargo;
}

// Lista de usuários ativos que podem ser atribuídos como faturista de uma
// pasta (ou supervisor de um atendente, no modal de usuário). Só busca com um
// desses formulários aberto.
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

export interface StatusItem {
  id: number;
  nome: string;
  ordem: number;
  ativo: boolean;
}

// Lista completa de status (inclusive inativos) para a página de gestão.
export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => api.get<{ status: StatusItem[] }>("/status"),
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
  // Supervisor vinculado ao atendente na Gestão de Usuários (só admin vincula).
  supervisorNome: string | null;
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
  // "1" = só emissões antigas (fora do prazo padrão/do cliente).
  antigas?: string;
  // Período de emissão "YYYY-MM-DD..YYYY-MM-DD" (um dos lados pode ficar vazio).
  periodo?: string;
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

// Detalhe de um faturista pré-agregado por combinação de dimensões (espelha
// o servidor). Os sub-filtros do detalhe são recalculados em cima dele no
// navegador (app/utils/cubo.ts), sem nova request a cada clique.
export interface DashboardCuboLinha {
  s: string | null; // status
  t: string | null; // tipo de documento
  a: string | null; // agência
  c: string | null; // tipo de CTe
  p: string | null; // pagador
  pid: number | null; // pasta (null = Caixa de Entrada)
  v: number; // valor
  q: number; // quantidade
  d1: string | null; // primeira emissão
  d2: string | null; // última emissão
  aq: number; // emissões antigas: quantidade
  av: number; // emissões antigas: valor
}

export interface DashboardFaturistaCubo {
  faturistaId: string | null;
  faturistaNome: string | null;
  linhas: DashboardCuboLinha[];
  pastas: { id: number; nome: string; cor: string | null }[];
}

// Opções distintas para os selects de filtro.
export interface DashboardOpcoes {
  faturistas: { id: string; nome: string }[];
  pastas: { id: number; nome: string; faturistaId: string | null }[];
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
  if (filtros.antigas) p.set("antigas", filtros.antigas);
  if (filtros.periodo) {
    const [de, ate] = filtros.periodo.split("..");
    if (de) p.set("de", de);
    if (ate) p.set("ate", ate);
  }
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
    // Mantém os números anteriores na tela ao trocar de filtro, até a resposta chegar.
    placeholderData: keepPreviousData,
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

//Cubo de um faturista sob demanda. Compartilhado entre o acordeão aberto e o
//pré-carregamento ao passar o mouse, para os dois usarem a mesma entrada de cache.
export function faturistaCuboQuery(faturistaId: string | null, filtros: DashboardFiltros) {
  const chave = faturistaId === null ? "sem" : faturistaId;
  const qs = filtrosParaQuery(filtros);
  return queryOptions({
    queryKey: ["dashboard", "faturista", chave, filtros] as const,
    queryFn: () =>
      api.get<DashboardFaturistaCubo>(`/dashboard/faturistas/${encodeURIComponent(chave)}/cubo${qs}`),
    staleTime: 60_000,
  });
}

export function useDashboardFaturista(
  faturistaId: string | null,
  filtros: DashboardFiltros,
  enabled: boolean
) {
  return useQuery({
    ...faturistaCuboQuery(faturistaId, filtros),
    enabled,
    // Mantém os números anteriores na tela ao trocar de filtro global, até a resposta chegar.
    placeholderData: keepPreviousData,
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