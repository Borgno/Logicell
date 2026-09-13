import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { useAuth } from "~/context/AuthContext";
import { AppLayout } from "~/components/AppLayout";
import { OperacoesPage } from "~/pages/OperacoesPage";

//Páginas menos acessadas ficam em chunks separados, baixados só quando visitadas
const LoginPage = lazy(() => import("~/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("~/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AutomacoesPage = lazy(() => import("~/pages/AutomacoesPage").then((m) => ({ default: m.AutomacoesPage })));
const UsuariosPage = lazy(() => import("~/pages/UsuariosPage").then((m) => ({ default: m.UsuariosPage })));
const PerfilPage = lazy(() => import("~/pages/PerfilPage").then((m) => ({ default: m.PerfilPage })));

function SplashScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 bg-primary rounded-2xl text-white shadow-primary-glow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
            <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
        </div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useAuth();
  if (user?.app_metadata?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/caixa-de-entrada" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="caixa-de-entrada" element={<OperacoesPage />} />
            <Route path="pastas/:nome" element={<OperacoesPage />} />
            <Route path="automacoes" element={<AutomacoesPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="admin/usuarios" element={<UsuariosPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
