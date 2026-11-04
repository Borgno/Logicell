import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DrawerSection, EntityDrawer } from "~/components/patterns/EntityDrawer";
import { FormField } from "~/components/patterns/FormField";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { ApiError } from "~/lib/api";
import { applyApiErrors } from "~/lib/forms";
import { cn } from "~/lib/utils";
import type { PastaComRegras, Regra, TipoRegra } from "~/types/pasta";
import { useCreateRegra, useDeleteRegra } from "../_hooks";

export const TIPO_LABELS: Record<TipoRegra, string> = {
  cliente: "Cliente",
  agencia: "Agência",
  produto: "Produto",
};

const TIPO_HINTS: Record<TipoRegra, string> = {
  cliente: "Pagador da operação. Tem precedência sobre a agência.",
  agencia: "Agência no formato da planilha, como MATRIZ - SP.",
  produto: "Com produto, a pasta só recebe operações desse produto.",
};

const schema = z.object({
  tipo: z.enum(["cliente", "agencia", "produto"]),
  valor: z.string().trim().min(1, "Informe o valor.").max(200, "Use no máximo 200 caracteres."),
});
type Values = z.infer<typeof schema>;

function RegraChip({ regra }: { regra: Regra }) {
  const remove = useDeleteRegra();
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold",
        regra.conflito ? "border-warning bg-warning/10" : "bg-muted",
      )}
    >
      {regra.conflito && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle size={12} className="text-warning" aria-label="Em conflito" />
          </TooltipTrigger>
          <TooltipContent>
            Outra pasta disputa as mesmas operações: elas vão para a Caixa de Entrada.
          </TooltipContent>
        </Tooltip>
      )}
      <span>{regra.valor}</span>
      <button
        type="button"
        aria-label={`Remover ${regra.valor}`}
        disabled={remove.isPending}
        onClick={() =>
          remove.mutate(regra.id, {
            onError: (error) => error instanceof ApiError && toast.error(error.message),
          })
        }
        className="rounded text-muted-foreground hover:text-destructive"
      >
        <X size={12} />
      </button>
    </li>
  );
}

function AddRegraForm({ pastaId }: { pastaId: number }) {
  const mutation = useCreateRegra();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "cliente", valor: "" },
  });
  const { errors } = form.formState;
  const tipo = useWatch({ control: form.control, name: "tipo" });

  const onSubmit = form.handleSubmit((values) =>
    mutation.mutate(
      { pastaId, ...values },
      {
        onSuccess: (regra) => {
          form.reset({ tipo: values.tipo, valor: "" });
          if (regra.conflito) toast.warning("Regra adicionada, mas em conflito com outra pasta");
        },
        onError: (error) => applyApiErrors(error, form.setError, ["tipo", "valor"]),
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <FormField id="regra-tipo" label="Tipo">
        {(props) => (
          <Controller
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <SearchableSelect
                {...props}
                value={field.value}
                onChange={field.onChange}
                options={(["cliente", "agencia", "produto"] as const).map((tipo) => ({
                  value: tipo,
                  label: TIPO_LABELS[tipo],
                }))}
                searchPlaceholder="Buscar tipo..."
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id="regra-valor"
        label="Valor"
        error={errors.valor?.message}
        hint={TIPO_HINTS[tipo]}
      >
        {(props) => <Input {...props} autoComplete="off" {...form.register("valor")} />}
      </FormField>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Adicionar regra
      </Button>
    </form>
  );
}

export function RegrasDrawer({
  pasta,
  onClose,
}: {
  pasta: PastaComRegras | undefined;
  onClose: () => void;
}) {
  return (
    <EntityDrawer
      open={pasta !== undefined}
      onOpenChange={(open) => !open && onClose()}
      title={pasta?.nome ?? "Pasta"}
      description="Regras de roteamento da importação"
    >
      {pasta && (
        <>
          {(["cliente", "agencia", "produto"] as const).map((tipo) => {
            const regras = pasta.regras.filter((regra) => regra.tipo === tipo);
            return (
              <DrawerSection key={tipo} title={TIPO_LABELS[tipo]}>
                {regras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma regra.</p>
                ) : (
                  <ul
                    className="flex flex-wrap gap-2"
                    aria-label={`Regras de ${TIPO_LABELS[tipo]}`}
                  >
                    {regras.map((regra) => (
                      <RegraChip key={regra.id} regra={regra} />
                    ))}
                  </ul>
                )}
              </DrawerSection>
            );
          })}
          <DrawerSection title="Adicionar regra">
            <AddRegraForm key={pasta.id} pastaId={pasta.id} />
          </DrawerSection>
        </>
      )}
    </EntityDrawer>
  );
}
