import { Suspense } from "react";
import { useLoaderData, Await, data, isRouteErrorResponse, useRouteError } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";
import { OperacoesView } from "~/components/OperacoesView";

export const shouldRevalidate = ({ formData, defaultShouldRevalidate }: any) => {
  if (formData?.get("intent") === "update") return false;
  return defaultShouldRevalidate;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, response } = await requireUser(request);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  
  const resultadoPromise = OperacaoService.listarOperacoes(params);
  const agenciasPromise = OperacaoService.buscarAgencias();

  return data({ 
    dadosPromise: resultadoPromise, 
    agenciasPromise,
    nomePasta: "Caixa de Entrada" 
  }, { headers: response.headers });
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="p-6 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[2rem] shadow-xl shadow-rose-500/10">
        <AlertTriangle size={64} strokeWidth={2.5} />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Ops! Algo deu errado.</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
          {isRouteErrorResponse(error) 
            ? `${error.status} ${error.statusText}` 
            : error instanceof Error 
              ? error.message 
              : "Não conseguimos carregar os dados desta página agora."}
        </p>
      </div>
      <div className="flex gap-4">
        <button onClick={() => window.location.reload()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
          Tentar Novamente
        </button>
        <a href="/" className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">
          Ir para o Painel
        </a>
      </div>
    </div>
  );
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