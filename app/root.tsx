import { useCallback, useMemo, useState } from "react";
import type { LinksFunction, LoaderFunctionArgs, ShouldRevalidateFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useFetcher, useLoaderData, useLocation } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { UIContext } from "./hooks/use-ui";
import { getUser } from "./services/auth.server";
import { OperacaoService } from "./services/operacao.server";
import { PastaService } from "./services/pasta.server";
import { OrdemColunasService, themeCookie } from "./services/config.server";
import { Sidebar } from "./components/Sidebar";
import { GlobalModal } from "./components/GlobalModal";
import "./styles/tailwind.css";



export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" },
];



export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request).catch(() => null);
    const [pastas, totalInbox, columnOrder] = await Promise.all([
      PastaService.listar().catch(() => []),
      OperacaoService.contarInbox().catch(() => 0),
      OrdemColunasService.get().catch(() => null)
    ]);
    const cookieHeader = request.headers.get("Cookie");
    const themeFromCookie = await themeCookie.parse(cookieHeader) || "light";

    const ENV = {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
    };

    return { pastas, totalInbox, user, columnOrder, theme: themeFromCookie, ENV };
  } catch (e) {
    const ENV = {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
    };
    return { pastas: [], totalInbox: 0, user: null, columnOrder: null, theme: "light", ENV };
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
    <html lang="pt-BR" className={`h-full ${data?.theme === 'dark' ? 'dark' : ''}`} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Logicell</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-bg text-text antialiased overflow-hidden w-screen font-sans">
        <UIContext.Provider value={uiContextValue}>
          <AuthProvider initialSession={data?.user ?? null}>

            {children}
            
            {/* Overlay UI components (Global) */}
            {modal && (
              <GlobalModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                variant={modal.variant as 'primary' | 'success' | 'error' | 'danger'}
                isAlert={modal.isAlert}
                onConfirm={modal.onConfirm}
                onClose={() => setModal(null)}
              />
            )}
          </AuthProvider>
        </UIContext.Provider>
        <ScrollRestoration />
        <script dangerouslySetInnerHTML={{ __html: `window.ENV = ${JSON.stringify(data?.ENV || {})}` }} />
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

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);
    fetcher.submit({ intent: "setTheme", theme: newTheme }, { method: "post", action: "/api/operacoes" });
  };

  if (isLoginPage) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#090b0e]">
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

      <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden h-full">
        <Outlet />
      </main>
    </div>
  );
}