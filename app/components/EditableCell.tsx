import { useState, useRef, useEffect, memo } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { EditableCellView } from "../views/EditableCellView";

export const EditableCell = memo(function EditableCell(props: any) {
  const { id, campo, valor, coluna, onSave } = props;
  
  const rootData = useRouteLoaderData("root") as any;
  const customStatuses = rootData?.customStatuses || [];
  const allStatuses = Array.from(new Set([...customStatuses.map((s: any) => s.nome)])).sort();
  const fetcher = useFetcher();

  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(valor || ""));
  const [isOpen, setIsOpen] = useState(false);
  const [showNovoStatusModal, setShowNovoStatusModal] = useState(false);
  const isModalOpenRef = useRef(false);

  const handleCreateStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    isModalOpenRef.current = true;
    setShowNovoStatusModal(true);
  };

  const confirmarNovoStatus = (nome: string) => {
    fetcher.submit({ intent: "createStatus", nome }, { method: "post", action: "/api/operacoes" });
    onSave(nome);
    setTempValue(nome);
    setIsOpen(false);
    isModalOpenRef.current = false;
    setIsEditing(false);
    setShowNovoStatusModal(false);
  };

  const handleBlur = (e?: React.FocusEvent) => {
    if (e?.relatedTarget?.closest?.('.status-dropdown')) return;
    if (isModalOpenRef.current) return;
    setIsEditing(false);
    setIsOpen(false);
    if (tempValue !== String(valor || "")) onSave(tempValue);
  };

  const handleFinish = (e?: React.FocusEvent) => handleBlur(e);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (tempValue !== String(valor || "")) onSave(tempValue);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setIsOpen(false);
      setTempValue(String(valor || ""));
    }
  };

  useEffect(() => {
    setTempValue(String(valor || ""));
  }, [valor]);

  return (
    <EditableCellView 
      {...props}
      allStatuses={allStatuses}
      isEditing={isEditing}
      setIsEditing={setIsEditing}
      tempValue={tempValue}
      setTempValue={setTempValue}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      showNovoStatusModal={showNovoStatusModal}
      setShowNovoStatusModal={setShowNovoStatusModal}
      isModalOpenRef={isModalOpenRef}
      handleCreateStatus={handleCreateStatus}
      confirmarNovoStatus={confirmarNovoStatus}
      handleBlur={handleBlur}
      handleKeyDown={handleKeyDown}
      handleFinish={handleFinish}
    />
  );
});
