import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "~/components/layout/PageHeader";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { DataTable, type Column } from "~/components/patterns/DataTable";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/config/app";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { useListParams } from "~/hooks/useListParams";
import { ApiError } from "~/lib/api";
import { meQuery } from "~/lib/auth";
import { formatDateTime } from "~/lib/format";
import type { Route } from "./+types/route";
import { ImportarDialog } from "./_components/ImportarDialog";
import { importacoesQuery, PAGE_SIZE, useDesfazerImportacao, type Importacao } from "./_hooks";

export const meta: Route.MetaFunction = () => [{ title: `Importações | ${APP_NAME}` }];

function DesfazerButton({ importacao }: { importacao: Importacao }) {
  const confirm = useConfirm();
  const desfazer = useDesfazerImportacao();

  async function handleClick() {
    const ok = await confirm({
      title: `Voltar para ${importacao.nomeArquivo}?`,
      description:
        "Pastas, regras e operações voltam a ser como eram logo depois desta importação. As importações seguintes e tudo o que foi feito depois delas são desfeitos.",
      confirmLabel: "Desfazer",
      variant: "destructive",
    });
    if (!ok) return;
    desfazer.mutate(importacao.id, {
      onSuccess: ({ importacoesDesfeitas }) =>
        toast.success("Importações desfeitas", {
          description: `${importacoesDesfeitas} ${importacoesDesfeitas === 1 ? "importação desfeita" : "importações desfeitas"}.`,
        }),
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(event) => {
        event.stopPropagation();
        void handleClick();
      }}
      disabled={desfazer.isPending}
    >
      <RotateCcw />
      Voltar para esta
    </Button>
  );
}

// Histórico de importações. Supervisor e admin podem voltar o sistema para uma importação anterior.
export default function ImportacoesPage() {
  const { searchParams, set } = useListParams();
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const list = useQuery(importacoesQuery({ search: search || undefined, page }));
  const { data: me } = useQuery(meQuery);
  const podeDesfazer = me?.role === "admin" || me?.role === "gestor";
  const [importando, setImportando] = useState(false);

  const [searchInput, setSearchInput] = useState(search);
  const debounced = useDebouncedValue(searchInput.trim());
  useEffect(() => {
    if (debounced !== search) set({ search: debounced });
  }, [debounced, search, set]);

  const columns: Column<Importacao>[] = [
    {
      key: "arquivo",
      header: "Arquivo",
      cell: (item) => (
        <span className="flex items-center gap-2 font-bold">
          <FileSpreadsheet size={16} className="shrink-0 text-primary" />
          {item.nomeArquivo}
        </span>
      ),
    },
    { key: "usuario", header: "Importada por", cell: (item) => item.usuario },
    {
      key: "linhas",
      header: "Linhas",
      className: "text-right",
      cell: (item) => (
        <span className="font-mono">{item.qtdRegistros.toLocaleString("pt-BR")}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Quando",
      cell: (item) => <span className="font-mono text-xs">{formatDateTime(item.createdAt)}</span>,
    },
    {
      key: "acoes",
      header: "",
      className: "text-right",
      cell: (item) =>
        podeDesfazer && item.podeDesfazer ? (
          <DesfazerButton importacao={item} />
        ) : page === 1 && list.data?.data[0]?.id === item.id && !search ? (
          <span className="text-xs text-muted-foreground">Versão atual</span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Importações"
        description="As planilhas importadas, das mais recentes para as mais antigas."
        actions={
          <Button variant="solid" onClick={() => setImportando(true)}>
            <Upload />
            Importar planilha
          </Button>
        }
      />
      <DataTable
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Buscar por arquivo ou pessoa",
        }}
        columns={columns}
        rows={list.data?.data}
        rowKey={(item) => String(item.id)}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={
          list.data && {
            page,
            pageSize: PAGE_SIZE,
            total: list.data.meta.total,
            onPageChange: (next) => set({ page: String(next) }),
          }
        }
        empty={{
          icon: FileSpreadsheet,
          title: "Nenhuma importação",
          description: search ? "Ajuste a busca." : "Importe a primeira planilha do ERP.",
        }}
      />
      <ImportarDialog open={importando} onOpenChange={setImportando} />
    </>
  );
}
