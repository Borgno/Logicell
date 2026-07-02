import type { ActionFunctionArgs } from "react-router";
import { redirect, useActionData, useNavigation } from "react-router";
import { sessionStorage } from "~/services/session.server";
import { createSupabaseServerClient } from "~/services/supabase.server";
import { LoginView } from "~/views/LoginView";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { supabase, response: supabaseResponse } = await createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // O Supabase SSR gerencia o cookie automaticamente via setAll se configurado,
  // mas o React Router v7 precisa que retornemos o header Set-Cookie explicitamente se quisermos persistência imediata.
  // No nosso setup de supabase.server.ts isso é tratado nos loaders. No login, fazemos o redirect.
  
  // Persistência da sessão via Cookie do Remix/React Router
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  
  session.set("access_token", data.session?.access_token);
  session.set("refresh_token", data.session?.refresh_token);

  const headers = new Headers(supabaseResponse.headers);
  headers.append("Set-Cookie", await sessionStorage.commitSession(session));

  return redirect("/", { headers });
}

export default function Login() {
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string }>();
  const isSubmitting = navigation.state === "submitting";

  return <LoginView isSubmitting={isSubmitting} error={actionData?.error} />;
}
