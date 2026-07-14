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
  const pastaNome = params.nome;
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);
  
  if (!pastaNome) {
    throw new Response("Not Found", { status: 404 });
  }

  // Apenas a pasta recebe await pois é bem rápido e precisamos do nome para o layout
  // O nome recebido na URL deve corresponder à pasta no banco de dados.
  const pasta = await PastaService.buscarPorNome(decodeURIComponent(pastaNome));
  
  if (!pasta) {
    throw new Response("Not Found", { status: 404 });
  }

  const pastaId = pasta.id;
  
  // Sem await para fazer streaming (defer)
  const resultado = OperacaoService.listarOperacoesLocal({ ...searchParams, pastaId });
  const agencias = OperacaoService.buscarAgencias();

  return data({ 
    dadosPromise: resultado, 
    agenciasPromise: agencias, 
    nomePasta: pasta.nome,
    pastaId,
    showImport: false
  }, { headers: response.headers });
}

export default function FolderView() {
  return null;
}