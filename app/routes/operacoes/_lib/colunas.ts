// Espelha server/services/operacoes/colunas.ts: chave da API, rótulo, largura e tipo de cada coluna
// da grid. O frontend não importa o servidor (regra do ESLint).

export type TipoColuna = "texto" | "data" | "numero" | "moeda";

export type ColunaGrid = {
  key: string;
  label: string;
  width: number;
  tipo: TipoColuna;
  ordenavel?: boolean;
};

export const COLUNAS: ColunaGrid[] = [
  { key: "agencia", label: "Agência", width: 180, tipo: "texto" },
  { key: "dataEmissao", label: "Emissão", width: 120, tipo: "data", ordenavel: true },
  { key: "proprietario", label: "Proprietário", width: 200, tipo: "texto" },
  { key: "cliente", label: "Cliente", width: 250, tipo: "texto" },
  { key: "cnpjRaiz", label: "CNPJ Raiz", width: 140, tipo: "texto" },
  { key: "cnpjPagador", label: "CNPJ Pagador", width: 180, tipo: "texto" },
  { key: "cte", label: "CTe", width: 120, tipo: "texto", ordenavel: true },
  { key: "status", label: "Status", width: 140, tipo: "texto" },
  { key: "dataStatus", label: "Data Status", width: 150, tipo: "data", ordenavel: true },
  { key: "idSolicitacao", label: "ID Solicitação", width: 150, tipo: "texto" },
  { key: "dataQuitacao", label: "Data Quitação", width: 130, tipo: "data", ordenavel: true },
  { key: "comentarios", label: "Observação", width: 300, tipo: "texto" },
  { key: "tipoDocumento", label: "Tipo Doc", width: 100, tipo: "texto" },
  { key: "remetente", label: "Remetente", width: 250, tipo: "texto" },
  { key: "cidadeOrigem", label: "Cidade Origem", width: 180, tipo: "texto" },
  { key: "ufOrigem", label: "UF Origem", width: 80, tipo: "texto" },
  { key: "destinatario", label: "Destinatário", width: 250, tipo: "texto" },
  { key: "cidadeDestino", label: "Cidade Destino", width: 180, tipo: "texto" },
  { key: "ufDestino", label: "UF Destino", width: 80, tipo: "texto" },
  { key: "produto", label: "Produto", width: 150, tipo: "texto" },
  { key: "peso", label: "Peso (kg)", width: 120, tipo: "numero", ordenavel: true },
  { key: "tarifa", label: "Tarifa (R$)", width: 120, tipo: "moeda", ordenavel: true },
  { key: "total", label: "Total (R$)", width: 140, tipo: "moeda", ordenavel: true },
  { key: "nf", label: "NF", width: 120, tipo: "texto" },
  { key: "placa", label: "Placa", width: 120, tipo: "texto" },
  { key: "matriz", label: "Matriz", width: 200, tipo: "texto" },
  { key: "contrato", label: "Contrato", width: 120, tipo: "texto" },
  { key: "chaveAcesso", label: "Chave Acesso", width: 380, tipo: "texto" },
  { key: "usuarioLancamento", label: "Usuário", width: 180, tipo: "texto" },
  { key: "tipoCte", label: "Tipo CTe", width: 120, tipo: "texto" },
  { key: "codigoCliente", label: "Código", width: 120, tipo: "texto" },
  { key: "motorista", label: "Motorista", width: 250, tipo: "texto" },
];

// Campos que o arrastar para preencher e as ações em lote alteram.
export const CAMPOS_EM_LOTE = ["status", "comentarios", "idSolicitacao"];

// Aplica a ordem salva: as colunas da ordem primeiro, as que faltam no fim, na ordem padrão.
export function ordenarColunas(ordem: string[] | null | undefined) {
  if (!ordem?.length) return COLUNAS;
  const posicao = new Map(ordem.map((key, index) => [key, index]));
  return [...COLUNAS].sort(
    (a, b) => (posicao.get(a.key) ?? Infinity) - (posicao.get(b.key) ?? Infinity),
  );
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

export const formatarMoeda = (value: number) => BRL.format(value);

// Datas chegam em ISO à meia-noite UTC: o dia é o da parte UTC. Texto já em DD/MM fica como está
// (a célula logo depois de editada, antes de o servidor responder).
export function formatarCelula(coluna: ColunaGrid, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (coluna.tipo === "data") {
    const texto = String(value);
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
  }
  if (typeof value === "number") {
    return coluna.tipo === "moeda" ? BRL.format(value) : NUMERO.format(value);
  }
  return String(value);
}
