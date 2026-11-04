import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert, FormField } from "~/components/patterns/FormField";
import { FormDialog } from "~/components/patterns/FormDialog";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { ApiError } from "~/lib/api";
import { applyApiErrors } from "~/lib/forms";
import type { PrazoCliente } from "~/types/pasta";
import { sugestoesQuery, useCreatePrazoCliente, useUpdatePrazoCliente } from "../_hooks";

export const prazoDiasSchema = z.coerce
  .number({ message: "Informe o prazo em dias." })
  .int("Use um número inteiro de dias.")
  .min(1, "Use de 1 a 3650 dias.")
  .max(3650, "Use de 1 a 3650 dias.");

const schema = z.object({
  cliente: z.string().trim().min(1, "Informe o cliente.").max(200, "Use no máximo 200 caracteres."),
  prazoDias: prazoDiasSchema,
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type PrazoClienteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sem prazo, cria a exceção; com prazo, troca só os dias.
  prazo?: PrazoCliente;
};

export function PrazoClienteDialog({ open, onOpenChange, prazo }: PrazoClienteDialogProps) {
  const create = useCreatePrazoCliente();
  const update = useUpdatePrazoCliente(prazo?.id ?? 0);
  const mutation = prazo ? update : create;
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { cliente: prazo?.cliente ?? "", prazoDias: prazo?.prazoDias ?? "" },
  });
  const { errors } = form.formState;
  const cliente = useWatch({ control: form.control, name: "cliente" });
  const search = useDebouncedValue(prazo ? "" : cliente.trim());
  const { data: sugestoes = [] } = useQuery(sugestoesQuery(search));

  useEffect(() => {
    if (open) form.reset({ cliente: prazo?.cliente ?? "", prazoDias: prazo?.prazoDias ?? "" });
  }, [open, prazo, form]);

  function handleOpenChange(next: boolean) {
    if (!next) mutation.reset();
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit((values) => {
    const onError = (error: unknown) =>
      applyApiErrors(error, form.setError, ["cliente", "prazoDias"]);
    const onSuccess = () => {
      toast.success(prazo ? "Prazo salvo" : "Exceção criada");
      handleOpenChange(false);
    };
    if (prazo) update.mutate(values.prazoDias, { onSuccess, onError });
    else create.mutate(values, { onSuccess, onError });
  });

  const generalError =
    mutation.error instanceof ApiError && !mutation.error.problem.errors
      ? mutation.error.message
      : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={prazo ? `Prazo de ${prazo.cliente}` : "Nova exceção"}
      description="Operações deste cliente usam este prazo em vez do padrão."
      submitLabel={prazo ? "Salvar" : "Criar exceção"}
      isPending={mutation.isPending}
      onSubmit={onSubmit}
    >
      {!prazo && (
        <FormField
          id="prazo-cliente"
          label="Cliente"
          error={errors.cliente?.message}
          hint="Pagador como aparece nas operações. As sugestões vêm delas."
        >
          {(props) => (
            <>
              <Input
                {...props}
                list="prazo-cliente-sugestoes"
                autoComplete="off"
                {...form.register("cliente")}
              />
              <datalist id="prazo-cliente-sugestoes">
                {sugestoes.map((sugestao) => (
                  <option key={sugestao} value={sugestao} />
                ))}
              </datalist>
            </>
          )}
        </FormField>
      )}
      <FormField id="prazo-dias" label="Prazo em dias" error={errors.prazoDias?.message}>
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
      {generalError && <FormAlert>{generalError}</FormAlert>}
    </FormDialog>
  );
}
