import type { Currency } from "./types";

const CURRENCY_CONFIG: Record<Currency, { locale: string; decimals: number }> = {
  USD: { locale: "en-US", decimals: 2 },
  CAD: { locale: "en-CA", decimals: 2 },
  MAD: { locale: "fr-MA", decimals: 2 },
  IDR: { locale: "id-ID", decimals: 0 },
};

export function formatCurrency(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}
