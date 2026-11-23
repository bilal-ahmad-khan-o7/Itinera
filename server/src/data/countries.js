// ISO 3166-1 alpha-2 → ISO 4217 currency, for destinations an Indian travel desk
// sells most often. Used to pick the local currency for live FX conversion.
const CURRENCY_BY_COUNTRY = {
  IN: 'INR', AE: 'AED', TH: 'THB', SG: 'SGD', MY: 'MYR', ID: 'IDR', VN: 'VND', LK: 'LKR',
  MV: 'MVR', NP: 'NPR', BT: 'BTN', BD: 'BDT', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD',
  PH: 'PHP', KH: 'KHR', LA: 'LAK', MM: 'MMK', US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL',
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR', HR: 'EUR', SI: 'EUR', SK: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', CH: 'CHF', NO: 'NOK', SE: 'SEK',
  DK: 'DKK', IS: 'ISK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', TR: 'TRY',
  AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', KE: 'KES', TZ: 'TZS', EG: 'EGP', MA: 'MAD', MU: 'MUR',
  SC: 'SCR', IL: 'ILS', JO: 'JOD', OM: 'OMR', QA: 'QAR', SA: 'SAR', BH: 'BHD', KW: 'KWD',
  AZ: 'AZN', GE: 'GEL', AM: 'AMD', KZ: 'KZT', UZ: 'UZS', RU: 'RUB', RS: 'RSD', AR: 'ARS',
  CL: 'CLP', PE: 'PEN', CO: 'COP',
};

export function currencyFor(countryCode) {
  return CURRENCY_BY_COUNTRY[countryCode?.toUpperCase()] ?? null;
}

/** Turn "IN" into the 🇮🇳 regional-indicator emoji. */
export function flagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return null;
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
