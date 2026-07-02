import { AlertTriangle } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

export function RouteErrorBoundary({ title = "Ops! Algo deu errado." }: { title?: string }) {
  const error = useRouteError();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="p-6 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[2rem] shadow-xl shadow-rose-500/10">
        <AlertTriangle size={64} strokeWidth={2.5} />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{title}</h1>
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
