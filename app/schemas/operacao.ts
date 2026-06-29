/**
 * Interface Unificada para Operações Logísticas
 * Substitui o Zod por uma estrutura nativa do TypeScript para maior performance
 * e para permitir uma inserção de dados mais tolerante na importação.
 */
export interface OperacaoType {
  nm_agencia: string;
  dt_emissao_: Date | null;
  cd_pessoa_pagador?: string | null;
  nm_pessoa_pagador?: string | null;
  nr_cpf_cnpj_raiz?: string | null;
  nr_cpf_cnpj_pagador?: string | null;
  nr_ctrc: string;
  id_tipo_documento?: string | null;
  nm_pessoa_remetente?: string | null;
  nm_cidade_origem?: string | null;
  ds_sigla_origem?: string | null;
  nm_pessoa_destinatario?: string | null;
  nm_cidade_destino?: string | null;
  ds_sigla_destino?: string | null;
  nm_produto?: string | null;
  vl_peso?: number | null;
  vl_tarifa?: number | null;
  vl_total?: number | null;
  nr_nf?: string | null;
  ds_placa?: string | null;
  nm_pessoa_matriz?: string | null;
  nr_contrato?: string | null;
  nr_chave_acesso?: string | null;
  nm_pessoa_usuario_lancamento?: string | null;
  id_tipo_ctrc?: string | null;
  nm_proprietario_posse_cavalo?: string | null;
  nm_motorista?: string | null;
  status?: string | null;
  comentarios?: string | null;
}
