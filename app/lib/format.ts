const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const number = new Intl.NumberFormat("pt-BR");

export function formatDateTime(iso: string | null | undefined, fallback = "Nunca") {
  return iso ? dateTime.format(new Date(iso)) : fallback;
}

export function formatNumber(value: number) {
  return number.format(value);
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moneyCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(value: number) {
  return money.format(value);
}

// Para card de número: "R$ 12,3 mil".
export function formatMoneyCompact(value: number) {
  return value < 10_000 ? money.format(value) : moneyCompact.format(value);
}

// "2026-10-05" -> "05/10/2026". Data sem hora: não passa por Date, para o fuso não trocar o dia.
export function formatDate(value: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
