import { useApiLog } from '@/store/apiLog';
import type { ApiEnvelope, ResponseMeta } from './types';

/**
 * The browser only ever talks to our own Express API (same origin in production,
 * proxied by Vite in development). Third-party keys never reach the client.
 * Set VITE_API_URL when the frontend is hosted separately from the API.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  meta?: ResponseMeta;
  constructor(status: number, code: string, message: string, details?: unknown, meta?: ResponseMeta) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.meta = meta;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function api<T>(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '') as [string, string][]).toString()}`
    : '';
  const started = performance.now();
  const log = useApiLog.getState();
  let res: Response;

  try {
    res = await fetch(`${API_BASE}/api${path}${qs}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    log.add({ method, path: path + qs, status: 0, ms: Math.round(performance.now() - started), error: 'Network error' });
    throw new ApiError(0, 'NETWORK', 'Could not reach the Itinera API. Is the server running?');
  }

  const json = await res.json().catch(() => null);
  const ms = Math.round(performance.now() - started);
  log.add({ method, path: path + qs, status: res.status, ms, meta: json?.meta, requestBody: body, error: json?.error?.message });

  if (!res.ok || !json || json.error) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'HTTP_ERROR', e.message ?? `Request failed (HTTP ${res.status})`, e.details, json?.meta);
  }
  return json as ApiEnvelope<T>;
}

export interface SseHandlers {
  [event: string]: ((data: any) => void) | undefined;
}

/**
 * POST + Server-Sent Events. `EventSource` only supports GET, so we read the
 * response body stream ourselves and split it on blank lines.
 */
export async function streamSse(path: string, body: unknown, handlers: SseHandlers, signal?: AbortSignal) {
  const started = performance.now();
  const log = useApiLog.getState();
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null);
    log.add({ method: 'POST', path, status: res.status, ms: Math.round(performance.now() - started), meta: json?.meta, requestBody: body, error: json?.error?.message });
    throw new ApiError(res.status, json?.error?.code ?? 'HTTP_ERROR', json?.error?.message ?? `Request failed (HTTP ${res.status})`, json?.error?.details);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finalMeta: ResponseMeta | undefined;
  let errorMessage: string | undefined;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let split: number;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      let event = 'message';
      let data = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      const parsed = JSON.parse(data);
      if (parsed?.meta) finalMeta = parsed.meta;
      if (event === 'error') errorMessage = parsed.message;
      handlers[event]?.(parsed);
    }
  }

  log.add({ method: 'POST', path, status: errorMessage ? 502 : res.status, ms: Math.round(performance.now() - started), meta: finalMeta, requestBody: body, streamed: true, error: errorMessage });
}
