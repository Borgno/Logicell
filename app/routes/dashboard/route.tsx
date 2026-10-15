import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "~/components/layout/PageHeader";
import { APP_NAME } from "~/config/app";
import { meQuery } from "~/lib/auth";
import { queryClient } from "~/lib/queryClient";
import type { Route } from "./+types/route";
import { AdminDashboard } from "./_components/AdminDashboard";
import { OperacoesDashboard } from "./_components/OperacoesDashboard";
import { filtrosDaUrl, opcoesQuery, resumoQuery } from "./_hooks/dashboard.queries";

export const meta: Route.MetaFunction = () => [{ title: `Dashboard | ${APP_NAME}` }];

// Começa a buscar junto com a navegação, em vez de esperar a tela montar.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  void queryClient.prefetchQuery(resumoQuery(filtrosDaUrl(new URL(request.url).searchParams)));
  void queryClient.prefetchQuery(opcoesQuery);
  return null;
}

// Operações por faturista para todos os cargos; o usuário comum vê só as pastas em que é faturista.
// O admin vê também, embaixo, os números de usuários.
export default function Dashboard() {
  const { data: user } = useQuery(meQuery);
  if (!user) return null;

  const gestor = user.role !== "user";
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={gestor ? "Operações por faturista." : "As operações das suas pastas."}
      />
      <OperacoesDashboard gestor={gestor} />
      {user.role === "admin" && (
        <section aria-label="Usuários" className="mt-10">
          <h2 className="mb-4 text-lg font-bold tracking-tight">Usuários</h2>
          <AdminDashboard />
        </section>
      )}
    </>
  );
}
