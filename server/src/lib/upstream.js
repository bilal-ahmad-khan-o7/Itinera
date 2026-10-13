import { config } from '../config.js';
import { cache } from './cache.js';
import { UpstreamError } from './errors.js';
import { recordUpstream } from './trace.js';

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip secrets from URLs before they are logged or returned to the client. */
function redactUrl(url) {
  const u = new URL(url);
  for (const key of ['key', 'apikey', 'api_key', 'token', 'access_token']) {
    if (u.searchParams.has(key)) u.searchParams.set(key, '***');
  }
  return u.toString();
}

function backoffMs(attempt, retryAfterHeader) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 4000);
  return 300 * 2 ** attempt + Math.random() * 150;
}

/**
 * Fetch JSON (or text) from a third-party API with:
 *  - a hard timeout (AbortSignal.timeout)
 *  - retries with exponential backoff for transient failures (429 / 5xx / network)
 *  - optional TTL caching
 *  - a trace entry for the API Console
 */
export async function upstream({
  provider,
  label,
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 8000,
  retries = 1,
  cacheTtlMs = 0,
  responseType = 'json',
  annotate, // optional (data) => extra fields for the trace entry, e.g. token usage
  before, // optional async hook run on a cache miss, e.g. to respect a provider's rate limit
}) {
  const safeUrl = redactUrl(url);
  const cacheKey = cacheTtlMs ? `${method} ${url} ${body ? JSON.stringify(body) : ''}` : null;

  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) {
      recordUpstream({ provider, label, method, url: safeUrl, status: 200, ms: 0, cached: true, attempts: 0 });
      return hit;
    }
  }

  await before?.();
  const started = performance.now();
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'User-Agent': config.userAgent,
          Accept: 'application/json',
          ...(body && typeof body !== 'string' ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (RETRYABLE.has(res.status) && attempt < retries) {
          await sleep(backoffMs(attempt, res.headers.get('retry-after')));
          attempt += 1;
          continue;
        }
        const ms = Math.round(performance.now() - started);
        recordUpstream({ provider, label, method, url: safeUrl, status: res.status, ms, cached: false, attempts: attempt + 1, error: text.slice(0, 200) });
        throw new UpstreamError(provider, res.status, describeStatus(provider, res.status), safeParse(text));
      }

      const data = responseType === 'text' ? await res.text() : res.status === 204 ? null : await res.json();
      const ms = Math.round(performance.now() - started);
      recordUpstream({ provider, label, method, url: safeUrl, status: res.status, ms, cached: false, attempts: attempt + 1, ...annotate?.(data) });
      if (cacheKey) cache.set(cacheKey, data, cacheTtlMs);
      return data;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }
      break;
    }
  }

  const ms = Math.round(performance.now() - started);
  const timedOut = lastError?.name === 'TimeoutError' || lastError?.name === 'AbortError';
  const message = timedOut ? `${provider} did not respond within ${timeoutMs / 1000}s` : `Could not reach ${provider}`;
  recordUpstream({ provider, label, method, url: safeUrl, status: null, ms, cached: false, attempts: attempt + 1, error: message });
  throw new UpstreamError(provider, timedOut ? 504 : 502, message);
}

/**
 * Open a streaming request (e.g. Server-Sent Events from an LLM). Returns the raw
 * Response plus a `done()` callback that records the full duration once the
 * caller has finished consuming the body.
 */
export async function upstreamStream({ provider, label, url, method = 'POST', headers = {}, body, timeoutMs = 90_000 }) {
  const safeUrl = redactUrl(url);
  const started = performance.now();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'User-Agent': config.userAgent, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError';
    const message = timedOut ? `${provider} did not respond in time` : `Could not reach ${provider}`;
    recordUpstream({ provider, label, method, url: safeUrl, status: null, ms: Math.round(performance.now() - started), cached: false, attempts: 1, error: message });
    throw new UpstreamError(provider, timedOut ? 504 : 502, message);
  }

  const ttfbMs = Math.round(performance.now() - started);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    recordUpstream({ provider, label, method, url: safeUrl, status: res.status, ms: ttfbMs, cached: false, attempts: 1, error: text.slice(0, 200) });
    throw new UpstreamError(provider, res.status, describeStatus(provider, res.status), safeParse(text));
  }

  return {
    res,
    ttfbMs,
    done(extra = {}) {
      recordUpstream({ provider, label, method, url: safeUrl, status: res.status, ms: Math.round(performance.now() - started), ttfbMs, cached: false, attempts: 1, streamed: true, ...extra });
    },
  };
}

function describeStatus(provider, status) {
  if (status === 401 || status === 403) return `${provider} rejected the credentials (HTTP ${status})`;
  if (status === 404) return `${provider} has no data for that request`;
  if (status === 429) return `${provider} rate limit reached — try again in a moment`;
  if (status >= 500) return `${provider} is having problems (HTTP ${status})`;
  return `${provider} returned HTTP ${status}`;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text ? text.slice(0, 300) : undefined;
  }
}
