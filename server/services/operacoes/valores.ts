// Conversão do texto digitado na grid para o valor do banco. Datas são gravadas à meia-noite UTC,
// como a importação grava.

const DATA_BR = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
const DATA_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;

function utc(ano: number, mes: number, dia: number) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // 31/02 vira 03/03 no Date: confere se o dia continua o mesmo.
  return data.getUTCDate() === dia && data.getUTCMonth() === mes - 1 ? data : null;
}

// DD/MM/AAAA, DD/MM/AA, DD/MM (ano corrente) ou AAAA-MM-DD. null para texto que não é data.
export function parseData(valor: string): Date | null {
  const texto = valor.trim();
  const br = texto.match(DATA_BR);
  if (br) {
    let ano = br[3] ? Number(br[3]) : new Date().getUTCFullYear();
    if (ano < 100) ano += 2000;
    return utc(ano, Number(br[2]), Number(br[1]));
  }
  const iso = texto.match(DATA_ISO);
  if (iso) return utc(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

// "1.234,56", "1234,56" ou "1234.56". null para texto que não é número.
export function parseNumero(valor: string): number | null {
  const texto = valor.trim().replace(/\s|R\$/g, "");
  if (texto === "") return null;
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}
