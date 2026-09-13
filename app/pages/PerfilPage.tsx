import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/context/AuthContext";
import { api } from "~/lib/api";
import { ProfileCard } from "~/components/ProfileCard";
import { RecentImportsList } from "~/components/RecentImportsList";
import { Skeleton } from "~/components/Skeleton";

export function PerfilPage() {
  const { signOut } = useAuth();
  const { data } = useQuery({
    queryKey: ["perfil"],
    queryFn: () => api.get<{ user: any; ultimasImportacoes: any[]; stats: { totalPlanilhas: number } }>("/perfil"),
  });

  if (!data) {
    return (
      <div className="flex-1 flex flex-col bg-bg h-full overflow-y-auto custom-scrollbar p-6 md:p-8">
        <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg h-full overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6">
        <ProfileCard user={data.user} onSignOut={signOut} />
        <RecentImportsList imports={data.ultimasImportacoes} totalCount={data.stats.totalPlanilhas} />
      </div>
    </div>
  );
}
