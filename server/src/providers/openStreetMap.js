import { upstream } from '../lib/upstream.js';
import { politeSlot } from './nominatim.js';

const DAY = 86_400_000;

const AMENITY_TAGS = [
  ['internet_access', (v) => v && v !== 'no', 'Wi-Fi'],
  ['swimming_pool', (v) => v === 'yes', 'Pool'],
  ['breakfast', (v) => v && v !== 'no', 'Breakfast'],
  ['parking', (v) => v && v !== 'no', 'Parking'],
  ['air_conditioning', (v) => v === 'yes', 'Air conditioning'],
  ['wheelchair', (v) => v === 'yes', 'Wheelchair access'],
  ['restaurant', (v) => v === 'yes', 'Restaurant'],
  ['bar', (v) => v === 'yes', 'Bar'],
];

/** Normalise OSM tags (from Overpass `tags` or Nominatim `extratags`) into one hotel shape. */
function toHotel({ type, id, name, tags = {}, address, lat, lon }) {
  const stars = Number.parseFloat(tags.stars);
  return {
    id: `${type}/${id}`,
    name: name ?? tags.name,
    stars: Number.isFinite(stars) ? stars : null,
    address: address || null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    website: tags.website ?? tags['contact:website'] ?? null,
    email: tags.email ?? tags['contact:email'] ?? null,
    rooms: Number.parseInt(tags.rooms, 10) || null,
    brand: tags.brand ?? tags.operator ?? null,
    amenities: AMENITY_TAGS.filter(([tag, test]) => test(tags[tag])).map(([, , label]) => label),
    lat: Number(lat),
    lon: Number(lon),
    osmUrl: `https://www.openstreetmap.org/${type}/${id}`,
  };
}

function bbox(lat, lon, radiusMeters) {
  const dLat = radiusMeters / 111_320;
  const dLon = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, west: lon - dLon, north: lat + dLat, east: lon + dLon };
}

/** Overpass API: a bounding-box query over hotel nodes (≈10x faster than `around:` over all element types). */
async function viaOverpass(box, limit) {
  const b = [box.south, box.west, box.north, box.east].map((n) => n.toFixed(5)).join(',');
  const query = `[out:json][timeout:10];node["tourism"="hotel"]["name"](${b});out tags ${limit};`;
  const data = await upstream({
    provider: 'openstreetmap',
    label: 'Overpass hotels',
    url: 'https://overpass-api.de/api/interpreter',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }).toString(),
    timeoutMs: 12_000,
    retries: 0, // fail fast; Nominatim is the fallback
    cacheTtlMs: DAY,
  });
  return (data.elements ?? []).map((el) => {
    const t = el.tags ?? {};
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] ?? t['addr:district'], t['addr:city'], t['addr:postcode']].filter(Boolean).join(', ');
    return toHotel({ type: el.type, id: el.id, tags: t, address, lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon });
  });
}

/** Nominatim: the special phrase "hotel" inside a bounded viewbox returns up to 40 tourism=hotel objects. */
async function viaNominatim(box) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: 'hotel',
    format: 'jsonv2',
    limit: '40',
    extratags: '1',
    addressdetails: '1',
    'accept-language': 'en',
    bounded: '1',
    viewbox: [box.west, box.north, box.east, box.south].map((n) => n.toFixed(5)).join(','),
  });
  const results = await upstream({ provider: 'openstreetmap', label: 'Nominatim hotels', url: url.toString(), timeoutMs: 10_000, retries: 1, cacheTtlMs: DAY, before: politeSlot });
  return (results ?? [])
    .filter((r) => r.category === 'tourism' && r.type === 'hotel')
    .map((r) => {
      const a = r.address ?? {};
      const address = [a.house_number, a.road, a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.village, a.postcode].filter(Boolean).join(', ');
      return toHotel({ type: r.osm_type, id: r.osm_id, name: r.name, tags: r.extratags ?? {}, address, lat: r.lat, lon: r.lon });
    });
}

/**
 * Real, community-mapped hotels around a point (data © OpenStreetMap contributors, ODbL).
 * Primary: Overpass. Fallback: Nominatim, because the public Overpass servers
 * are frequently overloaded and return 504s.
 */
export async function hotelsNear(lat, lon, radiusMeters = 5000, limit = 60) {
  const box = bbox(lat, lon, radiusMeters);
  let hotels;
  let source = 'overpass';
  let fallbackReason = null;
  try {
    hotels = await viaOverpass(box, limit);
  } catch (err) {
    fallbackReason = err.message;
    source = 'nominatim';
    hotels = await viaNominatim(box);
  }

  const seen = new Set();
  const unique = hotels
    .filter((h) => h.name && !seen.has(h.name.toLowerCase()) && seen.add(h.name.toLowerCase()))
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || Number(Boolean(b.website)) - Number(Boolean(a.website)));
  return { hotels: unique, source, fallbackReason };
}
