import { useLoaderData, data } from "react-router";
import { requireUser } from "~/services/auth.server";
import type { LoaderFunctionArgs } from "react-router";
import { DashboardService } from "~/services/dashboard.server";
import { DashboardView } from "~/views/DashboardView";

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);
  const stats = await DashboardService.getDashboardMetrics();
  return data(stats, { headers: response.headers });
}

export default function Dashboard() {
  const estatisticas = useLoaderData<typeof loader>();
  
  return <DashboardView estatisticas={estatisticas} />;
}
