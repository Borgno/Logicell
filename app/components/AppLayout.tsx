import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import { useAuth } from "~/context/AuthContext";
import { UIContext } from "~/hooks/use-ui";
import { useInit } from "~/lib/query";
import { iniciar, terminar } from "~/lib/loading";
import { Sidebar } from "~/components/Sidebar";
import { GlobalModal } from "~/components/GlobalModal";
import { TopProgress } from "~/components/TopProgress";

// Fallback do Suspense interno: enquanto o chunk de uma página lazy baixa,
// acende a faixa do topo (mesmo contador de lib/loading.ts) sem desmontar a
// sidebar nem trocar o layout por uma tela de carregamento.
function RotaCarregando() {
  useEffect(() => {
    iniciar();
    return () => terminar();
  }, []);
  return null;
}

export function AppLayout() {
  const { user } = useAuth();
  const { data: init } = useInit();

  const pastas = init?.pastas || [];
  const totalInbox = init?.totalInbox || 0;
  const emissaoAntigasPorPasta = init?.emissaoAntigasPorPasta || {};

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    variant: string;
    isAlert?: boolean;
  } | null>(null);

  const confirmAction = useCallback(({ title, message, onConfirm, variant = "primary" }: any) => {
    setModal({ isOpen: true, title, message, onConfirm, variant, isAlert: false });
  }, []);

  const showAlert = useCallback(({ title, message, variant = "success" }: any) => {
    setModal({ isOpen: true, title, message, variant, isAlert: true });
  }, []);

  const uiContextValue = useMemo(
    () => ({ confirm: confirmAction, alert: showAlert }),
    [confirmAction, showAlert]
  );

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("logicell-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("logicell-theme", isDark ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((v) => !v);

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <UIContext.Provider value={uiContextValue}>
      <TopProgress />
      <div className="flex h-screen w-screen overflow-hidden transition-colors duration-500">
        <Sidebar
          pastas={pastas}
          totalInbox={totalInbox}
          emissaoAntigasPorPasta={emissaoAntigasPorPasta}
          user={user}
          isDark={isDark}
          toggleTheme={toggleTheme}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden h-full">
          {/* Boundary interno: enquanto o chunk de uma página lazy baixa, a
              sidebar continua no lugar (o Suspense de AppRoutes só cobre o login) */}
          <Suspense fallback={<RotaCarregando />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {modal && (
        <GlobalModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          variant={modal.variant as "primary" | "success" | "error" | "danger"}
          isAlert={modal.isAlert}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </UIContext.Provider>
  );
}
