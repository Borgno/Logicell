import { data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/services/auth.server";
import { DashboardService } from "~/services/dashboard.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);
  
  const url = new URL(request.url);
  const pastaRaw = url.searchParams.get("pastaId");
  const pastaId = (pastaRaw === "null" || !pastaRaw) ? null : Number(pastaRaw);

  const stats = await DashboardService.getDashboardMetrics(pastaId);
  return data(stats, { headers: response.headers });
}
