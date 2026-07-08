import { type LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  
  const dados = await OperacaoService.listarOperacoesLocal(params);
  return dados;
}
