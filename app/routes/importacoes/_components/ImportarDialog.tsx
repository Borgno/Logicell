import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "~/components/patterns/FormField";
import { FormDialog } from "~/components/patterns/FormDialog";
import { ApiError } from "~/lib/api";
import { cn } from "~/lib/utils";
import { useImportarPlanilha, type ModoImportacao } from "../_hooks";

const MODOS: { value: ModoImportacao; label: string; descricao: string }[] = [
  {
    value: "SUBSTITUIR",
    label: "Substituir",
    descricao:
      "Apaga as operações que não estão na planilha nova e adiciona as que faltam. As que continuam ficam como estão, com pasta, status e observação.",
  },
  {
    value: "ADICIONAR",
    label: "Apenas adicionar",
    descricao: "Só adiciona as operações novas. Nada é apagado, e as repetidas são ignoradas.",
  },
];

const plural = (n: number, um: string, varios: string) =>
  `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

export function ImportarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useImportarPlanilha();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modo, setModo] = useState<ModoImportacao>("SUBSTITUIR");
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setArquivo(null);
      setModo("SUBSTITUIR");
      setErroArquivo(null);
      mutation.reset();
    }
    onOpenChange(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!arquivo) {
      setErroArquivo("Escolha a planilha.");
      return;
    }
    mutation.mutate(
      { arquivo, modo },
      {
        onSuccess: (resultado) => {
          const partes = [
            plural(resultado.adicionadas, "nova", "novas"),
            plural(resultado.ignoradas, "já existia", "já existiam"),
          ];
          if (resultado.modo === "SUBSTITUIR") {
            partes.push(plural(resultado.removidas, "removida", "removidas"));
          }
          toast.success("Planilha importada", { description: partes.join(", ") + "." });
          handleOpenChange(false);
        },
      },
    );
  }

  const erro = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Importar planilha"
      description="A planilha do ERP, em .xls ou .xlsx. As regras de automação mandam cada operação nova para a pasta dela."
      submitLabel={mutation.isPending ? "Importando..." : "Importar"}
      isPending={mutation.isPending}
      onSubmit={onSubmit}
    >
      <div className="space-y-1.5">
        <label
          htmlFor="importar-arquivo"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm transition-colors duration-200 ease-ui hover:border-primary/50",
            erroArquivo && "border-destructive",
          )}
        >
          <FileSpreadsheet className="shrink-0 text-primary" />
          <span className="min-w-0 truncate">
            {arquivo ? arquivo.name : "Escolher planilha .xls ou .xlsx"}
          </span>
        </label>
        <input
          id="importar-arquivo"
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          aria-label="Planilha"
          onChange={(event) => {
            setArquivo(event.target.files?.[0] ?? null);
            setErroArquivo(null);
          }}
        />
        {erroArquivo && (
          <p role="alert" className="text-xs font-bold text-destructive">
            {erroArquivo}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-bold">Modo</legend>
        {MODOS.map((opcao) => (
          <label
            key={opcao.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors duration-200 ease-ui",
              modo === opcao.value ? "border-primary bg-primary/5" : "hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name="modo"
              value={opcao.value}
              checked={modo === opcao.value}
              onChange={() => setModo(opcao.value)}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="block text-sm font-bold">{opcao.label}</span>
              <span className="block text-xs text-muted-foreground">{opcao.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {erro && <FormAlert>{erro}</FormAlert>}
    </FormDialog>
  );
}
