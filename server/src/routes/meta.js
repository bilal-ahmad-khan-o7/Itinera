import { Router } from 'express';
import { config, demoMode } from '../config.js';
import { ok } from '../lib/http.js';
import { upstream } from '../lib/upstream.js';
import { cache } from '../lib/cache.js';
import { providerStats, recentEntries, traceEvents } from '../lib/trace.js';

export const metaRouter = Router();

const INTEGRATIONS = [
  {
    id: 'llm',
    name: 'Groq LLM',
    category: 'Generative AI',
    auth: 'Bearer API key (server-side only)',
    docs: 'https://console.groq.com/docs/api-reference',
    pattern: 'JSON mode + Server-Sent Events streaming',
    usedFor: ['Enquiry → lead extraction', 'Sample hotel inventory', 'Streaming day-wise itineraries', 'Client email & WhatsApp drafts'],
    caching: 'None (every prompt is unique)',
  },
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    category: 'Geocoding & weather',
    auth: 'None (free, fair use)',
    docs: 'https://open-meteo.com/en/docs',
    pattern: 'REST GET with query parameters',
    usedFor: ['7-day forecast for the travel window', 'Fallback geocoder when Nominatim is unavailable'],
    caching: 'Geocoding 24 h · Forecast 30 min',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia REST',
    category: 'Destination content',
    auth: 'None (User-Agent required)',
    docs: 'https://en.wikipedia.org/api/rest_v1/',
    pattern: 'REST GET with fallback on disambiguation',
    usedFor: ['Destination description', 'Hero image for quotations'],
    caching: '24 h',
  },
  {
    id: 'frankfurter',
    name: 'Frankfurter',
    category: 'Currency exchange',
    auth: 'None (free)',
    docs: 'https://frankfurter.dev',
    pattern: 'REST GET, ECB daily reference rates',
    usedFor: ['Quote totals in the client’s currency', 'Local currency at destination'],
    caching: '6 h',
  },
  {
    id: 'openstreetmap',
    name: 'OpenStreetMap',
    category: 'Geocoding & real places',
    auth: 'None (User-Agent + 1 req/s policy)',
    docs: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
    pattern: 'Nominatim REST GET + Overpass QL POST, with Nominatim as the hotel fallback',
    usedFor: ['Destination → coordinates (cities and regions like Goa, Kerala, Bali)', 'Real hotels near a destination, with website & phone where mapped'],
    caching: 'Geocoding 7 d · Hotels 24 h',
  },
];

/** GET /api/meta/integrations — catalogue + live call statistics. */
metaRouter.get('/integrations', (_req, res) => {
  const stats = providerStats();
  ok(res, {
    demoMode,
    model: demoMode ? null : config.llm.model,
    llmBaseUrl: config.llm.baseUrl,
    cacheEntries: cache.size,
    integrations: INTEGRATIONS.map((i) => ({ ...i, stats: stats[i.id] ?? null })),
  });
});

/** GET /api/meta/health-check — ping every provider live (no cache) and time it. */
metaRouter.get('/health-check', async (_req, res) => {
  const probes = {
    llm: () =>
      demoMode
        ? Promise.resolve('demo')
        : upstream({ provider: 'llm', label: 'List models', url: `${config.llm.baseUrl}/models`, headers: { Authorization: `Bearer ${config.llm.apiKey}` }, timeoutMs: 6000, retries: 0 }),
    'open-meteo': () => upstream({ provider: 'open-meteo', label: 'Health: geocoding', url: 'https://geocoding-api.open-meteo.com/v1/search?name=Noida&count=1', timeoutMs: 6000, retries: 0 }),
    wikipedia: () => upstream({ provider: 'wikipedia', label: 'Health: summary', url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Noida', timeoutMs: 6000, retries: 0 }),
    frankfurter: () => upstream({ provider: 'frankfurter', label: 'Health: latest', url: 'https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD', timeoutMs: 6000, retries: 0 }),
    openstreetmap: () => upstream({ provider: 'openstreetmap', label: 'Health: Nominatim status', url: 'https://nominatim.openstreetmap.org/status?format=json', timeoutMs: 8000, retries: 0 }),
  };

  const results = await Promise.all(
    Object.entries(probes).map(async ([id, probe]) => {
      const started = performance.now();
      try {
        const out = await probe();
        return { id, ok: true, demo: out === 'demo', ms: out === 'demo' ? 0 : Math.round(performance.now() - started) };
      } catch (err) {
        return { id, ok: false, ms: Math.round(performance.now() - started), error: err.message };
      }
    }),
  );
  ok(res, { checkedAt: new Date().toISOString(), results });
});

/** GET /api/meta/logs?limit=100 — most recent upstream calls. */
metaRouter.get('/logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  ok(res, { entries: recentEntries(limit) });
});

/** GET /api/meta/logs/stream — live feed of upstream calls (Server-Sent Events). */
metaRouter.get('/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: hello\ndata: {}\n\n`);
  const onEntry = (entry) => res.write(`event: entry\ndata: ${JSON.stringify(entry)}\n\n`);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  traceEvents.on('entry', onEntry);
  req.on('close', () => {
    clearInterval(heartbeat);
    traceEvents.off('entry', onEntry);
  });
});
