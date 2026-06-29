import { useState } from "react";
import { NovoStatusModalView } from "../views/NovoStatusModalView";

export function NovoStatusModal({ onConfirm, onClose }: { onConfirm: (v: string) => void, onClose: () => void }) {
  const [nome, setNome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim()) {
      onConfirm(nome.trim().toUpperCase());
    }
  };

  return (
    <NovoStatusModalView
      nome={nome}
      setNome={setNome}
      handleSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
