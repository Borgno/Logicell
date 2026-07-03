import type { LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";
import { OperacoesView } from "~/views/OperacoesView";

export const shouldRevalidate = ({ formData, defaultShouldRevalidate }: any) => {
  if (formData?.get("intent") === "update") return false;
  return defaultShouldRevalidate;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  
  const resultadoPromise = OperacaoService.listarOperacoesLocal(params);
  const agenciasPromise = OperacaoService.buscarAgencias();

  return data({ 
    dadosPromise: resultadoPromise, 
    agenciasPromise,
    nomePasta: "Caixa de Entrada" 
  }, { headers: response.headers });
}

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Algo deu errado." />;
}

export default function Inbox() {
  const { dadosPromise, agenciasPromise, nomePasta } = useLoaderData<typeof loader>();

  return (
    <OperacoesView 
      dadosPromise={dadosPromise}
      agenciasPromise={agenciasPromise}
      nomePasta={nomePasta}
      showImport={true}
    />
  );
}