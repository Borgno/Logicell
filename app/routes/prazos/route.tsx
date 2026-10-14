import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "~/components/layout/PageHeader";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { EmptyState, ErrorState } from "~/components/patterns/EmptyState";
import { FormField } from "~/components/patterns/FormField";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
import { applyApiErrors } from "~/lib/forms";
import { queryClient } from "~/lib/queryClient";
import type { PrazoCliente } from "~/types/pasta";
import type { Route } from "./+types/route";
import { PrazoClienteDialog, prazoDiasSchema } from "./_components/PrazoClienteDialog";
import { prazosQuery, useDeletePrazoCliente, useSetPadrao } from "./_hooks";

export const meta: Route.MetaFunction = () => [{ title: `Prazos de emissão | ${APP_NAME}` }];

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request }) => {
    await requireRole(request, "admin", "gestor");
  },
];

export async function clientLoader() {
  void queryClient.prefetchQuery(prazosQuery);
  return null;
}

// Mesmo cabeçalho do DataTable.
const HEAD = "h-11 text-[10px] font-bold tracking-widest text-muted-foreground uppercase";

const padraoSchema = z.object({ prazoDias: prazoDiasSchema });

function PadraoForm({ padraoDias }: { padraoDias: number }) {
  const mutation = useSetPadrao();
  const form = useForm<z.input<typeof padraoSchema>, unknown, z.output<typeof padraoSchema>>({
    resolver: zodResolver(padraoSchema),
    defaultValues: { prazoDias: padraoDias },
  });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    form.reset({ prazoDias: padraoDias });
  }, [form, padraoDias]);

  const onSubmit = form.handleSubmit((values) =>
    mutation.mutate(values.prazoDias, {
      onSuccess: () => toast.success("Prazo padrão salvo"),
      onError: (error) => applyApiErrors(error, form.setError, ["prazoDias"]),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <FormField id="padrao-dias" label="Dias" error={errors.prazoDias?.message}>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              {...form.register("prazoDias")}
            />
          )}
        </FormField>
      </div>
      <Button type="submit" disabled={!isDirty || mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Salvar
      </Button>
    </form>
  );
}

function PrazoRow({ prazo, onEdit }: { prazo: PrazoCliente; onEdit: () => void }) {
  const confirm = useConfirm();
  const remove = useDeletePrazoCliente(prazo.id);

  async function handleDelete() {
    const ok = await confirm({
      title: `Remover a exceção de ${prazo.cliente}?`,
      description: "O cliente volta a usar o prazo padrão.",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(undefined, {
      onSuccess: () => toast.success("Exceção removida"),
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  return (
    <TableRow>
      {/* O nome quebra linha: no celular, a coluna do prazo e as ações cabem sem rolar de lado. */}
      <TableCell className="font-bold whitespace-normal">{prazo.cliente}</TableCell>
      <TableCell className="font-mono">{prazo.prazoDias} dias</TableCell>
      <TableCell className="pr-0 text-right">
        <Button variant="ghost" size="icon" aria-label={`Editar ${prazo.cliente}`} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remover ${prazo.cliente}`}
          onClick={handleDelete}
          disabled={remove.isPending}
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function PrazosPage() {
  const { data, isLoading, error, refetch } = useQuery(prazosQuery);
  const [dialog, setDialog] = useState<{ prazo?: PrazoCliente } | null>(null);

  return (
    <>
      <PageHeader
        title="Prazos de emissão"
        description="Operação emitida há mais dias que o prazo do cliente aparece como emissão antiga."
        actions={
          <Button variant="solid" onClick={() => setDialog({})}>
            <Plus />
            Nova exceção
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-1 text-sm font-bold">Prazo padrão</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Vale para todo cliente sem exceção.
            </p>
            <PadraoForm padraoDias={data.padraoDias} />
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-4 text-sm font-bold">Exceções por cliente</h2>
            {data.clientes.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhuma exceção"
                description="Todos os clientes usam o prazo padrão."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={HEAD}>Cliente</TableHead>
                    <TableHead className={HEAD}>Prazo</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clientes.map((prazo) => (
                    <PrazoRow key={prazo.id} prazo={prazo} onEdit={() => setDialog({ prazo })} />
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}
      <PrazoClienteDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        prazo={dialog?.prazo}
      />
    </>
  );
}
