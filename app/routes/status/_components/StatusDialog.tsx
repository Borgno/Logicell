import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert, FormField } from "~/components/patterns/FormField";
import { FormDialog } from "~/components/patterns/FormDialog";
import { Input } from "~/components/ui/input";
import { ApiError } from "~/lib/api";
import { applyApiErrors } from "~/lib/forms";
import type { StatusOperacao } from "~/types/status";
import { useCreateStatus, useUpdateStatus } from "../_hooks";

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do status.")
    .max(60, "Use no máximo 60 caracteres."),
});
type FormValues = z.infer<typeof schema>;

type StatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sem status, cria no fim da lista; com status, renomeia.
  status?: StatusOperacao;
};

export function StatusDialog({ open, onOpenChange, status }: StatusDialogProps) {
  const create = useCreateStatus();
  const update = useUpdateStatus(status?.id ?? 0);
  const mutation = status ? update : create;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: status?.nome ?? "" },
  });

  useEffect(() => {
    if (open) form.reset({ nome: status?.nome ?? "" });
  }, [open, status, form]);

  function handleOpenChange(next: boolean) {
    if (!next) mutation.reset();
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit(({ nome }) => {
    const onError = (error: unknown) => applyApiErrors(error, form.setError, ["nome"]);
    const onSuccess = () => {
      toast.success(status ? "Status renomeado" : "Status criado");
      handleOpenChange(false);
    };
    if (status) update.mutate({ nome }, { onSuccess, onError });
    else create.mutate(nome, { onSuccess, onError });
  });

  const generalError =
    mutation.error instanceof ApiError && !mutation.error.problem.errors
      ? mutation.error.message
      : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={status ? `Renomear ${status.nome}` : "Novo status"}
      description={
        status
          ? "As operações com o nome atual passam para o nome novo."
          : "Entra no fim da lista, ativo."
      }
      submitLabel={status ? "Renomear" : "Criar status"}
      isPending={mutation.isPending}
      onSubmit={onSubmit}
    >
      <FormField id="status-nome" label="Nome" error={form.formState.errors.nome?.message}>
        {(props) => <Input {...props} autoComplete="off" {...form.register("nome")} />}
      </FormField>
      {generalError && <FormAlert>{generalError}</FormAlert>}
    </FormDialog>
  );
}
