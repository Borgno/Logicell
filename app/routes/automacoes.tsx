import type { ActionFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import { AutomacaoService } from "~/services/automacao.server";
import { AutomacoesView } from "~/views/AutomacoesView";

import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { requireUser } from "~/services/auth.server";

export async function loader({ request }: any) {
  const { response } = await requireUser(request);
  const pastasComRegras = await AutomacaoService.listarRegrasPorPasta();
  return data({ pastas: pastasComRegras }, { headers: response.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "adicionar") {
      const pastaId = Number(formData.get("pastaId"));
      const tipo = String(formData.get("tipo")); // 'agencia' or 'cliente'
      const valor = String(formData.get("valor") || "").trim().toUpperCase();
      
      if (!pastaId || !tipo || !valor) return data({ error: "Preencha todos os campos." }, { status: 400 });
      
      const result = await AutomacaoService.adicionarRegra(pastaId, tipo as 'agencia' | 'cliente' | 'produto', valor);
      return data({ success: true });
    }

    if (intent === "remover") {
      const regraId = Number(formData.get("regraId"));
      if (!regraId) return data({ error: "ID da regra não fornecido." }, { status: 400 });
      
      await AutomacaoService.removerRegra(regraId);
      return data({ success: true });
    }
  } catch (error: any) {
    return data({ error: error.message || "Erro desconhecido" }, { status: 400 });
  }

  return data({ error: "Intent inválido" }, { status: 400 });
}

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Erro nas Automações" />;
}

export default function AutomacoesPage() {
  const { pastas } = useLoaderData<typeof loader>();
  
  return <AutomacoesView pastas={pastas} />;
}
