import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ListChecks, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "~/components/layout/PageHeader";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { EmptyState, ErrorState } from "~/components/patterns/EmptyState";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { APP_NAME } from "~/config/app";
import { ApiError } from "~/lib/api";
import { requireRole } from "~/lib/auth";
import { queryClient } from "~/lib/queryClient";
import { statusQuery } from "~/lib/status";
import type { StatusOperacao } from "~/types/status";
import type { Route } from "./+types/route";
import { StatusDialog } from "./_components/StatusDialog";
import { useDeleteStatus, useReorderStatus, useUpdateStatus } from "./_hooks";

export const meta: Route.MetaFunction = () => [{ title: `Status | ${APP_NAME}` }];

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request }) => {
    await requireRole(request, "admin", "gestor");
  },
];

export async function clientLoader() {
  void queryClient.prefetchQuery(statusQuery);
  return null;
}

// Mesmo cabeçalho do DataTable.
const HEAD = "h-11 text-[10px] font-bold tracking-widest text-muted-foreground uppercase";

const mostrarErro = (error: unknown) => error instanceof ApiError && toast.error(error.message);

type StatusRowProps = {
  status: StatusOperacao;
  onRename: () => void;
  onMove: (direcao: -1 | 1) => void;
  podeSubir: boolean;
  podeDescer: boolean;
  movendo: boolean;
};

function StatusRow({ status, onRename, onMove, podeSubir, podeDescer, movendo }: StatusRowProps) {
  const confirm = useConfirm();
  const update = useUpdateStatus(status.id);
  const remove = useDeleteStatus(status.id);

  function alternarAtivo() {
    update.mutate(
      { ativo: !status.ativo },
      {
        onSuccess: () => toast.success(status.ativo ? "Status desativado" : "Status ativado"),
        onError: mostrarErro,
      },
    );
  }

  async function excluir() {
    const ok = await confirm({
      title: `Excluir ${status.nome}?`,
      description: "Só sai status que nenhuma operação usa. O que está em uso, desative.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(undefined, {
      onSuccess: () => toast.success("Status excluído"),
      onError: mostrarErro,
    });
  }

  return (
    <TableRow>
      <TableCell className="w-20 pl-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Subir ${status.nome}`}
          disabled={!podeSubir || movendo}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Descer ${status.nome}`}
          disabled={!podeDescer || movendo}
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
      </TableCell>
      {/* O nome quebra linha: no celular, as ações cabem sem rolar de lado. */}
      <TableCell className="font-bold whitespace-normal">{status.nome}</TableCell>
      <TableCell>
        {status.ativo ? (
          <Badge variant="outline">Ativo</Badge>
        ) : (
          <Badge variant="destructive">Inativo</Badge>
        )}
      </TableCell>
      <TableCell className="pr-0 text-right whitespace-nowrap">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Renomear ${status.nome}`}
          onClick={onRename}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${status.ativo ? "Desativar" : "Ativar"} ${status.nome}`}
          onClick={alternarAtivo}
          disabled={update.isPending}
        >
          <Power />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Excluir ${status.nome}`}
          onClick={excluir}
          disabled={remove.isPending}
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function StatusPage() {
  const { data, isLoading, error, refetch } = useQuery(statusQuery);
  const reorder = useReorderStatus();
  const [dialog, setDialog] = useState<{ status?: StatusOperacao } | null>(null);

  function mover(indice: number, direcao: -1 | 1) {
    if (!data) return;
    const ids = data.map((status) => status.id);
    const [movido] = ids.splice(indice, 1);
    ids.splice(indice + direcao, 0, movido);
    reorder.mutate(ids, { onError: mostrarErro });
  }

  return (
    <>
      <PageHeader
        title="Status"
        description="As opções do status das operações, na ordem em que aparecem na grid."
        actions={
          <Button variant="solid" onClick={() => setDialog({})}>
            <Plus />
            Novo status
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <section className="rounded-2xl border bg-card p-6">
          <p className="mb-4 text-xs text-muted-foreground">
            Status inativo sai das opções da grid, mas continua nas operações que já o usam, marcado
            para troca.
          </p>
          {data.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nenhum status"
              description="Crie as opções que a grid vai oferecer."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`${HEAD} pl-0`}>Ordem</TableHead>
                  <TableHead className={HEAD}>Nome</TableHead>
                  <TableHead className={HEAD}>Situação</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((status, indice) => (
                  <StatusRow
                    key={status.id}
                    status={status}
                    onRename={() => setDialog({ status })}
                    onMove={(direcao) => mover(indice, direcao)}
                    podeSubir={indice > 0}
                    podeDescer={indice < data.length - 1}
                    movendo={reorder.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
      <StatusDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        status={dialog?.status}
      />
    </>
  );
}
