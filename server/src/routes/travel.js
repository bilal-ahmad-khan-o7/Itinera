import { Router } from 'express';
import { z } from 'zod';
import { ok, validate } from '../lib/http.js';
import { forecast } from '../providers/openMeteo.js';
import { resolvePlace } from '../services/geo.js';
import { destinationSummary } from '../providers/wikipedia.js';
import { latestRates, SUPPORTED_CURRENCIES } from '../providers/frankfurter.js';
import { hotelsNear } from '../providers/openStreetMap.js';
import { currencyFor, flagEmoji } from '../data/countries.js';

export const travelRouter = Router();

const currency = z.string().trim().toUpperCase().length(3);

/**
 * GET /api/destination?city=Jaipur&base=INR
 * API orchestration: geocode first (Nominatim, falling back to Open-Meteo),
 * then weather, Wikipedia and FX in parallel. Partial failures degrade
 * gracefully into `warnings` instead of failing the whole response.
 */
travelRouter.get(
  '/destination',
  validate(z.object({ city: z.string().trim().min(2).max(80), base: currency.default('INR') }), 'query'),
  async (req, res) => {
    const { city, base } = req.valid;
    const place = await resolvePlace(city);
    const localCurrency = currencyFor(place.countryCode);
    const symbols = [...new Set([localCurrency, 'USD', 'EUR', 'GBP'].filter((c) => c && c !== base))];

    const [weather, wiki, fx] = await Promise.allSettled([
      forecast(place.lat, place.lon),
      destinationSummary(place.name, place.country, city),
      latestRates(base, symbols),
    ]);

    const warnings = place.fallbackReason ? [{ source: 'geocoding', message: `Used Open-Meteo fallback: ${place.fallbackReason}` }] : [];
    const settled = (result, name) => {
      if (result.status === 'fulfilled') return result.value;
      warnings.push({ source: name, message: result.reason?.message ?? 'Unavailable' });
      return null;
    };
    const weatherData = settled(weather, 'weather');

    ok(res, {
      place: {
        ...place,
        timezone: place.timezone ?? weatherData?.timezone ?? null,
        flag: flagEmoji(place.countryCode),
        currency: localCurrency,
        currencySupported: localCurrency ? SUPPORTED_CURRENCIES.includes(localCurrency) : false,
      },
      weather: weatherData,
      wiki: settled(wiki, 'wikipedia'),
      fx: settled(fx, 'fx'),
      warnings,
    });
  },
);

/** GET /api/fx?base=INR&symbols=USD,EUR — live ECB reference rates. */
travelRouter.get(
  '/fx',
  validate(
    z.object({
      base: currency.default('INR'),
      symbols: z
        .string()
        .default('USD,EUR,GBP,AED,SGD,THB')
        .transform((s) => s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)),
    }),
    'query',
  ),
  async (req, res) => {
    const { base, symbols } = req.valid;
    ok(res, { ...(await latestRates(base, symbols)), supported: SUPPORTED_CURRENCIES });
  },
);

/** GET /api/hotels/real?city=Jaipur&radius=5000 — real hotels from OpenStreetMap. */
travelRouter.get(
  '/hotels/real',
  validate(
    z.object({
      city: z.string().trim().min(2).max(80),
      radius: z.coerce.number().int().min(500).max(25000).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const { city } = req.valid;
    const place = await resolvePlace(city);
    const radius = req.valid.radius ?? place.searchRadius;
    const { hotels, source, fallbackReason } = await hotelsNear(place.lat, place.lon, radius);
    ok(res, { place, radius, hotels, source, fallbackReason, attribution: '© OpenStreetMap contributors (ODbL)' });
  },
);
