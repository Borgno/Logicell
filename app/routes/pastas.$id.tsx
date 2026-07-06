import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";
import { PastaService } from "~/services/pasta.server";

export const shouldRevalidate = ({ formData, defaultShouldRevalidate }: any) => {
  if (formData?.get("intent") === "update") return false;
  return defaultShouldRevalidate;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);
  const pastaId = Number(params.id);
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);
  
  // Apenas a pasta recebe await pois é bem rápido e precisamos do nome para o layout
  const pasta = await PastaService.buscarPorId(pastaId);
  
  // Sem await para fazer streaming (defer)
  const resultado = OperacaoService.listarOperacoesLocal({ ...searchParams, pastaId });
  const agencias = OperacaoService.buscarAgencias();

  return data({ 
    dadosPromise: resultado, 
    agenciasPromise: agencias, 
    nomePasta: pasta?.nome || "Pasta",
    pastaId,
    showImport: false
  }, { headers: response.headers });
}

export default function FolderView() {
  return null;
}