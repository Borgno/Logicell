import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LinksFunction, LoaderFunctionArgs, ShouldRevalidateFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useFetcher, useLoaderData, useLocation } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { UIContext, useUI } from "./hooks/use-ui";
import { getUser } from "./services/auth.server";
import { OperacaoService } from "./services/operacao.server";
import { PastaService } from "./services/pasta.server";
import { StatusService } from "./services/status.server";
import { ConfigService, themeCookie } from "./services/config.server";
import { Sidebar } from "./components/Sidebar";
import "./styles/tailwind.css";



export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" },
];



export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request).catch(() => null);
    const [pastas, totalInbox, customStatuses, columnOrder, columnWidths] = await Promise.all([
      PastaService.listar().catch(() => []),
      OperacaoService.contarInbox().catch(() => 0),
      StatusService.listar().catch(() => []),
      ConfigService.get("columnOrder").catch(() => null),
      ConfigService.get("columnWidths").catch(() => null)
    ]);
    const cookieHeader = request.headers.get("Cookie");
    const themeFromCookie = await themeCookie.parse(cookieHeader) || "light";

    return { pastas, totalInbox, user, customStatuses, columnOrder, columnWidths, theme: themeFromCookie };
  } catch (e) {
    return { pastas: [], totalInbox: 0, user: null, customStatuses: [], columnOrder: null, columnWidths: null, theme: "light" };
  }
}


export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl, formMethod, formData, defaultShouldRevalidate }) => {
  // Sempre revalida em ações de mutação pesada (upload, move, delete)
  if (formMethod && formMethod !== "GET") {
    const intent = formData?.get("intent");
    // Se for apenas um 'update' de campo (ex: observação), não precisamos revalidar o painel lateral todo
    if (intent === "update") return false;
    return true;
  }
  
  // Evita revalidar o Root (barra lateral e caches) se a mudança for apenas SEARCH PARAMS na mesma página
  // Isse impede o 'piscar' e a lentidão ao paginar ou filtrar
  if (currentUrl.pathname === nextUrl.pathname) return false;
  
  return defaultShouldRevalidate;
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  
  // UI State moved to Layout for global availability (including ErrorBoundaries)
  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm?: () => void, variant: string, isAlert?: boolean} | null>(null);


  const confirmAction = useCallback(({ title, message, onConfirm, variant = 'primary' }: any) => {
    setModal({ isOpen: true, title, message, onConfirm, variant, isAlert: false });
  }, []);

  const showAlert = useCallback(({ title, message, variant = 'success' }: any) => {
    setModal({ isOpen: true, title, message, variant, isAlert: true });
  }, []);

  const uiContextValue = useMemo(() => ({ confirm: confirmAction, alert: showAlert }), [confirmAction, showAlert]);

  return (
    <html lang="pt-BR" className={`h-full ${data?.theme === 'dark' ? 'dark' : ''}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased overflow-hidden w-screen font-sans">
        <UIContext.Provider value={uiContextValue}>
          <AuthProvider initialSession={data?.user ?? null}>

            {children}
            
            {/* Overlay UI components (Global) */}

            {modal?.isOpen && (
              <div 
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setModal(null)}
              >
                <div 
                  className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`w-16 h-16 rounded-3xl mb-6 flex items-center justify-center ${
                    modal.variant === 'danger' || modal.variant === 'error' ? 'bg-rose-100 text-rose-600' : 
                    modal.variant === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {modal.variant === 'danger' || modal.variant === 'error' ? <AlertTriangle size={32} /> : 
                    modal.variant === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
                  </div>
                  <h2 className="text-xl font-black mb-2 text-slate-800 dark:text-white uppercase tracking-tight">{modal.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8 whitespace-pre-line">{modal.message}</p>
                  <div className="flex gap-3">
                    {!modal.isAlert && (
                      <button onClick={() => setModal(null)} className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                    )}
                    <button 
                      onClick={() => { if(modal.onConfirm) modal.onConfirm(); setModal(null); }} 
                      className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all ${
                        modal.variant === 'danger' || modal.variant === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 
                        modal.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {modal.isAlert ? "Entendido" : "Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AuthProvider>
        </UIContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  const location = useLocation();
  const pastas = data?.pastas || [];
  const totalInbox = data?.totalInbox || 0;
  const fetcher = useFetcher();
  
  const isLoginPage = location.pathname === "/login";

  const [isDark, setIsDark] = useState(data?.theme === 'dark');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    fetcher.submit({ intent: "setTheme", theme: newTheme }, { method: "post", action: "/api/operacoes" });
  };

  if (isLoginPage) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-slate-950">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden transition-colors duration-500">
      <Sidebar 
        pastas={pastas} 
        totalInbox={totalInbox} 
        user={data?.user} 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
        <Outlet />
      </main>
    </div>
  );
}