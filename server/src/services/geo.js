import { nominatimSearch } from '../providers/nominatim.js';
import { geocode as openMeteoGeocode } from '../providers/openMeteo.js';
import { AppError } from '../lib/errors.js';

const REGION_KINDS = new Set(['state', 'region', 'province', 'island', 'archipelago', 'county', 'state_district', 'country', 'administrative']);

/**
 * Resolve a free-text destination to coordinates.
 * Primary: Nominatim (handles regions like "Goa" or "Kerala").
 * Fallback: Open-Meteo geocoding, used if Nominatim is down or finds nothing.
 */
export async function resolvePlace(query) {
  let primaryError;
  try {
    const place = await nominatimSearch(query);
    if (place) return withScope(place);
  } catch (err) {
    primaryError = err;
  }

  try {
    const place = await openMeteoGeocode(query);
    return withScope({ ...place, source: 'open-meteo', fallbackReason: primaryError ? primaryError.message : 'No match from Nominatim' });
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      throw new AppError(404, 'PLACE_NOT_FOUND', `Couldn't find a place called "${query}"`);
    }
    throw primaryError ?? err;
  }
}

function withScope(place) {
  const isRegion = REGION_KINDS.has(place.kind);
  return { ...place, isRegion, searchRadius: isRegion ? 15_000 : 5_000 };
}
