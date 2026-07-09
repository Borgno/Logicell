import { ActionFunctionArgs } from "react-router";
import { requireUser } from "~/services/auth.server";
import { OperacaoService } from "~/services/operacao.server";
import { OperacaoImportService } from "~/services/operacao-import.server";
import { PastaService } from "~/services/pasta.server";
import { OrdemColunasService, themeCookie } from "~/services/config.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const { user } = await requireUser(request);
  const userName = user.user_metadata?.nome || user.email || "Sistema";

  try {
    switch (intent) {
      // --- AÇÕES DE PASTAS (SIDEPANEL) ---
      case "createFolder": {
        const nome = formData.get("nome") as string;
        const cor = formData.get("cor") as string | undefined;
        await PastaService.criar(nome, cor);
        return { success: true, intent: "createFolder" };
      }
      case "renameFolder": {
        const id = Number(formData.get("id"));
        const nome = formData.get("nome") as string;
        const cor = formData.get("cor") as string | undefined;
        await PastaService.atualizar(id, nome, cor);
        return { success: true, intent: "renameFolder" };
      }
      case "deleteFolder": {
        const id = Number(formData.get("id"));
        await PastaService.excluir(id);
        return { success: true, intent: "deleteFolder" };
      }

      // --- AÇÕES DE OPERAÇÕES (INBOX / PASTAS) ---
      case "upload": {
        const file = formData.get("file") as File;
        const modo = (formData.get("modo") as string) || "SUBSTITUIR";
        const buffer = Buffer.from(await file.arrayBuffer());
        const res = await OperacaoImportService.processarPlanilha(buffer, file.name, userName, modo);
        return { ...res, success: true, intent: "upload" };
      }
      case "update": {
        const id = Number(formData.get("id"));
        const campo = formData.get("campo") as string;
        const valor = formData.get("valor") as string;
        
        await OperacaoService.update(id, campo, valor);
        return { success: true, intent: "update" };
      }
      case "bulkUpdate": {
        const ids = JSON.parse(formData.get("ids") as string).map(Number);
        const campo = formData.get("campo") as string;
        const valor = formData.get("valor") as string;
        await OperacaoService.bulkUpdate(ids, campo, valor);
        return { success: true, intent: "bulkUpdate" };
      }
      case "bulkMove": {
        const ids = JSON.parse(formData.get("ids") as string).map(Number);
        const filters = JSON.parse(formData.get("filters") as string);
        const selectAll = formData.get("selectAll") === "true";
        const excludedIdsRaw = formData.get("excludedIds");
        const excludedIds = excludedIdsRaw ? JSON.parse(excludedIdsRaw as string).map(Number) : [];
        const pastaRaw = formData.get("pastaId");
        const pastaId = (pastaRaw === "null" || !pastaRaw || pastaRaw === "undefined") ? null : Number(pastaRaw);
        await OperacaoService.bulkActionPasta({ ids, pastaId, filtros: filters, selectAll, excludedIds });
        return { success: true, intent: "bulkMove" };
      }
      case "bulkDelete": {
        const ids = JSON.parse(formData.get("ids") as string).map(Number);
        const filters = JSON.parse(formData.get("filters") as string);
        const selectAll = formData.get("selectAll") === "true";
        const excludedIdsRaw = formData.get("excludedIds");
        const excludedIds = excludedIdsRaw ? JSON.parse(excludedIdsRaw as string).map(Number) : [];
        await OperacaoService.bulkDelete({ ids, filtros: filters, selectAll, excludedIds });
        return { success: true, intent: "bulkDelete" };
      }
      case "reorderColumns": {
        const order = JSON.parse(formData.get("order") as string);
        await OrdemColunasService.set(order);
        return { success: true, intent: "reorderColumns" };
      }
      case "setTheme": {
        const theme = formData.get("theme") as string;
        return new Response(JSON.stringify({ success: true, intent: "setTheme" }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": await themeCookie.serialize(theme)
          }
        });
      }

      default:
        return { error: "Intenção inválida", intent };
    }
  } catch (err: any) {
    console.error(`Erro na action [${intent}]:`, err);
    return { 
      error: err instanceof Error ? err.message : "Ocorreu um erro inesperado.",
      success: false,
      intent 
    };
  }
}
