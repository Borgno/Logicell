import { Outlet, useMatches } from "react-router";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { OperacoesView } from "~/views/OperacoesView";

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Erro nas Operações" />;
}

export default function OperacoesLayout() {
  const matches = useMatches();
  // Pega os dados da última rota filha mapeada (que será inbox ou pastas.$id)
  const leafMatch = matches[matches.length - 1];
  const data = (leafMatch?.data as any) || {};

  const { dadosPromise, agenciasPromise, nomePasta, pastaId, showImport } = data;

  // Se a rota filha não retornou os dados da operação, só renderiza o Outlet normal
  if (!dadosPromise) {
    return <Outlet />;
  }

  return (
    <>
      <OperacoesView 
        dadosPromise={dadosPromise}
        agenciasPromise={agenciasPromise}
        nomePasta={nomePasta || ""}
        pastaId={pastaId || null}
        showImport={showImport ?? false}
      />
      {/* 
        O Outlet não vai renderizar nada visual porque as rotas filhas 
        (inbox e pastas) agora não exportam um componente Default.
        Mas deixamos aqui por segurança para o React Router.
      */}
      <Outlet />
    </>
  );
}
