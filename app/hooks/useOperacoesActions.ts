import { useOperacoesStore } from "~/store/useOperacoesStore";

export function useOperacoesActions({
  fetcher, confirm, showAlert,
  currentMetaTotal, getActiveFilters
}: any) {
  const { 
    selecionados, setSelecionados, 
    selectAllMode, setSelectAllMode, 
    excludedIds, setExcludedIds,
    setShowPastaMenu, setShowImportModal 
  } = useOperacoesStore();

  const lidarUpload = (file: File, modo: string) => {
    const formData = new FormData();
    formData.append("intent", "upload");
    formData.append("file", file);
    formData.append("modo", modo);
    fetcher.submit(formData, { method: "post", encType: "multipart/form-data", action: "/api/operacoes" });
    setShowImportModal(false);
  };

  const salvarEdicao = (id: number, campo: string, valor: string) => {
    const formData = new FormData();
    formData.append("intent", "update");
    formData.append("id", String(id));
    formData.append("campo", campo);
    formData.append("valor", valor);
    fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
  };

  const moverParaPasta = (pId: number | null, pNome: string, unusedTotalFiltro: number) => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;
    
    confirm({
      title: "Mover Itens?",
      message: `Deseja mover ${idsCount} itens para "${pNome}"?`,
      variant: "primary",
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkMove");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify(getActiveFilters()));
        if (selectAllMode) {
          formData.append("selectAll", "true");
          formData.append("excludedIds", JSON.stringify(Array.from(excludedIds)));
        }
        if (pId !== null) formData.append("pastaId", String(pId));
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
        setSelectAllMode(false);
        setExcludedIds(new Set());
        setShowPastaMenu(false);
      }
    });
  };

  const excluirSelecionados = (unusedTotalFiltro: number) => {
    const idsCount = selectAllMode ? currentMetaTotal - excludedIds.size : selecionados.size;
    if (idsCount === 0) return;

    confirm({
      title: "Excluir permanentemente?",
      message: `Você está prestes a excluir ${idsCount} itens. Esta ação não pode ser desfeita.`,
      variant: "danger",
      onConfirm: () => {
        const formData = new FormData();
        formData.append("intent", "bulkDelete");
        formData.append("ids", JSON.stringify(Array.from(selecionados)));
        formData.append("filters", JSON.stringify(getActiveFilters()));
        if (selectAllMode) {
          formData.append("selectAll", "true");
          formData.append("excludedIds", JSON.stringify(Array.from(excludedIds)));
        }
        fetcher.submit(formData, { method: "post", action: "/api/operacoes" });
        setSelecionados(new Set());
        setSelectAllMode(false);
        setExcludedIds(new Set());
      }
    });
  };

  return { lidarUpload, salvarEdicao, moverParaPasta, excluirSelecionados };
}
