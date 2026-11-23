import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Atom, Browsers, Code, HardDrives, Palette, Train } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Accent, CountUp, Reveal, SectionHeading } from './primitives';

const SNIPPETS = {
  stream: {
    label: 'Streaming',
    lang: 'server/src/routes/ai.js',
    code: `for await (const delta of chatStream({ system, user })) {
  if (sse.closed) break;          // client left — stop paying for tokens
  sse.send('token', { t: delta });
  parser.push(delta);             // pull complete JSON objects out of the stream
}

// parser → ItineraryDay.safeParse(obj) → sse.send('day', day)`,
  },
  resilience: {
    label: 'Resilience',
    lang: 'server/src/lib/upstream.js',
    code: `const res = await fetch(url, {
  signal: AbortSignal.timeout(timeoutMs),
});

if (RETRYABLE.has(res.status) && attempt < retries) {
  await sleep(backoffMs(attempt, res.headers.get('retry-after')));
  continue;                       // 300ms → 600ms → … with jitter
}

recordUpstream({ provider, status, ms, cached: false });`,
  },
  orchestrate: {
    label: 'Orchestration',
    lang: 'server/src/routes/travel.js',
    code: `const place = await resolvePlace(city); // Nominatim → Open-Meteo fallback

const [weather, wiki, fx] = await Promise.allSettled([
  forecast(place.lat, place.lon),
  destinationSummary(place.name, place.country),
  latestRates('INR', [currencyFor(place.countryCode)]),
]);
// a failed provider becomes a warning, not a 500`,
  },
  client: {
    label: 'Client',
    lang: 'client/src/lib/api.ts',
    code: `const reader = res.body
  .pipeThrough(new TextDecoderStream())
  .getReader();

// EventSource can't POST, so SSE frames are parsed by hand
while ((split = buffer.indexOf('\\n\\n')) !== -1) {
  const { event, data } = parseFrame(buffer.slice(0, split));
  handlers[event]?.(JSON.parse(data));
}`,
  },
} as const;

type Key = keyof typeof SNIPPETS;

function highlight(code: string) {
  // Tiny, dependency-free highlighter: comments, strings, keywords.
  return code.split('\n').map((line, i) => {
    const comment = line.indexOf('//');
    const body = comment >= 0 ? line.slice(0, comment) : line;
    const tail = comment >= 0 ? line.slice(comment) : '';
    const parts = body.split(/('[^']*'|`[^`]*`)/g);
    return (
      <div key={i} className="whitespace-pre">
        {parts.map((p, j) =>
          /^['`]/.test(p) ? (
            <span key={j} className="text-[#9fd7a8]">{p}</span>
          ) : (
            <span key={j} dangerouslySetInnerHTML={{ __html: p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\b(const|await|for|of|if|continue|while|new|return|async)\b/g, '<span style="color:var(--color-saffron)">$1</span>') }} />
          ),
        )}
        {tail && <span className="text-cream/35 italic">{tail}</span>}
      </div>
    );
  });
}

const STACK = [
  { icon: Atom, name: 'React 19 + TypeScript', note: 'Vite, React Router, TanStack Query, Zustand' },
  { icon: Palette, name: 'Tailwind CSS v4 + shadcn/ui', note: 'Radix primitives, Phosphor icons' },
  { icon: Browsers, name: 'Motion', note: 'scroll, layout and stream animations' },
  { icon: HardDrives, name: 'Express 5', note: 'zod, helmet, rate limiting, SSE' },
  { icon: Code, name: 'jsPDF + write-excel-file', note: 'documents generated in the browser' },
  { icon: Train, name: 'Railway', note: 'single service: API + static client' },
];

export function UnderTheHood() {
  const [tab, setTab] = useState<Key>('stream');

  return (
    <section id="architecture" className="relative bg-night py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Under the hood"
          title={
            <>
              Readable code for <Accent>real&#8209;world</Accent> API problems.
            </>
          }
          lead="Streaming, retries, fallbacks and partial failure are the parts of API integration that tutorials skip. Here is how Itinera handles each one."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Reveal className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d0c0b]">
              <div className="flex flex-wrap items-center gap-1 border-b border-white/8 p-2" role="tablist" aria-label="Code samples">
                {(Object.keys(SNIPPETS) as Key[]).map((k) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={cn('relative rounded-lg px-3 py-1.5 text-sm transition-colors', tab === k ? 'text-night' : 'text-cream/55 hover:text-cream')}
                  >
                    {tab === k && <motion.span layoutId="code-tab" className="absolute inset-0 rounded-lg bg-saffron" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="relative">{SNIPPETS[k].label}</span>
                  </button>
                ))}
                <span className="ml-auto hidden px-2 font-mono text-[11px] text-cream/30 sm:block">{SNIPPETS[tab].lang}</span>
              </div>
              <div className="scrollbar-thin min-h-[260px] overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-cream/80">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                    {highlight(SNIPPETS[tab].code)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: 7, s: '', label: 'external APIs from 5 providers' },
                  { n: 12, s: '', label: 'REST & streaming endpoints' },
                  { n: 0, s: '', label: 'secrets shipped to the browser' },
                  { n: 3, s: '', label: 'PDF documents generated' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-night-2/60 p-4">
                    <CountUp to={stat.n} suffix={stat.s} className="font-display text-4xl font-semibold text-cream" />
                    <p className="mt-1 text-xs leading-snug text-cream/50">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-night-2/40">
                {STACK.map((s) => (
                  <li key={s.name} className="flex items-center gap-3 px-4 py-3">
                    <s.icon size={18} className="shrink-0 text-saffron" weight="duotone" />
                    <span className="text-sm font-medium text-cream">{s.name}</span>
                    <span className="ml-auto hidden text-right text-xs text-cream/40 sm:block">{s.note}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
