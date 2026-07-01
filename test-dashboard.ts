import { DashboardService } from "./app/services/dashboard.server";
DashboardService.getDashboardMetrics().then(res => console.log("GLOBAL:", res.totais.statusMap)).catch(console.error);
DashboardService.getDashboardMetrics(null).then(res => console.log("INBOX:", res.totais.statusMap)).catch(console.error);
