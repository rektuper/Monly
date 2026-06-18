const CURRENCY_SYMBOLS = {
  RUB: "₽",
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export function formatCurrency(amount, currency = "RUB") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  return `${Number(amount).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

export const CURRENCY_OPTIONS = [
  { value: "RUB", label: "₽ RUB - рубль" },
  { value: "EUR", label: "€ EUR - евро" },
  { value: "USD", label: "$ USD - доллар" },
];

export const PERMISSION_LABELS = {
  owner: "Владелец",
  participant: "Участник",
  observer: "Наблюдатель",
};
