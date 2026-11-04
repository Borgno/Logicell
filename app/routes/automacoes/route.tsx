import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Folder, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "~/components/layout/PageHeader";
import { ColorFilter } from "~/components/pastas/ColorFilter";
import { EmptyState, ErrorState } from "~/components/patterns/EmptyState";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { APP_NAME } from "~/config/app";
import { useListParams } from "~/hooks/useListParams";
import { requireRole } from "~/lib/auth";
import { DEFAULT_PASTA_COLOR, normalizeSearch } from "~/lib/pastas";
import { queryClient } from "~/lib/queryClient";
import type { Route } from "./+types/route";
import { RegrasDrawer } from "./_components/RegrasDrawer";
import { regrasQuery } from "./_hooks";

export const meta: Route.MetaFunction = () => [{ title: `Automações | ${APP_NAME}` }];

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request }) => {
    await requireRole(request, "admin", "gestor");
  },
];

export async function clientLoader() {
  void queryClient.prefetchQuery(regrasQuery);
  return null;
}

export default function AutomacoesPage() {
  const { data: pastas, isLoading, error, refetch } = useQuery(regrasQuery);
  const { searchParams, set } = useListParams();
  const [search, setSearch] = useState("");
  const [color, setColor] = useState<string | null>(null);

  // A pasta entra pelo nome ou pelo valor de qualquer regra; as regras que bateram aparecem no card,
  // para mostrar por que ela está na lista.
  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    return (pastas ?? []).flatMap((pasta) => {
      if (color && (pasta.cor ?? DEFAULT_PASTA_COLOR) !== color) return [];
      if (!query || normalizeSearch(pasta.nome).includes(query)) {
        return [{ pasta, regrasEncontradas: [] as string[] }];
      }
      const regrasEncontradas = pasta.regras
        .map((regra) => regra.valor)
        .filter((valor) => normalizeSearch(valor).includes(query));
      return regrasEncontradas.length > 0 ? [{ pasta, regrasEncontradas }] : [];
    });
  }, [pastas, search, color]);
  const selected = pastas?.find((pasta) => String(pasta.id) === searchParams.get("pastaId"));

  return (
    <>
      <PageHeader
        title="Automações"
        description="Regras que levam cada operação importada para a pasta certa."
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pasta, agência, cliente ou produto"
            aria-label="Buscar pasta, agência, cliente ou produto"
            className="pl-9"
          />
        </div>
        <ColorFilter value={color} onChange={setColor} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Nenhuma pasta encontrada"
          description={
            search || color ? "Ajuste a busca ou a cor." : "Crie pastas para configurar as regras."
          }
        />
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
          aria-label="Pastas"
        >
          {filtered.map(({ pasta, regrasEncontradas }) => {
            const color = pasta.cor ?? DEFAULT_PASTA_COLOR;
            const conflitos = pasta.regras.filter((regra) => regra.conflito).length;
            // Card no visual do sistema antigo: fundo e borda no tom da pasta, ícone no centro e o
            // número de regras no canto.
            return (
              <li key={pasta.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => set({ pastaId: String(pasta.id) }, { resetPage: false })}
                  className="group relative flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border shadow-card transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: `${color}0A`, borderColor: `${color}33` }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ border: `1px solid ${color}` }}
                  />
                  {conflitos > 0 && (
                    <span
                      className="absolute top-2 left-2 text-warning"
                      title={`${conflitos} ${conflitos === 1 ? "regra" : "regras"} em conflito`}
                    >
                      <AlertTriangle size={14} />
                    </span>
                  )}
                  {pasta.regras.length > 0 && (
                    <span
                      className="absolute top-2 right-2 flex size-[18px] items-center justify-center rounded-sm text-[9px] font-bold"
                      style={{ backgroundColor: `${color}20`, color }}
                      title={`${pasta.regras.length} ${pasta.regras.length === 1 ? "regra" : "regras"}`}
                    >
                      {pasta.regras.length}
                    </span>
                  )}
                  <Folder
                    size={24}
                    className="transition-transform group-hover:-translate-y-0.5"
                    style={{ color }}
                  />
                  <span className="w-full truncate px-3 text-center text-xs font-semibold">
                    {pasta.nome}
                  </span>
                  {regrasEncontradas.length > 0 && (
                    <span
                      className="w-full truncate px-3 text-center text-[11px] text-muted-foreground"
                      title={regrasEncontradas.join(", ")}
                    >
                      {regrasEncontradas.slice(0, 2).join(", ")}
                      {regrasEncontradas.length > 2 && ` +${regrasEncontradas.length - 2}`}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <RegrasDrawer pasta={selected} onClose={() => set({ pastaId: null }, { resetPage: false })} />
    </>
  );
}
