/**
 * Constantes de domínio relacionadas às Operações.
 */

export const COLUNAS_OPERACAO = [
  { key: 'nm_agencia', label: 'Agência', width: '180px' },
  { key: 'dt_emissao_', label: 'Emissão', width: '120px' },
  { key: 'cd_pessoa_pagador', label: 'Código', width: '120px' },
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
  { key: 'nm_proprietario_posse_cavalo', label: 'Proprietário', width: '200px' },
  { key: 'nm_motorista', label: 'Motorista', width: '250px' },
];

export const STATUS_OPERACAO = [
  "PENDENTE", "ANEXADO", "DIVERGENTE", "ILEGIVEL", "POSTO", 
  "MDF EM ABERTO", "COMPLEMENTAR", "1° PERNA", "SINISTRO", 
  "DESACORDO", "CARGA RECUSADA", "AGUARDANDO LIBERAÇÃO DO CLIENTE",
  "NÃO COBRAR / FATURAR", "COBRANÇA AUTOMÁTICA"
];
