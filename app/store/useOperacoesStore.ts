import { create } from "zustand";

interface OperacoesState {
  selecionados: Set<number>;
  selectAllMode: boolean;
  excludedIds: Set<number>;
  
  showPastaMenu: boolean;
  showActionsMenu: boolean;
  showImportModal: boolean;

  setSelecionados: (selecionados: Set<number>) => void;
  setSelectAllMode: (selectAllMode: boolean) => void;
  setExcludedIds: (excludedIds: Set<number>) => void;
  
  setShowPastaMenu: (show: boolean) => void;
  setShowActionsMenu: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;

  resetSelection: () => void;
}

export const useOperacoesStore = create<OperacoesState>((set) => ({
  selecionados: new Set(),
  selectAllMode: false,
  excludedIds: new Set(),
  
  showPastaMenu: false,
  showActionsMenu: false,
  showImportModal: false,

  setSelecionados: (selecionados) => set({ selecionados }),
  setSelectAllMode: (selectAllMode) => set({ selectAllMode }),
  setExcludedIds: (excludedIds) => set({ excludedIds }),
  
  setShowPastaMenu: (showPastaMenu) => set({ showPastaMenu }),
  setShowActionsMenu: (showActionsMenu) => set({ showActionsMenu }),
  setShowImportModal: (showImportModal) => set({ showImportModal }),

  resetSelection: () => set({ selecionados: new Set(), selectAllMode: false, excludedIds: new Set() })
}));
