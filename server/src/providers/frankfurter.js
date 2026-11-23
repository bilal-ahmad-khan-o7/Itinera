import { upstream } from '../lib/upstream.js';

const HOUR = 3_600_000;

// Currencies published by the European Central Bank (Frankfurter's source).
export const SUPPORTED_CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CHF', 'CNY', 'HKD', 'NZD',
  'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'ZAR', 'SEK', 'NOK', 'DKK', 'TRY', 'BRL', 'MXN',
  'PLN', 'CZK', 'HUF', 'RON', 'ISK', 'ILS', 'BGN',
];

/** Frankfurter API — daily ECB reference exchange rates. */
export async function latestRates(base = 'INR', symbols = []) {
  const url = new URL('https://api.frankfurter.dev/v1/latest');
  url.searchParams.set('base', base);
  const wanted = symbols.filter((s) => s !== base && SUPPORTED_CURRENCIES.includes(s));
  if (wanted.length) url.searchParams.set('symbols', wanted.join(','));

  const data = await upstream({ provider: 'frankfurter', label: 'Latest rates', url: url.toString(), cacheTtlMs: 6 * HOUR });
  return { base: data.base, date: data.date, rates: { [base]: 1, ...data.rates } };
}
