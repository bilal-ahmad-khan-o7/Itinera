import { upstream } from '../lib/upstream.js';
import { AppError } from '../lib/errors.js';

const HOUR = 3_600_000;

// WMO weather interpretation codes → human label + icon key used by the client.
const WMO = {
  0: ['Clear sky', 'sun'],
  1: ['Mainly clear', 'sun'],
  2: ['Partly cloudy', 'cloud-sun'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'],
  48: ['Rime fog', 'fog'],
  51: ['Light drizzle', 'drizzle'],
  53: ['Drizzle', 'drizzle'],
  55: ['Heavy drizzle', 'drizzle'],
  56: ['Freezing drizzle', 'drizzle'],
  57: ['Freezing drizzle', 'drizzle'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Rain showers', 'rain'],
  81: ['Rain showers', 'rain'],
  82: ['Violent showers', 'storm'],
  85: ['Snow showers', 'snow'],
  86: ['Snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm, hail', 'storm'],
  99: ['Thunderstorm, hail', 'storm'],
};

export function describeWeather(code) {
  const [label, icon] = WMO[code] ?? ['Unknown', 'cloud'];
  return { code, label, icon };
}

/** Open-Meteo Geocoding API — city name → coordinates, country and timezone. */
export async function geocode(name) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' });

  const data = await upstream({ provider: 'open-meteo', label: 'Geocoding', url: url.toString(), cacheTtlMs: 24 * HOUR });
  const results = data?.results ?? [];
  if (!results.length) throw new AppError(404, 'PLACE_NOT_FOUND', `Couldn't find a place called "${name}"`);

  // Prefer populated places, then the most populous match.
  const best =
    results.filter((r) => r.feature_code?.startsWith('PPL')).sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0] ??
    results[0];

  return {
    name: best.name,
    displayName: [best.name, best.admin1, best.country].filter(Boolean).join(', '),
    kind: best.feature_code?.startsWith('PPL') ? 'city' : best.feature_code ?? null,
    region: best.admin1 ?? null,
    country: best.country ?? null,
    countryCode: best.country_code ?? null,
    lat: best.latitude,
    lon: best.longitude,
    timezone: best.timezone ?? null,
    population: best.population ?? null,
    elevation: best.elevation ?? null,
  };
}

/** Open-Meteo Forecast API — current conditions and a 7-day outlook. */
export async function forecast(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
  });

  const data = await upstream({ provider: 'open-meteo', label: 'Forecast', url: url.toString(), cacheTtlMs: 30 * 60_000 });
  const d = data.daily;

  return {
    timezone: data.timezone,
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      isDay: data.current.is_day === 1,
      ...describeWeather(data.current.weather_code),
    },
    daily: d.time.map((date, i) => ({
      date,
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      rainChance: d.precipitation_probability_max[i],
      uv: d.uv_index_max[i],
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
      ...describeWeather(d.weather_code[i]),
    })),
  };
}
