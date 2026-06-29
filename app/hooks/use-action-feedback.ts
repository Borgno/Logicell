import { useEffect, useRef } from "react";
import { MESSAGES } from "~/constants/messages";

interface FetcherData {
  success?: boolean;
  intent?: string;
  totalLido?: number;
  adicionados?: number;
  ignorados?: number;
  error?: string;
  [key: string]: any;
}

/**
 * Hook customizado para lidar com o feedback visual das ações do sistema.
 * Desacopla a lógica de notificações dos componentes de visão.
 */
export function useActionFeedback(
  fetcher: { state: string; data?: FetcherData | any },
  actions: { 
    showToast: (msg: string, type?: any) => void;
    showAlert?: (opts: any) => void;
    excludeIntents?: string[];
  }
) {
  const lastProcessedData = useRef<FetcherData | null>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && fetcher.data !== lastProcessedData.current) {
      const data = fetcher.data as FetcherData;
      lastProcessedData.current = data;

      // 1. Caso Especial: Upload/Importação (exige Alerta/Modal)
      if (data.totalLido !== undefined && actions.showAlert) {
        actions.showAlert(
          MESSAGES.alerts.importSuccess(data.adicionados || 0, data.ignorados || 0, data.removidos || 0, data.modo || "SUBSTITUIR")
        );
        return;
      }

      // 2. Erros retornados pela API
      if (data.error) {
        actions.showToast(data.error, "error");
        return;
      }

      // 3. Sucessos baseados em Intenção (Toasts)
      if (data.success && data.intent) {
        if (actions.excludeIntents?.includes(data.intent)) {
          return;
        }
        const config = (MESSAGES.toasts as any)[data.intent];
        if (config) {
          actions.showToast(config.message, config.type);
        }
      }
    }
  }, [fetcher.state, fetcher.data, actions]);
}
