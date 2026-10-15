import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { ApiProblem } from "../../lib/problem";

// Leitura da planilha do ERP. O ERP exporta .xls (o formato binário antigo do Excel), que só o SheetJS
// lê: é a versão 0.20.3, da distribuição da própria SheetJS, porque a do npm parou na 0.18.5 com CVEs
// abertas. Reproduz campo a campo o parser antigo, porque a assinatura de cada linha precisa sair
// idêntica: é por ela que o modo Substituir decide o que apagar. Conferido contra a cópia de produção: 7.443 de 7.453 operações batem; as 10 restantes
// foram editadas na grid depois de importadas, e a edição não recalcula a assinatura.

// Maiúsculas, sem acento, sem espaço nem "_": "Nº Agência" e "nm_agencia" viram a mesma chave.
const cache = new Map<string, string>();
export function normalizarChave(valor: string) {
  let limpo = cache.get(valor);
  if (limpo === undefined) {
    limpo = valor
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[\s_]+/g, "");
    cache.set(valor, limpo);
  }
  return limpo;
}

const OBRIGATORIAS = [
  { nome: "AGÊNCIA", chaves: ["NMAGENCIA", "AGENCIA"] },
  { nome: "CTRC", chaves: ["NRCTRC", "CTRC", "CTE"] },
  { nome: "NF", chaves: ["NRNF", "NF", "NOTAFISCAL"] },
  { nome: "VALOR TOTAL", chaves: ["VLTOTAL", "VALORTOTAL", "TOTAL", "VALOR"] },
];

// Chaves que marcam a linha do cabeçalho: a planilha real tem uma linha de totais em cima.
const MARCAS_CABECALHO = ["NMAGENCIA", "AGENCIA", "NRCTRC", "CTRC", "VLTOTAL", "VALORTOTAL"];

export type OperacaoImportada = {
  nm_agencia: string;
  dt_emissao_: Date | null;
  cd_pessoa_pagador: string;
  nm_pessoa_pagador: string;
  nr_cpf_cnpj_raiz: string;
  nr_cpf_cnpj_pagador: string;
  nr_ctrc: string;
  id_tipo_documento: string;
  nm_pessoa_remetente: string;
  nm_cidade_origem: string;
  ds_sigla_origem: string;
  nm_pessoa_destinatario: string;
  nm_cidade_destino: string;
  ds_sigla_destino: string;
  nm_produto: string;
  vl_peso: number;
  vl_tarifa: number;
  vl_total: number | null;
  nr_nf: string | null;
  ds_placa: string;
  nm_pessoa_matriz: string;
  nr_contrato: string;
  nr_chave_acesso: string;
  nm_pessoa_usuario_lancamento: string;
  id_tipo_ctrc: string;
  nm_proprietario_posse_cavalo: string;
  nm_motorista: string;
  status: string | null;
  comentarios: string | null;
  dt_quitacao_saldo: Date | null;
  hash_assinatura: string;
};

type Valor = string | number | boolean | Date | null;

// Data da planilha à meia-noite UTC. Com cellDates, o SheetJS monta o Date no fuso do processo: o dia
// certo sai dos getters locais, e não dos UTC. Texto em DD/MM/AAAA, DD/MM/AA, DD/MM ou AAAA-MM-DD também
// vale.
export function parseDataPlanilha(valor: Valor): Date | null {
  if (valor === null || valor === "") return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()));
  }
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (br) {
    let ano = br[3] ? Number(br[3]) : new Date().getUTCFullYear();
    if (ano < 100) ano += 2000;
    return new Date(Date.UTC(ano, Number(br[2]) - 1, Number(br[1])));
  }
  const iso = texto.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const fallback = new Date(texto);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
}

export function padronizarAgencia(nome: string) {
  if (!nome) return "";
  return nome
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

// Documento CE com valor total zero ou vazio não é operação: sai da importação.
function ceComValorZero(tipoDoc: Valor, valorTotal: Valor) {
  const tipo = tipoDoc === null ? "" : String(tipoDoc).trim().toUpperCase();
  if (tipo !== "CE") return false;
  if (valorTotal === null) return true;
  if (typeof valorTotal === "number") return valorTotal === 0;
  const texto = String(valorTotal).trim();
  if (texto === "") return true;
  const numero = Number(texto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero === 0;
}

// SHA-256 de agência|CTRC|NF|valor total com duas casas. É a identidade da linha entre importações.
export function assinatura(
  op: Pick<OperacaoImportada, "nm_agencia" | "nr_ctrc" | "nr_nf" | "vl_total">,
) {
  const valor = op.vl_total ? op.vl_total.toFixed(2) : "0.00";
  return createHash("sha256")
    .update(`${op.nm_agencia}|${op.nr_ctrc}|${op.nr_nf || ""}|${valor}`)
    .digest("hex");
}

// Uma linha da planilha, já com as chaves normalizadas, para a operação. null quando é um CE zerado.
export function mapearLinha(linha: Record<string, Valor>): OperacaoImportada | null {
  const get = (...chaves: string[]): Valor => {
    for (const chave of chaves) {
      const valor = linha[normalizarChave(chave)];
      if (valor !== undefined && valor !== null && String(valor).trim() !== "") return valor;
    }
    return null;
  };
  const texto = (...chaves: string[]) => String(get(...chaves) || "");

  const valorTotal = get("vl_total", "VALOR TOTAL", "TOTAL", "VALOR");
  const nf = get("nr_nf", "NF", "NOTA FISCAL");
  const status = get("status");
  const comentarios = get("comentarios", "OBSERVAÇÃO", "OBSERVACAO");

  const op: Omit<OperacaoImportada, "hash_assinatura"> = {
    nm_agencia: padronizarAgencia(
      String(get("nm_agencia", "AGÊNCIA", "AGENCIA") || "DESCONHECIDA"),
    ),
    dt_emissao_: parseDataPlanilha(get("DT_EMISSAO_", "DATA EMISSÃO", "EMISSÃO", "EMISSAO")),
    cd_pessoa_pagador: texto("cd_pessoa_pagador", "CÓD. PAGADOR", "COD PAGADOR", "CÓDIGO"),
    nm_pessoa_pagador: texto("nm_pessoa_pagador", "PAGADOR", "CLIENTE"),
    nr_cpf_cnpj_raiz: texto("nr_cpf_cnpj_raiz", "CNPJ RAIZ", "RAIZ"),
    nr_cpf_cnpj_pagador: texto("nr_cpf_cnpj_pagador", "CPF/CNPJ PAGADOR", "CNPJ"),
    nr_ctrc: String(get("nr_ctrc", "CTRC", "CTE", "CT-E") || "0").trim(),
    id_tipo_documento: texto("id_tipo_documento", "TIPO DOC", "TIPO"),
    nm_pessoa_remetente: texto("nm_pessoa_remetente", "REMETENTE"),
    nm_cidade_origem: texto("nm_cidade_origem", "CIDADE ORIGEM", "ORIGEM"),
    ds_sigla_origem: texto("ds_sigla_origem", "UF ORIGEM", "UF_ORI"),
    nm_pessoa_destinatario: texto("nm_pessoa_destinatario", "DESTINATÁRIO", "DESTINATARIO"),
    nm_cidade_destino: texto("nm_cidade_destino", "CIDADE DESTINO", "DESTINO"),
    ds_sigla_destino: texto("ds_sigla_destino", "UF DESTINO", "UF_DES"),
    nm_produto: texto("nm_produto", "PRODUTO"),
    vl_peso: Number(get("vl_peso", "PESO", "PESO REAL") || 0),
    vl_tarifa: Number(get("vl_tarifa", "TARIFA") || 0),
    vl_total: valorTotal ? Number(valorTotal) : null,
    nr_nf: nf ? String(nf).trim() : null,
    ds_placa: texto("ds_placa", "PLACA"),
    nm_pessoa_matriz: texto("nm_pessoa_matriz", "MATRIZ"),
    nr_contrato: texto("nr_contrato", "CONTRATO"),
    nr_chave_acesso: texto("nr_chave_acesso", "CHAVE ACESSO", "CHAVE DE ACESSO"),
    nm_pessoa_usuario_lancamento: texto("nm_pessoa_usuario_lancamento", "USUÁRIO", "USUARIO"),
    id_tipo_ctrc: texto("id_tipo_ctrc", "TIPO CTE"),
    nm_proprietario_posse_cavalo: texto(
      "nm_proprietario_posse_cavalo",
      "PROPRIETÁRIO",
      "PROPRIETARIO",
    ),
    nm_motorista: texto("nm_motorista", "MOTORISTA"),
    status: status ? String(status).trim().toUpperCase() : null,
    comentarios: comentarios ? String(comentarios).trim() : null,
    dt_quitacao_saldo: parseDataPlanilha(
      get("DT_QUITACAO_SALDO", "DATA QUITAÇÃO", "DATA QUITACAO", "QUITAÇÃO", "QUITACAO"),
    ),
  };

  if (ceComValorZero(get("id_tipo_documento", "TIPO DOC", "TIPO"), valorTotal)) return null;
  return { ...op, hash_assinatura: assinatura(op) };
}

const invalida = (detail: string) => new ApiProblem(422, "PLANILHA_INVALIDA", detail);

// Lê a primeira aba. O cabeçalho é a primeira linha usada, ou a segunda quando a primeira é a linha
// de totais.
export async function lerPlanilha(buffer: Buffer) {
  let sheet: XLSX.WorkSheet | undefined;
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    sheet = workbook.Sheets[workbook.SheetNames[0]];
  } catch {
    throw invalida("O arquivo não é uma planilha do Excel válida.");
  }
  const ref = sheet?.["!ref"];
  if (!sheet || !ref) throw invalida("Planilha vazia.");

  // Só as duas primeiras linhas da área usada, para achar o cabeçalho sem converter a planilha
  // inteira duas vezes.
  const area = XLSX.utils.decode_range(ref);
  const primeiras = XLSX.utils.sheet_to_json<Valor[]>(sheet, {
    header: 1,
    range: {
      s: { r: area.s.r, c: area.s.c },
      e: { r: Math.min(area.s.r + 1, area.e.r), c: area.e.c },
    },
  });
  const indiceCabecalho = Math.max(
    0,
    primeiras.findIndex((valores) =>
      (valores ?? []).some(
        (valor) => valor !== null && MARCAS_CABECALHO.includes(normalizarChave(String(valor))),
      ),
    ),
  );

  const linhas = XLSX.utils.sheet_to_json<Record<string, Valor>>(sheet, {
    range: area.s.r + indiceCabecalho,
  });
  if (linhas.length === 0) throw invalida("Não há dados na planilha além dos cabeçalhos.");

  const chaves = Object.keys(linhas[0]).map(normalizarChave);
  const faltando = OBRIGATORIAS.filter(
    ({ chaves: aceitas }) => !aceitas.some((chave) => chaves.includes(chave)),
  );
  if (faltando.length > 0) {
    throw invalida(
      `Arquivo com cabeçalhos incorretos. Colunas obrigatórias faltando: ${faltando.map((item) => item.nome).join(", ")}.`,
    );
  }

  const operacoes: OperacaoImportada[] = [];
  for (const linha of linhas) {
    const normalizada: Record<string, Valor> = {};
    for (const [chave, valor] of Object.entries(linha)) normalizada[normalizarChave(chave)] = valor;
    const op = mapearLinha(normalizada);
    if (op) operacoes.push(op);
  }
  return { operacoes, totalLido: linhas.length };
}
