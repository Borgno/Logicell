// Colunas da grid de operações: a chave da API (camelCase, nome de domínio), a coluna do banco e o
// tipo. É a lista única que a listagem, os filtros, a ordenação, a edição e a planilha consultam;
// coluna fora daqui não é lida nem gravada pela API.

export type TipoColuna = "texto" | "data" | "numero";

export type Coluna = {
  key: string;
  db: string;
  label: string;
  tipo: TipoColuna;
  // Ordenável no servidor. As outras ficam na ordem padrão (id decrescente).
  ordenavel?: boolean;
  // "Igual a" compara exato, sem ILIKE (campos de documento com índice b-tree).
  exato?: boolean;
  // Obrigatória no banco: a edição recusa vazio.
  obrigatoria?: boolean;
};

export const COLUNAS: Coluna[] = [
  { key: "agencia", db: "nm_agencia", label: "Agência", tipo: "texto", obrigatoria: true },
  { key: "dataEmissao", db: "dt_emissao_", label: "Emissão", tipo: "data", ordenavel: true },
  { key: "proprietario", db: "nm_proprietario_posse_cavalo", label: "Proprietário", tipo: "texto" },
  { key: "cliente", db: "nm_pessoa_pagador", label: "Cliente", tipo: "texto" },
  { key: "cnpjRaiz", db: "nr_cpf_cnpj_raiz", label: "CNPJ Raiz", tipo: "texto" },
  { key: "cnpjPagador", db: "nr_cpf_cnpj_pagador", label: "CNPJ Pagador", tipo: "texto" },
  { key: "cte", db: "nr_ctrc", label: "CTe", tipo: "texto", ordenavel: true, obrigatoria: true },
  { key: "status", db: "status", label: "Status", tipo: "texto" },
  { key: "dataStatus", db: "data_status", label: "Data Status", tipo: "data", ordenavel: true },
  { key: "idSolicitacao", db: "id_solicitacao", label: "ID Solicitação", tipo: "texto" },
  {
    key: "dataQuitacao",
    db: "dt_quitacao_saldo",
    label: "Data Quitação",
    tipo: "data",
    ordenavel: true,
  },
  { key: "comentarios", db: "comentarios", label: "Observação", tipo: "texto" },
  { key: "tipoDocumento", db: "id_tipo_documento", label: "Tipo Doc", tipo: "texto" },
  { key: "remetente", db: "nm_pessoa_remetente", label: "Remetente", tipo: "texto" },
  { key: "cidadeOrigem", db: "nm_cidade_origem", label: "Cidade Origem", tipo: "texto" },
  { key: "ufOrigem", db: "ds_sigla_origem", label: "UF Origem", tipo: "texto" },
  { key: "destinatario", db: "nm_pessoa_destinatario", label: "Destinatário", tipo: "texto" },
  { key: "cidadeDestino", db: "nm_cidade_destino", label: "Cidade Destino", tipo: "texto" },
  { key: "ufDestino", db: "ds_sigla_destino", label: "UF Destino", tipo: "texto" },
  { key: "produto", db: "nm_produto", label: "Produto", tipo: "texto" },
  { key: "peso", db: "vl_peso", label: "Peso (kg)", tipo: "numero", ordenavel: true },
  { key: "tarifa", db: "vl_tarifa", label: "Tarifa (R$)", tipo: "numero", ordenavel: true },
  { key: "total", db: "vl_total", label: "Total (R$)", tipo: "numero", ordenavel: true },
  { key: "nf", db: "nr_nf", label: "NF", tipo: "texto", exato: true },
  { key: "placa", db: "ds_placa", label: "Placa", tipo: "texto" },
  { key: "matriz", db: "nm_pessoa_matriz", label: "Matriz", tipo: "texto" },
  { key: "contrato", db: "nr_contrato", label: "Contrato", tipo: "texto", exato: true },
  { key: "chaveAcesso", db: "nr_chave_acesso", label: "Chave Acesso", tipo: "texto", exato: true },
  { key: "usuarioLancamento", db: "nm_pessoa_usuario_lancamento", label: "Usuário", tipo: "texto" },
  { key: "tipoCte", db: "id_tipo_ctrc", label: "Tipo CTe", tipo: "texto" },
  { key: "codigoCliente", db: "cd_pessoa_pagador", label: "Código", tipo: "texto" },
  { key: "motorista", db: "nm_motorista", label: "Motorista", tipo: "texto" },
];

export const COLUNA_KEYS = COLUNAS.map((coluna) => coluna.key) as [string, ...string[]];

const porKey = new Map(COLUNAS.map((coluna) => [coluna.key, coluna]));
const porDb = new Map(COLUNAS.map((coluna) => [coluna.db, coluna]));

export function colunaPorKey(key: string) {
  return porKey.get(key);
}

// A ordem de colunas salva pelo sistema antigo usa o nome do banco: traduz para a chave da API e
// descarta o que não existe mais.
export function traduzirOrdem(ordem: string[]) {
  return ordem
    .map((item) => (porKey.has(item) ? item : porDb.get(item)?.key))
    .filter((item): item is string => item !== undefined);
}

// Campos que as ações em lote e o arrastar para preencher alteram.
export const CAMPOS_EM_LOTE = ["status", "comentarios", "idSolicitacao"] as const;
