import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "~/lib/api";
import { queryClient, queryKeys, fetchInit } from "~/lib/query";

type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    // Boot com uma única request: /init já traz o usuário (sem /auth/me à parte).
    // retry: false — deslogado, /init dá 401 e não adianta tentar de novo.
    queryClient
      .fetchQuery({ queryKey: queryKeys.init, queryFn: fetchInit, staleTime: 60_000, retry: false })
      .then((d) => {
        if (alive) setUser(d.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    //O /init é refeito periodicamente (useInit) e o servidor devolve o cargo
    //atual — assim uma promoção/rebaixamento atualiza menus e rotas sem relogin.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.queryKey[0] !== queryKeys.init[0]) return;
      const novo = (event.query.state.data as any)?.user;
      if (!novo) return;
      //Só atualiza quem já está logado — um /init atrasado não reloga após o logout.
      setUser((atual: any) =>
        !atual || atual.app_metadata?.role === novo.app_metadata?.role ? atual : novo
      );
    });

    const handleUnauthorized = () => {
      setUser(null);
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [navigate]);

  const signIn = useCallback(
    async (email: string, password: string, redirectTo = "/caixa-de-entrada") => {
      await api.post("/auth/login", { email, password });
      const d = await queryClient.fetchQuery({ queryKey: queryKeys.init, queryFn: fetchInit, staleTime: 60_000, retry: false });
      setUser(d.user);
      navigate(redirectTo, { replace: true });
    },
    [navigate]
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignora falha de logout — limpa sessão local de qualquer forma
    }
    queryClient.clear();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
