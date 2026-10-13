import { upstream } from '../lib/upstream.js';

const DAY = 86_400_000;

// Nominatim's usage policy allows at most 1 request per second; queue calls.
let nextSlot = 0;
export async function politeSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

const normalise = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * OpenStreetMap Nominatim — geocodes cities *and* travel regions (Goa, Kerala,
 * Bali, Ladakh) that city-only gazetteers miss.
 */
export async function nominatimSearch(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', addressdetails: '1', extratags: '1', 'accept-language': 'en' });

  // Only wait for a slot when the response isn't already cached.
  const results = await upstream({
    provider: 'openstreetmap',
    label: 'Nominatim geocoding',
    url: url.toString(),
    cacheTtlMs: 7 * DAY,
    timeoutMs: 8000,
    retries: 1,
    before: politeSlot,
  });
  if (!Array.isArray(results) || !results.length) return null;

  // Nominatim's order is its relevance ranking, but it can surface unrelated
  // famous places (e.g. "Paris" for "Bali"). Prefer the most important result
  // whose name actually contains the query, else trust the first result.
  const needle = normalise(query.split(',')[0]);
  const named = results.filter((r) => normalise(r.name ?? '').includes(needle));
  const best = named.length ? named.reduce((a, b) => ((b.importance ?? 0) > (a.importance ?? 0) ? b : a)) : results[0];
  const a = best.address ?? {};
  const population = Number.parseInt(best.extratags?.population, 10);
  return {
    name: best.name || query,
    displayName: best.display_name,
    kind: best.addresstype ?? best.type ?? null,
    region: a.state ?? a.region ?? a.county ?? null,
    country: a.country ?? null,
    countryCode: a.country_code?.toUpperCase() ?? null,
    lat: Number(best.lat),
    lon: Number(best.lon),
    timezone: null,
    population: Number.isFinite(population) ? population : null,
    source: 'nominatim',
  };
}
