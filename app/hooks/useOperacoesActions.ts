import { useUI } from "~/hooks/use-ui";
import { useOperacoesStore } from "~/store/useOperacoesStore";
import { api, errorMessage } from "~/lib/api";

export function useOperacoesActions({
  confirm,
  currentMetaTotal,
  getActiveFilters,
  onMutated,
}: any) {
  const {
    selecionados, setSelecionados,
    selectAllMode, setSelectAllMode,
    excludedIds, setExcludedIds,
    setShowPastaMenu, setShowImportModal,
  } = useOperacoesStore();

  const { alert: showAlert } = useUI();

  const lidarUpload = async (file: File, modo: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("modo", modo);

    setShowImportModal(false);
    try {
      const res = await api.postForm<{ totalLido: number; adicionados: number; ignorados: number; removidos: number; modo: string }>(
        "/operacoes/import",
        formData
      );
      showAlert({
        title: "Importação Concluída",
        message: `Modo: ${res.modo === "SUBSTITUIR" ? "Substituir (Sincronização)" : "Apenas Adicionar"}\n\n✅ Novos adicionados: ${res.adicionados || 0} itens\n⚠️ Mantidos/Ignorados: ${res.ignorados || 0} itens${res.modo === "SUBSTITUIR" ? `\n❌ Antigos removidos: ${res.removidos || 0} itens` : ""}`,
        variant: "success",
      });
      onMutated?.();
    } catch (err) {
      showAlert({ title: "Erro na Importação", message: errorMessage(err), variant: "error" });
    }
  };

  const salvarEdicao = (id: number, campo: string, valor: string) => {
    api
      .patch(`/operacoes/${id}`, { campo, valor })
      .catch((err) => {
        showAlert({ title: "Erro ao salvar", message: errorMessage(err), variant: "error" });
        //Recarrega para tirar da tela o valor otimista que o servidor recusou.
        onMutated?.();
      });
  };

  const moverParaPasta = (pId: number | null, pNome: string) => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;

    confirm({
      title: "Mover Itens?",
      message: `Deseja mover ${idsCount} itens para "${pNome}"?`,
      variant: "primary",
      onConfirm: async () => {
        try {
          await api.post("/operacoes/bulk", {
            action: "move",
            ids: Array.from(selecionados),
            filters: getActiveFilters(),
            selectAll: selectAllMode,
            excludedIds: Array.from(excludedIds),
            pastaId: pId,
          });
          setSelecionados(new Set());
          setSelectAllMode(false);
          setExcludedIds(new Set());
          setShowPastaMenu(false);
          onMutated?.();
        } catch (err) {
          showAlert({ title: "Erro ao mover", message: errorMessage(err), variant: "error" });
        }
      },
    });
  };

  const excluirSelecionados = () => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;

    confirm({
      title: "Excluir permanentemente?",
      message: `Você está prestes a excluir ${idsCount} itens. Esta ação não pode ser desfeita.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.post("/operacoes/bulk", {
            action: "delete",
            ids: Array.from(selecionados),
            filters: getActiveFilters(),
            selectAll: selectAllMode,
            excludedIds: Array.from(excludedIds),
          });
          setSelecionados(new Set());
          setSelectAllMode(false);
          setExcludedIds(new Set());
          onMutated?.();
        } catch (err) {
          showAlert({ title: "Erro ao excluir", message: errorMessage(err), variant: "error" });
        }
      },
    });
  };

  return { lidarUpload, salvarEdicao, moverParaPasta, excluirSelecionados };
}
