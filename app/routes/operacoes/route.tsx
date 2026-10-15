import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "~/components/layout/PageHeader";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/config/app";
import { queryClient } from "~/lib/queryClient";
import { ImportarDialog } from "../importacoes/_components/ImportarDialog";
import type { Route } from "./+types/route";
import { OperacoesGrid } from "./_components/OperacoesGrid";
import { operacaoStatsQuery, ordemColunasQuery } from "./_hooks/operacoes.queries";
import { formatarMoeda } from "./_lib/colunas";

export const meta: Route.MetaFunction = () => [{ title: `Caixa de Entrada | ${APP_NAME}` }];

export async function clientLoader() {
  void queryClient.prefetchQuery(ordemColunasQuery);
  return null;
}

// Operações sem pasta: o que a importação não conseguiu rotear, e o que alguém tirou de uma pasta.
export default function CaixaDeEntradaPage() {
  const { data: stats } = useQuery(operacaoStatsQuery);
  const [importando, setImportando] = useState(false);
  const antigas = stats?.caixaDeEntrada.emissoesAntigas ?? 0;
  return (
    <>
      <PageHeader
        title="Caixa de Entrada"
        actions={
          <Button variant="solid" onClick={() => setImportando(true)}>
            <Upload />
            Importar planilha
          </Button>
        }
        description={
          antigas > 0
            ? `${antigas.toLocaleString("pt-BR")} com emissão antiga, somando ${formatarMoeda(stats!.caixaDeEntrada.valorEmissoesAntigas)}.`
            : "Operações que ainda não têm pasta."
        }
      />
      <OperacoesGrid escopo="inbox" nome="a Caixa de Entrada" />
      <ImportarDialog open={importando} onOpenChange={setImportando} />
    </>
  );
}
