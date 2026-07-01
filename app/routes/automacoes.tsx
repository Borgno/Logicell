import { useLoaderData, data } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { AutomacaoService } from "~/services/automacao.server";
import { AutomacoesView } from "~/views/AutomacoesView";

import { requireUser } from "~/services/auth.server";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

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
      const agencia = String(formData.get("agencia") || "").trim().toUpperCase();
      
      if (!pastaId || !agencia) return data({ error: "Preencha todos os campos." }, { status: 400 });
      
      await AutomacaoService.adicionarRegra(pastaId, agencia);
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
