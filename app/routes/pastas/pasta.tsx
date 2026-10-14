import { useQuery } from "@tanstack/react-query";
import { Folder, Pencil, Table2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "~/components/layout/PageHeader";
import { PastaFormDialog } from "~/components/pastas/PastaFormDialog";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { EmptyState } from "~/components/patterns/EmptyState";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/config/app";
import { ApiError } from "~/lib/api";
import { meQuery } from "~/lib/auth";
import { pastasQuery, useDeletePasta } from "~/lib/pastas";
import type { Pasta } from "~/types/pasta";
import type { Route } from "./+types/pasta";

export const meta: Route.MetaFunction = () => [{ title: `Pasta | ${APP_NAME}` }];

function PastaActions({ pasta, canSetFaturista }: { pasta: Pasta; canSetFaturista: boolean }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const remove = useDeletePasta(pasta.id);
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir ${pasta.nome}?`,
      description:
        "As operações desta pasta e as regras de automação dela são apagadas junto. Não dá para desfazer.",
      confirmLabel: "Excluir pasta",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Pasta excluída");
        navigate("/pastas", { replace: true });
      },
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil />
        Editar
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
        <Trash2 />
        Excluir
      </Button>
      <PastaFormDialog
        open={editing}
        onOpenChange={setEditing}
        pasta={pasta}
        canSetFaturista={canSetFaturista}
      />
    </>
  );
}

// Cabeçalho da pasta com editar e excluir. A grid de operações entra aqui no E5.
export default function PastaPage({ params }: Route.ComponentProps) {
  const { data: me } = useQuery(meQuery);
  const { data: pastas, isLoading } = useQuery(pastasQuery);
  const pasta = pastas?.find((item) => item.id === Number(params.id));

  if (isLoading) return null;
  if (!pasta) {
    return (
      <EmptyState
        icon={Folder}
        title="Pasta não encontrada"
        description="Ela pode ter sido excluída por outra pessoa."
      />
    );
  }

  return (
    <>
      <PageHeader
        title={pasta.nome}
        description={pasta.faturista ? `Faturista: ${pasta.faturista.fullName}` : "Sem faturista"}
        actions={<PastaActions pasta={pasta} canSetFaturista={me?.role !== "user"} />}
      />
      <EmptyState
        icon={Table2}
        title="Operações da pasta"
        description="A grid de operações entra na próxima etapa da reconstrução."
      />
    </>
  );
}
