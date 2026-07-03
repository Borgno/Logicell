import { createContext, useContext } from "react";

export const UIContext = createContext<{
  confirm: (opts: { title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary' }) => void;
  alert: (opts: { title: string, message: string, variant?: 'success' | 'info' | 'error' }) => void;
} | null>(null);

export const useUI = () => {
  const context = useContext(UIContext);
  // Fallback para evitar quebras de sistema se o provedor falhar momentaneamente
  return context || {
    confirm: () => {},
    alert: () => {}
  };
};
