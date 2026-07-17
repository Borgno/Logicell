import { data, useLoaderData } from "react-router";
import { requireUser } from "~/services/auth.server";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { useAuth } from "~/context/AuthContext";
import { createSupabaseServerClient } from "~/services/supabase.server";
import prisma from "~/lib/prisma.server";

import { ProfileCard } from "~/components/ProfileCard";
import { RecentImportsList } from "~/components/RecentImportsList";

export async function loader({ request }: any) {
  const { user, response } = await requireUser(request);
  
  const totalPlanilhas = await prisma.importacao.count();
  
  const ultimasImportacoes = await prisma.importacao.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const stats = {
    totalPlanilhas
  };

  return data({ user, ultimasImportacoes, stats }, { headers: response?.headers });
}

export async function action({ request }: any) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updateName") {
    const nome = String(formData.get("nome") || "").trim();
    if (!nome) return data({ error: "Nome não pode estar vazio" }, { status: 400 });

    const { supabase, response } = await createSupabaseServerClient(request);
    
    const { error } = await supabase.auth.updateUser({
      data: { nome: nome, nickname: nome }
    });

    if (error) {
      return data({ error: error.message }, { status: 400, headers: response?.headers });
    }

    return data({ success: true }, { headers: response?.headers });
  }

  if (intent === "undoImport") {
    const importacaoId = Number(formData.get("importacaoId"));
    if (!importacaoId) return data({ error: "ID de importação inválido" }, { status: 400 });

    try {
      const { OperacaoImportService } = await import("~/services/operacao-import.server");
      await OperacaoImportService.desfazerImportacao(importacaoId);
      return data({ success: true, message: "Importação desfeita com sucesso!" });
    } catch (err: any) {
      return data({ error: err.message || "Erro ao desfazer importação" }, { status: 400 });
    }
  }

  return data({ error: "Intent inválido" }, { status: 400 });
}

export function ErrorBoundary() {
  return <RouteErrorBoundary title="Ops! Erro ao carregar perfil" />;
}

export default function PerfilPage() {
  const { user, ultimasImportacoes, stats } = useLoaderData<typeof loader>();
  const { signOut } = useAuth();

  return (
    <div className="flex-1 flex flex-col bg-bg h-full overflow-y-auto custom-scrollbar p-6 md:p-8">
      <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6">
        <ProfileCard user={user} onSignOut={signOut} />
        <RecentImportsList imports={ultimasImportacoes} totalCount={stats.totalPlanilhas} />
      </div>
    </div>
  );
}
