import { Navigate, useParams } from "react-router";
import { useInit } from "~/lib/query";
import { OperacoesView } from "~/views/OperacoesView";

export function OperacoesPage() {
  const { nome } = useParams();
  const { data: init } = useInit();

  // Rota de pasta (/pastas/:nome): renderiza pelo nome da URL direto, em
  // paralelo com o /init (não espera resolver o id da pasta); só redireciona
  // para a inbox quando o /init chega e a pasta não existe.
  if (nome) {
    const nomePasta = decodeURIComponent(nome);
    if (init && !(init.pastas || []).some((p: any) => p.nome === nomePasta)) {
      return <Navigate to="/caixa-de-entrada" replace />;
    }
    return <OperacoesView pastaNome={nomePasta} nomePasta={nomePasta} showImport={false} />;
  }

  // Caixa de entrada (/caixa-de-entrada)
  return <OperacoesView pastaId={null} nomePasta="Caixa de Entrada" showImport />;
}
