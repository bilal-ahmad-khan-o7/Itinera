import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowSquareOut,
  Broadcast,
  CheckCircle,
  Copy,
  Heartbeat,
  Pause,
  Play,
  PaperPlaneRight,
  SpinnerGap,
  Trash,
  XCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/app/common';
import { JsonView } from '@/components/app/JsonView';
import { Waterfall } from '@/components/app/TracePopover';
import { API_BASE, api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import type { Integration, TraceEntry } from '@/lib/types';
import { useApiLog } from '@/store/apiLog';
import { cn } from '@/lib/utils';

/* ───────────────────────── Integrations ───────────────────────── */

function IntegrationsTab() {
  const q = useQuery({ queryKey: ['integrations'], queryFn: () => api<{ integrations: Integration[]; demoMode: boolean; model: string | null; llmBaseUrl: string; cacheEntries: number }>('/meta/integrations'), refetchInterval: 10_000 });
  const health = useMutation({ mutationFn: () => api<{ checkedAt: string; results: { id: string; ok: boolean; ms: number; demo?: boolean; error?: string }[] }>('/meta/health-check') });
  const results = Object.fromEntries((health.data?.data.results ?? []).map((r) => [r.id, r]));
  const d = q.data?.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          LLM: <span className="font-mono text-foreground">{d ? (d.demoMode ? 'demo mode (no key)' : d.model) : '…'}</span>
        </span>
        <span className="text-muted-foreground">
          Endpoint: <span className="font-mono text-foreground">{d?.llmBaseUrl ?? '…'}</span>
        </span>
        <span className="text-muted-foreground">
          Cache entries: <span className="font-mono text-foreground">{d?.cacheEntries ?? '…'}</span>
        </span>
        <Button size="sm" className="ml-auto" onClick={() => health.mutate()} disabled={health.isPending}>
          {health.isPending ? <SpinnerGap className="animate-spin" /> : <Heartbeat />} Run live health check
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(d?.integrations ?? []).map((i, idx) => {
          const r = results[i.id];
          return (
            <motion.div key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="h-full gap-4">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{i.name}</CardTitle>
                      <CardDescription>{i.category}</CardDescription>
                    </div>
                    {r && (
                      <Badge variant="outline" className={cn('gap-1 rounded-full', r.ok ? 'border-success/40' : 'border-destructive/40')}>
                        {r.ok ? <CheckCircle weight="fill" className="text-success" /> : <XCircle weight="fill" className="text-destructive" />}
                        {r.demo ? 'demo' : r.ok ? `${r.ms} ms` : 'down'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
                    <dt className="text-muted-foreground">Auth</dt>
                    <dd>{i.auth}</dd>
                    <dt className="text-muted-foreground">Pattern</dt>
                    <dd>{i.pattern}</dd>
                    <dt className="text-muted-foreground">Cache</dt>
                    <dd>{i.caching}</dd>
                  </dl>
                  <ul className="space-y-1 text-muted-foreground">
                    {i.usedFor.map((u) => (
                      <li key={u}>→ {u}</li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-4 gap-2 rounded-xl bg-secondary/60 p-2 text-center">
                    {[
                      ['calls', i.stats?.calls ?? 0],
                      ['avg ms', i.stats?.avgMs ?? '—'],
                      ['cached', i.stats?.cacheHits ?? 0],
                      ['errors', i.stats?.errors ?? 0],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <p className="font-semibold tabular-nums">{v}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{k}</p>
                      </div>
                    ))}
                  </div>
                  {r?.error && <p className="text-xs text-destructive">{r.error}</p>}
                  <a href={i.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    API docs <ArrowSquareOut size={12} />
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      {q.isError && <p className="text-sm text-destructive">Could not load integrations. Is the API server running?</p>}
    </div>
  );
}

/* ───────────────────────── Live traffic ───────────────────────── */

function LiveTab() {
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState('all');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    api<{ entries: TraceEntry[] }>('/meta/logs', { query: { limit: 100 } })
      .then((r) => setEntries(r.data.entries))
      .catch(() => {});
    const es = new EventSource(`${API_BASE}/api/meta/logs/stream`);
    es.addEventListener('hello', () => setConnected(true));
    es.addEventListener('entry', (e) => {
      if (pausedRef.current) return;
      const entry = JSON.parse((e as MessageEvent).data) as TraceEntry;
      setEntries((prev) => [entry, ...prev].slice(0, 200));
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const providers = useMemo(() => [...new Set(entries.map((e) => e.provider))], [entries]);
  const visible = provider === 'all' ? entries : entries.filter((e) => e.provider === provider);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={cn('size-2 rounded-full', connected ? 'animate-pulse bg-success' : 'bg-muted-foreground')} />
          {connected ? 'Streaming upstream calls (SSE)' : 'Connecting…'}
        </span>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger size="sm" className="w-[160px]" aria-label="Filter by provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play /> : <Pause />} {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEntries([])}>
            <Trash /> Clear
          </Button>
        </div>
      </div>
      <div className="scrollbar-thin max-h-[560px] overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-2 py-2 font-medium">Provider</th>
              <th className="px-2 py-2 font-medium">Call</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 text-right font-medium">Latency</th>
              <th className="px-4 py-2 font-medium">Triggered by</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((e) => {
                const bad = !!e.error || (e.status ?? 0) >= 400 || e.status === null;
                return (
                  <motion.tr key={e.id} initial={{ opacity: 0, backgroundColor: 'var(--accent)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 1.2 }} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">{new Date(e.at).toLocaleTimeString('en-IN')}</td>
                    <td className="px-2 py-2 font-medium whitespace-nowrap">{e.provider}</td>
                    <td className="max-w-[320px] px-2 py-2" title={`${e.method} ${e.url}`}>
                      <p className="truncate">{e.label}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {e.method} {e.url.replace(/^https?:\/\//, '')}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className={cn('rounded-full font-mono', bad ? 'border-destructive/50 text-destructive' : e.cached ? '' : 'border-success/40')}>
                        {e.cached ? 'cache' : e.status ?? 'ERR'}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">
                      {e.cached ? '—' : `${e.ms} ms`}
                      {e.streamed && <span className="block text-[10px] text-muted-foreground">stream · ttfb {e.ttfbMs} ms</span>}
                      {e.attempts > 1 && <span className="block text-[10px] text-warning">{e.attempts} attempts</span>}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                      {e.route ?? '—'}
                      {e.requestId && <span className="block">#{e.requestId}</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {visible.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted-foreground">No upstream calls yet. Use the workspace or the playground and watch them arrive here.</p>}
      </div>
    </Card>
  );
}

/* ───────────────────────── Browser requests ───────────────────────── */

function ClientTab() {
  const calls = useApiLog((s) => s.calls);
  const clear = useApiLog((s) => s.clear);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">Requests this browser made to the Itinera API, newest first.</p>
        <Button size="sm" variant="ghost" onClick={clear}>
          <Trash /> Clear
        </Button>
      </div>
      {calls.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">Nothing yet in this session.</p>
      ) : (
        <ul className="divide-y">
          {calls.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                <Badge variant="outline" className="w-12 justify-center rounded-md font-mono text-[11px]">
                  {c.method}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{c.path}</span>
                {c.streamed && <Badge variant="secondary" className="rounded-full text-[10px]">SSE</Badge>}
                <span className={cn('font-mono text-xs', c.status >= 400 || c.status === 0 ? 'text-destructive' : 'text-success')}>{c.status || 'ERR'}</span>
                <span className="w-16 text-right font-mono text-xs text-muted-foreground tabular-nums">{c.ms} ms</span>
                <span className="hidden w-20 text-right text-xs text-muted-foreground sm:block">{relativeTime(c.at)}</span>
              </button>
              <AnimatePresence>
                {open === c.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Request body</p>
                        <JsonView value={c.requestBody ?? '(none)'} className="max-h-64" />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Upstream waterfall {c.meta && `· #${c.meta.requestId}`}</p>
                        <div className="rounded-xl border">{c.meta ? <Waterfall meta={c.meta} /> : <p className="p-4 text-sm text-muted-foreground">{c.error ?? 'No trace returned.'}</p>}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ───────────────────────── Playground ───────────────────────── */

interface Endpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  query?: Record<string, string>;
  body?: unknown;
  stream?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  { id: 'destination', method: 'GET', path: '/api/destination', title: 'Destination intel', description: 'Geocode, then forecast + Wikipedia + FX in parallel.', query: { city: 'Udaipur', base: 'INR' } },
  { id: 'fx', method: 'GET', path: '/api/fx', title: 'Exchange rates', description: 'ECB reference rates via Frankfurter (cached 6 h).', query: { base: 'INR', symbols: 'USD,EUR,THB,SGD' } },
  { id: 'hotels-real', method: 'GET', path: '/api/hotels/real', title: 'Real hotels (OSM)', description: 'Nominatim + Overpass: hotels mapped near a place.', query: { city: 'Jaipur' } },
  { id: 'ai-enquiry', method: 'POST', path: '/api/ai/enquiry', title: 'Enquiry → lead', description: 'LLM JSON mode with schema validation.', body: { text: 'Hi, Neha here. Family of 3 (1 kid) wants Manali for 5 nights from 10 May, 3-star, budget 60k. neha@example.com' } },
  { id: 'ai-hotels', method: 'POST', path: '/api/ai/hotels', title: 'AI hotel inventory', description: 'Sample inventory with filters and de-duplication.', body: { city: 'Goa', count: 4, filters: { stars: [4, 5], maxPrice: 12000, amenities: ['Swimming pool'] } } },
  { id: 'ai-itinerary', method: 'POST', path: '/api/ai/itinerary', title: 'Itinerary stream', description: 'Server-Sent Events: start → token* → day* → summary → done.', body: { destination: 'Rishikesh', nights: 2, adults: 2, interests: ['adventure', 'wellness'] }, stream: true },
  { id: 'ai-compose', method: 'POST', path: '/api/ai/compose', title: 'Compose message', description: 'Client email / WhatsApp drafts.', body: { kind: 'payment_reminder', tone: 'warm', context: { customerName: 'Sneha', destination: 'Kerala', amountDue: 45000, dueDate: '2026-12-01' } } },
  { id: 'invalid', method: 'POST', path: '/api/ai/hotels', title: 'Validation error (400)', description: 'Deliberately invalid body: see field-level errors.', body: { city: 'X', count: 99 } },
  { id: 'integrations', method: 'GET', path: '/api/meta/integrations', title: 'Integration catalogue', description: 'Providers and live call statistics.' },
  { id: 'health', method: 'GET', path: '/api/health', title: 'Health', description: 'Liveness probe used by Railway.' },
];

function buildUrl(ep: Endpoint, query: Record<string, string>) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '')).toString();
  return `${ep.path}${qs ? `?${qs}` : ''}`;
}

function PlaygroundTab() {
  const [epId, setEpId] = useState(ENDPOINTS[0].id);
  const ep = ENDPOINTS.find((e) => e.id === epId)!;
  const [query, setQuery] = useState<Record<string, string>>(ep.query ?? {});
  const [body, setBody] = useState(ep.body ? JSON.stringify(ep.body, null, 2) : '');
  const [snippet, setSnippet] = useState<'curl' | 'fetch'>('curl');
  const [result, setResult] = useState<{ status: number; ms: number; requestId: string | null; body: unknown } | null>(null);
  const [events, setEvents] = useState<{ event: string; data: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const log = useApiLog((s) => s.add);

  const select = (id: string) => {
    const next = ENDPOINTS.find((e) => e.id === id)!;
    setEpId(id);
    setQuery(next.query ?? {});
    setBody(next.body ? JSON.stringify(next.body, null, 2) : '');
    setResult(null);
    setEvents([]);
  };

  const origin = API_BASE || window.location.origin;
  const url = buildUrl(ep, query);
  const compactBody = (() => {
    try {
      return JSON.stringify(JSON.parse(body || '{}'));
    } catch {
      return body;
    }
  })();
  const code =
    snippet === 'curl'
      ? ep.method === 'GET'
        ? `curl -s "${origin}${url}"`
        : `curl -sN -X POST "${origin}${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${compactBody}'`
      : ep.method === 'GET'
        ? `const res = await fetch('${origin}${url}');\nconst { data, meta } = await res.json();`
        : `const res = await fetch('${origin}${url}', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${compactBody}),\n});\n${ep.stream ? '// read res.body as a stream of SSE frames' : 'const { data, meta } = await res.json();'}`;

  const send = async () => {
    let parsed: unknown;
    if (ep.method === 'POST') {
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        toast.error('Body is not valid JSON');
        return;
      }
    }
    setBusy(true);
    setResult(null);
    setEvents([]);
    const started = performance.now();
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method: ep.method,
        headers: ep.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.method === 'POST' ? JSON.stringify(parsed) : undefined,
      });
      const requestId = res.headers.get('x-request-id');
      if (ep.stream && res.ok && res.body) {
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let i: number;
          while ((i = buf.indexOf('\n\n')) !== -1) {
            const frame = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const event = frame.match(/^event: (.*)$/m)?.[1] ?? 'message';
            const data = frame.match(/^data: (.*)$/m)?.[1] ?? '';
            setEvents((prev) => [...prev, { event, data }].slice(-400));
          }
        }
        setResult({ status: res.status, ms: Math.round(performance.now() - started), requestId, body: '(streamed: see events)' });
      } else {
        const text = await res.text();
        let json: unknown = text;
        try {
          json = JSON.parse(text);
        } catch {
          /* not JSON */
        }
        const ms = Math.round(performance.now() - started);
        setResult({ status: res.status, ms, requestId, body: json });
        log({ method: ep.method, path: url, status: res.status, ms, meta: (json as { meta?: never })?.meta, requestBody: parsed });
      }
    } catch (err) {
      setResult({ status: 0, ms: Math.round(performance.now() - started), requestId: null, body: { error: (err as Error).message } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit gap-0 py-2">
        <ul>
          {ENDPOINTS.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => select(e.id)} className={cn('w-full px-4 py-2.5 text-left transition-colors', e.id === epId ? 'bg-accent' : 'hover:bg-secondary/50')}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-10 font-mono text-[10px] font-semibold', e.method === 'GET' ? 'text-success' : 'text-clay')}>{e.method}</span>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <p className="mt-0.5 truncate pl-12 font-mono text-[11px] text-muted-foreground">{e.path}</p>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={cn('font-mono text-sm', ep.method === 'GET' ? 'text-success' : 'text-clay')}>{ep.method}</span>
              <span className="font-mono text-base">{ep.path}</span>
            </CardTitle>
            <CardDescription>{ep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(query).length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(query).map(([k, v]) => (
                  <div key={k}>
                    <Label className="mb-1.5 block font-mono text-xs">{k}</Label>
                    <Input value={v} onChange={(e) => setQuery({ ...query, [k]: e.target.value })} className="font-mono text-sm" />
                  </div>
                ))}
              </div>
            )}
            {ep.method === 'POST' && (
              <div>
                <Label className="mb-1.5 block">JSON body</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-40 font-mono text-[12.5px]" spellCheck={false} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={send} disabled={busy}>
                {busy ? <SpinnerGap className="animate-spin" /> : <PaperPlaneRight weight="fill" />} Send request
              </Button>
              {result && (
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <Badge variant="outline" className={cn('rounded-full', result.status >= 200 && result.status < 300 ? 'border-success/50 text-success' : 'border-destructive/50 text-destructive')}>
                    HTTP {result.status || 'ERR'}
                  </Badge>
                  <span className="text-muted-foreground">{result.ms} ms</span>
                  {result.requestId && <span className="text-muted-foreground">x-request-id {result.requestId}</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{ep.stream ? 'Event stream' : 'Response'}</p>
            </div>
            {ep.stream ? (
              <div className="scrollbar-thin h-[420px] overflow-auto rounded-xl bg-ink p-3 font-mono text-[11.5px] leading-relaxed">
                {events.length === 0 ? (
                  <p className="text-paper/40">{busy ? 'Waiting for events…' : 'Send the request to watch Server-Sent Events arrive.'}</p>
                ) : (
                  events
                    .filter((e) => e.event !== 'token')
                    .map((e, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="mb-1.5 break-all">
                        <span className={cn('mr-2 font-semibold', e.event === 'day' ? 'text-primary' : e.event === 'error' ? 'text-red-400' : 'text-[#9fd7a8]')}>event: {e.event}</span>
                        <span className="text-paper/60">{e.data.length > 220 ? `${e.data.slice(0, 220)}…` : e.data}</span>
                      </motion.div>
                    ))
                )}
                {events.some((e) => e.event === 'token') && (
                  <p className="mt-2 text-paper/35">+ {events.filter((e) => e.event === 'token').length} token events (hidden)</p>
                )}
              </div>
            ) : result ? (
              <JsonView value={result.body} className="h-[420px]" />
            ) : (
              <div className="grid h-[420px] place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">Response will appear here</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <Tabs value={snippet} onValueChange={(v) => setSnippet(v as typeof snippet)}>
                <TabsList className="h-8">
                  <TabsTrigger value="curl" className="text-xs">
                    cURL
                  </TabsTrigger>
                  <TabsTrigger value="fetch" className="text-xs">
                    fetch
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Snippet copied');
                }}
              >
                <Copy /> Copy
              </Button>
            </div>
            <pre className="scrollbar-thin h-[420px] overflow-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-paper/80">{code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApiConsole() {
  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="API Console"
        description="Everything the integration layer does, made visible: provider health, live upstream traffic, your own requests and a playground for every endpoint."
      />
      <Tabs defaultValue="integrations">
        <TabsList className="mb-4 h-auto flex-wrap">
          <TabsTrigger value="integrations">
            <Heartbeat /> Integrations
          </TabsTrigger>
          <TabsTrigger value="live">
            <Broadcast /> Live traffic
          </TabsTrigger>
          <TabsTrigger value="client">Browser requests</TabsTrigger>
          <TabsTrigger value="playground">
            <PaperPlaneRight /> Playground
          </TabsTrigger>
        </TabsList>
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="live">
          <LiveTab />
        </TabsContent>
        <TabsContent value="client">
          <ClientTab />
        </TabsContent>
        <TabsContent value="playground">
          <PlaygroundTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
