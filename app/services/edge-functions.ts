import { getSupabaseBrowserClient } from "./supabase.client";

export async function invokeLogicellFn(name: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.functions.invoke("logicell-fn", {
    body: { name },
  });

  if (error) {
    console.error("Error invoking function:", error);
    throw error;
  }

  return data;
}
