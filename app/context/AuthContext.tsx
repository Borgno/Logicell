import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getSupabaseBrowserClient } from "~/services/supabase.client";

type AuthContextType = {
  user: User | null;
  supabase: SupabaseClient | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children, 
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: User | null;
}) {
  // Inicializa como null no servidor, e recupera o singleton no cliente
  const supabase = useMemo(() => (typeof window !== "undefined" ? getSupabaseBrowserClient() : null), []);
  const [user, setUser] = useState<User | null>(initialSession);
  const navigate = useNavigate();

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        navigate("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  return (
    <AuthContext.Provider value={{ user, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
