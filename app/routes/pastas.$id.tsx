import { Suspense } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Await, data, useLoaderData } from "react-router";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";
import { PastaService } from "~/services/pasta.server";
import { OperacoesView } from "~/views/OperacoesView";

export const shouldRevalidate = ({ formData, defaultShouldRevalidate }: any) => {
  if (formData?.get("intent") === "update") return false;
  return defaultShouldRevalidate;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user, response } = await requireUser(request);
  const pastaId = Number(params.id);
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);
  
  const resultadoPromise = OperacaoService.listarOperacoesLocal({ ...searchParams, pastaId });
  const agenciasPromise = OperacaoService.buscarAgencias();
  const pastaPromise = PastaService.buscarPorId(pastaId);

  return data({ 
    dadosPromise: resultadoPromise, 
    agenciasPromise, 
    pastaPromise,
    pastaId 
  }, { headers: response.headers });
}

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Erro na Pasta" />;
}

export default function FolderView() {
  const { dadosPromise, agenciasPromise, pastaPromise, pastaId } = useLoaderData<typeof loader>();

  return (
    <Suspense fallback={null}>
      <Await resolve={pastaPromise}>
        {(pasta: any) => (
          <OperacoesView 
            dadosPromise={dadosPromise}
            agenciasPromise={agenciasPromise}
            nomePasta={pasta?.nome || "Pasta"}
            pastaId={pastaId}
            showImport={false}
          />
        )}
      </Await>
    </Suspense>
  );
}