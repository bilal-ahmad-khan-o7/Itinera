import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

/**
 * Every outbound (upstream) call is recorded twice:
 *  1. in the per-request trace, so each API response can tell the client which
 *     third-party calls it caused and how long they took;
 *  2. in a global ring buffer, which powers the live API Console in the UI.
 */
const als = new AsyncLocalStorage();
const RING_SIZE = 300;
const ring = [];
export const traceEvents = new EventEmitter();
traceEvents.setMaxListeners(100);

const stats = new Map(); // provider -> { calls, errors, cached, totalMs, lastStatus, lastAt }

export function traceMiddleware(req, res, next) {
  const requestId = req.get('x-request-id') || randomUUID().slice(0, 8);
  const ctx = { requestId, startedAt: performance.now(), route: `${req.method} ${req.path}`, upstream: [] };
  res.setHeader('x-request-id', requestId);
  req.ctx = ctx;
  als.run(ctx, next);
}

export function currentTrace() {
  return als.getStore();
}

export function recordUpstream(entry) {
  const ctx = als.getStore();
  const full = {
    id: randomUUID().slice(0, 8),
    at: new Date().toISOString(),
    requestId: ctx?.requestId ?? null,
    route: ctx?.route ?? null,
    // When the call started, relative to the inbound request (for waterfalls).
    offsetMs: ctx ? Math.max(0, Math.round(performance.now() - (entry.ms ?? 0) - ctx.startedAt)) : null,
    ...entry,
  };
  ctx?.upstream.push(full);

  ring.push(full);
  if (ring.length > RING_SIZE) ring.shift();

  const s = stats.get(full.provider) ?? { calls: 0, errors: 0, cached: 0, totalMs: 0, lastStatus: null, lastAt: null };
  s.calls += 1;
  if (full.cached) s.cached += 1;
  else s.totalMs += full.ms;
  if (full.error || (full.status && full.status >= 400)) s.errors += 1;
  s.lastStatus = full.status;
  s.lastAt = full.at;
  stats.set(full.provider, s);

  traceEvents.emit('entry', full);
  return full;
}

export function recentEntries(limit = 100) {
  return ring.slice(-limit).reverse();
}

export function providerStats() {
  const out = {};
  for (const [provider, s] of stats) {
    const live = s.calls - s.cached;
    out[provider] = {
      calls: s.calls,
      errors: s.errors,
      cacheHits: s.cached,
      avgMs: live > 0 ? Math.round(s.totalMs / live) : null,
      lastStatus: s.lastStatus,
      lastAt: s.lastAt,
    };
  }
  return out;
}

/** Shape of the `meta` block attached to every JSON response. */
export function responseMeta(ctx = als.getStore()) {
  if (!ctx) return undefined;
  return {
    requestId: ctx.requestId,
    durationMs: Math.round(performance.now() - ctx.startedAt),
    upstream: ctx.upstream.map(({ provider, label, method, url, status, offsetMs, ms, ttfbMs, cached, attempts, tokens, error }) => ({
      provider,
      label,
      method,
      url,
      status,
      offsetMs,
      ms,
      ttfbMs,
      cached,
      attempts,
      tokens,
      error,
    })),
  };
}
