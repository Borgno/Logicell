import { useQuery } from "@tanstack/react-query";
import { Folder, FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "~/components/layout/PageHeader";
import { ColorFilter } from "~/components/pastas/ColorFilter";
import { PastaFormDialog } from "~/components/pastas/PastaFormDialog";
import { DataTable, type Column } from "~/components/patterns/DataTable";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/config/app";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { useListParams } from "~/hooks/useListParams";
import { meQuery } from "~/lib/auth";
import { DEFAULT_PASTA_COLOR, pastasSearchQuery } from "~/lib/pastas";
import type { Pasta } from "~/types/pasta";
import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => [{ title: `Pastas | ${APP_NAME}` }];

const columns: Column<Pasta>[] = [
  {
    key: "nome",
    header: "Nome",
    cell: (pasta) => (
      <span className="flex items-center gap-2 font-bold">
        <Folder
          size={16}
          className="shrink-0"
          style={{ color: pasta.cor ?? DEFAULT_PASTA_COLOR }}
          fill={`${pasta.cor ?? DEFAULT_PASTA_COLOR}33`}
        />
        {pasta.nome}
      </span>
    ),
  },
  {
    key: "faturista",
    header: "Faturista",
    cell: (pasta) =>
      pasta.faturista?.fullName ?? <span className="text-muted-foreground">Sem faturista</span>,
  },
];

// Todas as pastas numa tabela: é por aqui que o celular, sem a sidebar, chega a uma pasta.
export default function PastasPage() {
  const navigate = useNavigate();
  const { searchParams, set } = useListParams();
  const search = searchParams.get("search") ?? "";
  const cor = searchParams.get("cor");
  const { data: me } = useQuery(meQuery);
  const [creating, setCreating] = useState(false);

  const list = useQuery(pastasSearchQuery(search, cor));

  const [searchInput, setSearchInput] = useState(search);
  const debounced = useDebouncedValue(searchInput.trim());
  useEffect(() => {
    if (debounced !== search) set({ search: debounced });
  }, [debounced, search, set]);

  return (
    <>
      <PageHeader
        title="Pastas"
        description="Onde as operações ficam organizadas, cada uma com o seu faturista."
        actions={
          <Button variant="solid" onClick={() => setCreating(true)}>
            <FolderPlus />
            Nova pasta
          </Button>
        }
      />
      <DataTable
        search={{ value: searchInput, onChange: setSearchInput, placeholder: "Buscar por nome" }}
        filters={<ColorFilter value={cor} onChange={(value) => set({ cor: value })} />}
        columns={columns}
        rows={list.data?.data}
        rowKey={(pasta) => String(pasta.id)}
        rowLabel={(pasta) => `Abrir ${pasta.nome}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(pasta) => navigate(`/pastas/${pasta.id}`)}
        empty={{
          icon: Folder,
          title: "Nenhuma pasta encontrada",
          description:
            search || cor ? "Ajuste a busca ou a cor." : "Crie a primeira pasta para começar.",
        }}
      />
      <PastaFormDialog
        open={creating}
        onOpenChange={setCreating}
        canSetFaturista={me?.role !== "user"}
        onSaved={(pasta) => navigate(`/pastas/${pasta.id}`)}
      />
    </>
  );
}
