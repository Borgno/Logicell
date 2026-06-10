/**
 * Constantes de domínio relacionadas às Operações.
 */

export const COLUNAS_OPERACAO = [
  { key: 'nm_agencia', label: 'Agência', width: '180px' },
  { key: 'dt_emissao_', label: 'Emissão', width: '120px' },
  { key: 'nm_proprietario_posse_cavalo', label: 'Proprietário', width: '200px' },
  { key: 'nm_pessoa_pagador', label: 'Cliente', width: '250px' },
  { key: 'nr_cpf_cnpj_raiz', label: 'CNPJ Raiz', width: '140px' },
  { key: 'nr_cpf_cnpj_pagador', label: 'CNPJ Pagador', width: '180px' },
  { key: 'nr_ctrc', label: 'CTe', width: '120px' },
  { key: 'status', label: 'ANEXADO ATUA TICKET/NF', width: '220px' },
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

export const STATUS_OPERACAO = [
  "PENDENTE", "ANEXADO", "DIVERGENTE", "ILEGIVEL", "POSTO", 
  "MDF EM ABERTO", "COMPLEMENTAR", "1° PERNA", "SINISTRO", 
  "DESACORDO", "CARGA RECUSADA", "AGUARDANDO LIBERAÇÃO DO CLIENTE",
  "NÃO COBRAR / FATURAR", "COBRANÇA AUTOMÁTICA", "COMPROVANTE FROTA",
  "COMPROVANTE FINANCEIRO", "COMPROVANTE FILIAL", "EM FATURA"
];

export const STATUS_COLORS: Record<string, string> = {
  'PENDENTE': 'text-amber-600 border-amber-500/30 bg-amber-500/10',
  'DIVERGENTE': 'text-rose-600 border-rose-500/30 bg-rose-500/10',
  'ILEGIVEL': 'text-indigo-600 border-indigo-500/30 bg-indigo-500/10',
  'ANEXADO': 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
  'POSTO': 'text-blue-600 border-blue-500/30 bg-blue-500/10',
  'LIBERADA': 'text-cyan-600 border-cyan-500/30 bg-cyan-500/10',
  'MDF EM ABERTO': 'text-orange-600 border-orange-500/30 bg-orange-500/10',
  'MDF CANCELADO': 'text-slate-500 border-slate-500/30 bg-slate-500/10',
  'FILTRADA': 'text-violet-600 border-violet-500/30 bg-violet-500/10',
  'COMPLEMENTAR': 'text-sky-600 border-sky-500/30 bg-sky-500/10',
  '1° PERNA': 'text-lime-600 border-lime-500/30 bg-lime-500/10',
  'SINISTRO': 'text-red-600 border-red-500/30 bg-red-500/10',
  'DESACORDO': 'text-fuchsia-600 border-fuchsia-500/30 bg-fuchsia-500/10',
  'CARGA RECUSADA': 'text-rose-600 border-rose-500/30 bg-rose-500/10',
  'AGUARDANDO LIBERAÇÃO DO CLIENTE': 'text-teal-600 border-teal-500/30 bg-teal-500/10',
  'NÃO COBRAR / FATURAR': 'text-slate-400 border-slate-400/30 bg-slate-400/10',
  'COBRANÇA AUTOMÁTICA': 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
  'COMPROVANTE FROTA': 'text-blue-500 border-blue-500/30 bg-blue-500/10',
  'COMPROVANTE FINANCEIRO': 'text-green-500 border-green-500/30 bg-green-500/10',
  'COMPROVANTE FILIAL': 'text-violet-500 border-violet-500/30 bg-violet-500/10',
  'EM FATURA': 'text-fuchsia-500 border-fuchsia-500/30 bg-fuchsia-500/10',
};

export const getStatusStyle = (status: string, index?: number) => {
  const s = (status || "").trim().toUpperCase();
  if (STATUS_COLORS[s]) return STATUS_COLORS[s];
  
  // Hash consistente para statuses não mapeados (não depende mais de index dinâmico)
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const fallbackColors = [
    'text-fuchsia-600 border-fuchsia-500/30 bg-fuchsia-500/10',
    'text-teal-600 border-teal-500/30 bg-teal-500/10',
    'text-lime-600 border-lime-500/30 bg-lime-500/10',
    'text-sky-600 border-sky-500/30 bg-sky-500/10',
    'text-pink-600 border-pink-500/30 bg-pink-500/10'
  ];
  return fallbackColors[Math.abs(hash) % fallbackColors.length];
};
