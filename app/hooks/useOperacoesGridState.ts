import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";

export const COLUNAS_OPERACAO = [
  { key: 'nm_agencia', label: 'Agência', width: '180px' },
  { key: 'dt_emissao_', label: 'Emissão', width: '120px' },
  { key: 'nm_proprietario_posse_cavalo', label: 'Proprietário', width: '200px' },
  { key: 'nm_pessoa_pagador', label: 'Cliente', width: '250px' },
  { key: 'nr_cpf_cnpj_raiz', label: 'CNPJ Raiz', width: '140px' },
  { key: 'nr_cpf_cnpj_pagador', label: 'CNPJ Pagador', width: '180px' },
  { key: 'nr_ctrc', label: 'CTe', width: '120px' },
  { key: 'status', label: 'Status', width: '50px' },
  { key: 'comentarios', label: 'OBSERVAÇÃO', width: '300px' },
  { key: 'id_tipo_documento', label: 'Tipo Doc', width: '100px' },
  { key: 'nm_pessoa_remetente', label: 'Remetente', width: '250px' },
  { key: 'nm_cidade_origem', label: 'Cidade Origem', width: '180px' },
  { key: 'ds_sigla_origem', label: 'UF Origem', width: '80px' },
  { key: 'nm_pessoa_destinatario', label: 'Destinatário', width: '250px' },
  { key: 'nm_cidade_destino', label: 'Cidade Destino', width: '180px' },
  { key: 'ds_sigla_destino', label: 'UF Destino', width: '80px' },
  { key: 'nm_produto', label: 'Produto', width: '150px' },
  { key: 'vl_peso', label: 'Peso (kg)', width: '120px', isNumeric: true },
  { key: 'vl_tarifa', label: 'Tarifa (R$)', width: '120px', isCurrency: true },
  { key: 'vl_total', label: 'Total (R$)', width: '140px', isCurrency: true },
  { key: 'nr_nf', label: 'NF', width: '120px' },
  { key: 'ds_placa', label: 'Placa', width: '120px' },
  { key: 'nm_pessoa_matriz', label: 'Matriz', width: '200px' },
  { key: 'nr_contrato', label: 'Contrato', width: '120px' },
  { key: 'nr_chave_acesso', label: 'Chave Acesso', width: '380px' },
  { key: 'nm_pessoa_usuario_lancamento', label: 'Usuário', width: '180px' },
  { key: 'id_tipo_ctrc', label: 'Tipo CTe', width: '120px' },
  { key: 'cd_pessoa_pagador', label: 'Código', width: '120px' },
  { key: 'nm_motorista', label: 'Motorista', width: '250px' },
];


export type FilterType = "contains" | "equals" | "blank" | "notBlank";
export type Range = { start: {rowIdx: number, colIdx: number}, end: {rowIdx: number, colIdx: number} };

export function useOperacoesGridState(initialColumnOrder: string[] | null, initialWidths: Record<string, number>) {
  const [searchParams] = useSearchParams();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, { type: FilterType, value: string }>>(() => {
    const init: any = {};
    if (searchParams.get("status")) {
      init["status"] = { type: "equals", value: searchParams.get("status")! };
    }
    return init;
  });
  const [openFilterCol, setOpenFilterCol] = useState<{ key: string, rect: DOMRect } | null>(null);

  const [selectedRanges, setSelectedRanges] = useState<Range[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const orderedColumns = useMemo(() => {
    if (!initialColumnOrder) return COLUNAS_OPERACAO;
    return [...COLUNAS_OPERACAO].sort((a, b) => {
      const idxA = initialColumnOrder.indexOf(a.key);
      const idxB = initialColumnOrder.indexOf(b.key);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [initialColumnOrder]);

  return {
    columnWidths, setColumnWidths,
    columnFilters, setColumnFilters,
    openFilterCol, setOpenFilterCol,
    selectedRanges, setSelectedRanges,
    isDragging, setIsDragging,
    orderedColumns
  };
}
