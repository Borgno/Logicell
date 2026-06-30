import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { COLUNAS_OPERACAO } from "~/hooks/useOperacoesGridState";
import { AuditoriaModalView } from "../views/AuditoriaModalView";

export function AuditoriaModal({ operacaoId, pastaId, title = "Histórico de Edições", onClose }: any) {
  const historyFetcher = useFetcher<{ historico: any[] }>();
  const userListFetcher = useFetcher<{ usuarios: string[] }>();
  
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>("");
  const [showBulkDetails, setShowBulkDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!operacaoId && !pastaId && title !== "Histórico Geral") return;
    let url = "/api/auditoria";
    const params = new URLSearchParams();
    if (operacaoId) params.set("id", String(operacaoId));
    else if (pastaId) params.set("pastaId", String(pastaId));
    if (usuarioFiltro) params.set("usuario", usuarioFiltro);
    historyFetcher.load(`${url}?${params.toString()}`);
  }, [operacaoId, pastaId, title, usuarioFiltro]);

  useEffect(() => {
    userListFetcher.load("/api/auditoria?intent=getUsers");
  }, []);

  const historico = historyFetcher.data?.historico || [];
  const usuariosDisponiveis = userListFetcher.data?.usuarios || [];
  const isLoading = historyFetcher.state !== "idle";

  const safeParse = (str: string | null) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch(e) { return { mensagem: str, isLegacy: true }; }
  };

  const getLabel = (key: string) => {
    const col = COLUNAS_OPERACAO.find(c => c.key === key);
    if (col) return col.label;
    const acoes: Record<string, string> = { 'UPDATE': 'Alteração', 'MOVE': 'Movimentação', 'DELETE': 'Exclusão', 'BULK_MOVE': 'Movimentação em Lote', 'BULK_DELETE': 'Exclusão em Lote', 'CREATE': 'Criação' };
    return acoes[key] || key;
  };

  return (
    <AuditoriaModalView 
      operacaoId={operacaoId}
      pastaId={pastaId}
      title={title}
      onClose={onClose}
      historico={historico}
      usuariosDisponiveis={usuariosDisponiveis}
      isLoading={isLoading}
      usuarioFiltro={usuarioFiltro}
      setUsuarioFiltro={setUsuarioFiltro}
      showBulkDetails={showBulkDetails}
      setShowBulkDetails={setShowBulkDetails}
      getLabel={getLabel}
      safeParse={safeParse}
    />
  );
}
