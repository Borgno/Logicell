import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert, FormField } from "~/components/patterns/FormField";
import { FormDialog } from "~/components/patterns/FormDialog";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Input } from "~/components/ui/input";
import { ApiError } from "~/lib/api";
import { applyApiErrors } from "~/lib/forms";
import {
  DEFAULT_PASTA_COLOR,
  faturistasQuery,
  PASTA_COLORS,
  useCreatePasta,
  useUpdatePasta,
  type PastaInput,
} from "~/lib/pastas";
import { cn } from "~/lib/utils";
import type { Pasta } from "~/types/pasta";

const NO_FATURISTA = "none";

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(100, "Use no máximo 100 caracteres."),
  cor: z.string(),
  faturistaId: z.string(),
});
type Values = z.infer<typeof schema>;

const FIELDS = ["nome", "cor", "faturistaId"] as const;

function defaults(pasta?: Pasta): Values {
  return {
    nome: pasta?.nome ?? "",
    cor: pasta?.cor ?? DEFAULT_PASTA_COLOR,
    faturistaId: pasta?.faturista?.id ?? NO_FATURISTA,
  };
}

type PastaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sem pasta, cria; com pasta, edita.
  pasta?: Pasta;
  // Só supervisor e admin vinculam faturista; para os outros o campo nem aparece.
  canSetFaturista: boolean;
  onSaved?: (pasta: Pasta) => void;
};

export function PastaFormDialog({
  open,
  onOpenChange,
  pasta,
  canSetFaturista,
  onSaved,
}: PastaFormDialogProps) {
  const create = useCreatePasta();
  const update = useUpdatePasta(pasta?.id ?? 0);
  const mutation = pasta ? update : create;
  const { data: faturistas = [] } = useQuery({
    ...faturistasQuery,
    enabled: open && canSetFaturista,
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(pasta) });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(pasta));
  }, [open, pasta, form]);

  function handleOpenChange(next: boolean) {
    if (!next) mutation.reset();
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit((values) => {
    const input: PastaInput = { nome: values.nome, cor: values.cor };
    if (canSetFaturista) {
      input.faturistaId = values.faturistaId === NO_FATURISTA ? null : values.faturistaId;
    }
    mutation.mutate(input, {
      onSuccess: (saved) => {
        toast.success(pasta ? "Pasta salva" : "Pasta criada");
        onSaved?.(saved);
        handleOpenChange(false);
      },
      onError: (error) => applyApiErrors(error, form.setError, FIELDS),
    });
  });

  const generalError =
    mutation.error instanceof ApiError && !mutation.error.problem.errors
      ? mutation.error.message
      : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={pasta ? "Editar pasta" : "Nova pasta"}
      submitLabel={pasta ? "Salvar" : "Criar pasta"}
      isPending={mutation.isPending}
      onSubmit={onSubmit}
    >
      <FormField id="pasta-nome" label="Nome" error={errors.nome?.message}>
        {(props) => <Input {...props} autoComplete="off" {...form.register("nome")} />}
      </FormField>

      <Controller
        control={form.control}
        name="cor"
        render={({ field }) => (
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-bold">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {PASTA_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.label}
                  aria-pressed={field.value === color.value}
                  onClick={() => field.onChange(color.value)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform duration-200 ease-ui",
                    field.value === color.value
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      {canSetFaturista && (
        <FormField id="pasta-faturista" label="Faturista" error={errors.faturistaId?.message}>
          {(props) => (
            <Controller
              control={form.control}
              name="faturistaId"
              render={({ field }) => (
                <SearchableSelect
                  {...props}
                  value={field.value}
                  onChange={field.onChange}
                  options={[{ value: NO_FATURISTA, label: "Sem faturista" }, ...faturistas]}
                  searchPlaceholder="Buscar usuário..."
                />
              )}
            />
          )}
        </FormField>
      )}

      {generalError && <FormAlert>{generalError}</FormAlert>}
    </FormDialog>
  );
}
