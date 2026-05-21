import { createSupabaseServerClient } from "./supabase.server";

export async function invokeLogicellFnServer(request: Request, name: string) {
  const { supabase } = await createSupabaseServerClient(request);

  const { data, error } = await supabase.functions.invoke("logicell-fn", {
    body: { name },
  });

  if (error) {
    console.error("Error invoking function from server:", error);
    throw error;
  }

  return data;
}
