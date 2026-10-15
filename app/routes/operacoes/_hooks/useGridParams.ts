import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

// Estado da grid na URL: ordenação, busca e filtros por coluna. O link guarda a visão, e o voltar do
// navegador desfaz o último filtro. Seleção e edição ficam fora: valem só enquanto a tela está aberta.

export type TipoFiltro =
  "contains" | "equals" | "blank" | "notBlank" | "period" | "antigos" | "duplicados";

export type FiltroColuna = { tipo: TipoFiltro; valor: string };

export type GridParams = {
  sort?: string;
  search?: string;
  filtros: Record<string, FiltroColuna>;
};

const SEM_VALOR: TipoFiltro[] = ["blank", "notBlank", "antigos", "duplicados"];

export function filtroAtivo(filtro: FiltroColuna | undefined) {
  if (!filtro) return false;
  if (SEM_VALOR.includes(filtro.tipo)) return true;
  if (filtro.tipo === "period") return filtro.valor.split(";").some(Boolean);
  return filtro.valor.trim() !== "";
}

// ?filtro=coluna:tipo:valor, repetível: o mesmo formato que a API recebe.
function parseFiltros(raw: string[]) {
  const filtros: Record<string, FiltroColuna> = {};
  for (const item of raw) {
    const [key, tipo, ...resto] = item.split(":");
    if (key && tipo) filtros[key] = { tipo: tipo as TipoFiltro, valor: resto.join(":") };
  }
  return filtros;
}

export function filtrosParaApi(filtros: Record<string, FiltroColuna>) {
  return Object.entries(filtros)
    .filter(([, filtro]) => filtroAtivo(filtro))
    .map(([key, filtro]) => `${key}:${filtro.tipo}:${filtro.valor}`);
}

export function useGridParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtroRaw = searchParams.getAll("filtro").join("\n");

  const params = useMemo<GridParams>(
    () => ({
      sort: searchParams.get("sort") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      filtros: parseFiltros(filtroRaw ? filtroRaw.split("\n") : []),
    }),
    [searchParams, filtroRaw],
  );

  const update = useCallback(
    (change: (next: URLSearchParams) => void) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          change(next);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const setSort = useCallback(
    (sort: string | null) =>
      update((next) => (sort ? next.set("sort", sort) : next.delete("sort"))),
    [update],
  );

  const setSearch = useCallback(
    (search: string) =>
      update((next) => (search ? next.set("search", search) : next.delete("search"))),
    [update],
  );

  // Filtro vazio sai da URL; os outros ficam na ordem em que estavam.
  const setFiltro = useCallback(
    (key: string, filtro: FiltroColuna | null) =>
      update((next) => {
        const atuais = parseFiltros(next.getAll("filtro"));
        if (filtro) atuais[key] = filtro;
        else delete atuais[key];
        next.delete("filtro");
        for (const [coluna, item] of Object.entries(atuais)) {
          next.append("filtro", `${coluna}:${item.tipo}:${item.valor}`);
        }
      }),
    [update],
  );

  const clearFiltros = useCallback(
    () =>
      update((next) => {
        next.delete("filtro");
        next.delete("search");
      }),
    [update],
  );

  return { params, setSort, setSearch, setFiltro, clearFiltros };
}
