import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null;

  if (supabaseClient) return supabaseClient;

  const supabaseUrl = (typeof window !== "undefined" && (window as any).ENV?.VITE_SUPABASE_URL) || (import.meta as any).env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = (typeof window !== "undefined" && (window as any).ENV?.VITE_SUPABASE_ANON_KEY) || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
    return null;
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}
