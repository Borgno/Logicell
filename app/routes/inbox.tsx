import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";

export const shouldRevalidate = ({ formData, defaultShouldRevalidate }: any) => {
  if (formData?.get("intent") === "update") return false;
  return defaultShouldRevalidate;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  
  // Sem await para fazer streaming (defer)
  const resultado = OperacaoService.listarOperacoesLocal(params);
  const agencias = OperacaoService.buscarAgencias();

  return data({ 
    dadosPromise: resultado, 
    agenciasPromise: agencias,
    nomePasta: "Caixa de Entrada",
    showImport: true
  }, { headers: response.headers });
}

export default function Inbox() {
  return null;
}