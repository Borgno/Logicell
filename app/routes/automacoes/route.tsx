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

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    return (pastas ?? []).filter(
      (pasta) =>
        (!query || normalizeSearch(pasta.nome).includes(query)) &&
        (!color || (pasta.cor ?? DEFAULT_PASTA_COLOR) === color),
    );
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
            placeholder="Buscar pasta"
            aria-label="Buscar pasta"
            className="pl-9"
          />
        </div>
        <ColorFilter value={color} onChange={setColor} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Pastas">
          {filtered.map((pasta) => {
            const color = pasta.cor ?? DEFAULT_PASTA_COLOR;
            const conflitos = pasta.regras.filter((regra) => regra.conflito).length;
            return (
              <li key={pasta.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => set({ pastaId: String(pasta.id) }, { resetPage: false })}
                  className="flex h-full w-full flex-col gap-2 rounded-2xl border bg-card p-4 text-left transition-colors duration-200 ease-ui hover:border-primary/50"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Folder size={16} className="shrink-0" style={{ color }} fill={`${color}33`} />
                    <span className="truncate">{pasta.nome}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {pasta.regras.length === 0
                      ? "Sem regras"
                      : `${pasta.regras.length} ${pasta.regras.length === 1 ? "regra" : "regras"}`}
                    {conflitos > 0 && (
                      <span className="flex items-center gap-1 font-bold text-warning">
                        <AlertTriangle size={12} />
                        {conflitos} em conflito
                      </span>
                    )}
                  </span>
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
