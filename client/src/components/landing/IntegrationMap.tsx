import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowsClockwise, Clock, Database, Funnel, GitFork, ShieldCheck, Target } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Accent, Reveal, SectionHeading } from './primitives';

const PROVIDERS = [
  { id: 'groq', name: 'Groq LLM', sub: 'chat completions', y: 46, detail: 'Bearer key stays on the server. JSON mode for leads, hotels and drafts; Server-Sent Events for itineraries, parsed into validated day objects as tokens arrive.' },
  { id: 'nominatim', name: 'Nominatim', sub: 'geocoding', y: 110, detail: 'Turns "Goa", "Kerala" or "Bali" into coordinates. Calls are queued to respect the 1 request/second policy and cached for 7 days.' },
  { id: 'overpass', name: 'Overpass', sub: 'OSM hotels', y: 174, detail: 'Bounding-box Overpass QL query for real, community-mapped hotels with website and phone where available. Cached 24 h.' },
  { id: 'meteo', name: 'Open-Meteo', sub: 'weather + geo', y: 238, detail: '7-day forecast for the trip window, and the automatic fallback geocoder if Nominatim is down. Cached 30 min.' },
  { id: 'wiki', name: 'Wikipedia', sub: 'REST summary', y: 302, detail: 'Destination description and hero image for quotations. Retries "City, Country" when it hits a disambiguation page.' },
  { id: 'fx', name: 'Frankfurter', sub: 'ECB FX rates', y: 366, detail: 'Daily European Central Bank rates convert quotes for international clients. Cached 6 h, because the rates only change once a day.' },
];

const FEATURES = [
  { icon: Clock, title: 'Timeouts everywhere', body: 'Every upstream call is bounded with AbortSignal.timeout().' },
  { icon: ArrowsClockwise, title: 'Retry with backoff', body: '429 and 5xx responses retry with exponential backoff and honour Retry-After.' },
  { icon: Database, title: 'TTL cache', body: 'Geocodes, forecasts and FX are cached, and cache hits show up in the trace.' },
  { icon: GitFork, title: 'Provider fallback', body: 'Nominatim → Open-Meteo, and the response says which one answered.' },
  { icon: ShieldCheck, title: 'Validated in & out', body: 'zod schemas check requests before any spend and LLM output before display.' },
  { icon: Funnel, title: 'Rate limited', body: 'Per-IP limits on AI routes protect the key and the budget.' },
  { icon: Target, title: 'Traced', body: 'x-request-id plus a per-response upstream waterfall in meta.' },
];

const GW = { x: 226, y: 160, w: 150, h: 120 };

export function IntegrationMap() {
  const [active, setActive] = useState<string | null>(null);
  const current = PROVIDERS.find((p) => p.id === active);

  return (
    <section id="integrations" className="relative overflow-hidden bg-night py-24 sm:py-32">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 text-cream opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Integration architecture"
          title={
            <>
              One gateway. <Accent>Seven</Accent> live APIs.
            </>
          }
          lead="The browser never calls a third party directly. It talks to one Express API, which validates, caches, retries, traces and combines five providers into answers the UI can use."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <Reveal className="min-w-0 rounded-3xl border border-white/8 bg-night-2/60 p-3 sm:p-5">
            <div className="scrollbar-thin overflow-x-auto">
              <svg viewBox="0 0 660 412" className="min-w-[560px]" role="img" aria-label="Browser calls the Express gateway, which calls Groq, Nominatim, Overpass, Open-Meteo, Wikipedia and Frankfurter">
                <defs>
                  <linearGradient id="gw" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--color-saffron)" stopOpacity="0.22" />
                    <stop offset="1" stopColor="var(--color-ember)" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Browser → gateway */}
                <path d={`M128 220 L${GW.x} 220`} className="stroke-white/15" strokeWidth="1.5" fill="none" />
                <path d={`M128 220 L${GW.x} 220`} pathLength={1} className="packet stroke-saffron" strokeWidth="3" strokeLinecap="round" fill="none" style={{ animationDuration: '1.6s' }} />

                {/* Gateway → providers */}
                {PROVIDERS.map((p, i) => {
                  const d = `M${GW.x + GW.w} 220 C ${GW.x + GW.w + 60} 220, ${470} ${p.y}, 520 ${p.y}`;
                  const on = active === p.id;
                  return (
                    <g key={p.id}>
                      <path d={d} fill="none" strokeWidth={on ? 2 : 1.25} className={cn('transition-all duration-300', on ? 'stroke-saffron' : 'stroke-white/12')} />
                      <path d={d} pathLength={1} fill="none" strokeWidth="3" strokeLinecap="round" className="packet stroke-saffron" style={{ animationDelay: `${i * 0.35}s`, animationDuration: '2.4s' }} />
                      <path d={d} pathLength={1} fill="none" strokeWidth="3" strokeLinecap="round" className="packet-back stroke-cream/70" style={{ animationDelay: `${i * 0.35 + 1.2}s`, animationDuration: '2.4s' }} />
                    </g>
                  );
                })}

                {/* Browser node */}
                <g>
                  <rect x="16" y="186" width="112" height="68" rx="14" className="fill-night stroke-white/15" strokeWidth="1" />
                  <text x="72" y="215" textAnchor="middle" className="fill-cream text-[13px] font-semibold">Browser</text>
                  <text x="72" y="233" textAnchor="middle" className="fill-cream/45 font-mono text-[10px]">React · Vite</text>
                </g>

                {/* Gateway node */}
                <g>
                  <rect x={GW.x} y={GW.y} width={GW.w} height={GW.h} rx="18" fill="url(#gw)" className="stroke-saffron/60" strokeWidth="1.25" />
                  <text x={GW.x + GW.w / 2} y={GW.y + 34} textAnchor="middle" className="fill-saffron font-mono text-[10px] tracking-widest">EXPRESS</text>
                  <text x={GW.x + GW.w / 2} y={GW.y + 56} textAnchor="middle" className="fill-cream text-[15px] font-semibold">API gateway</text>
                  {['validate · rate-limit', 'cache · retry', 'trace · merge'].map((t, i) => (
                    <text key={t} x={GW.x + GW.w / 2} y={GW.y + 78 + i * 13} textAnchor="middle" className="fill-cream/45 font-mono text-[9.5px]">
                      {t}
                    </text>
                  ))}
                </g>

                {/* Provider nodes */}
                {PROVIDERS.map((p) => {
                  const on = active === p.id;
                  return (
                    <g
                      key={p.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.name}: ${p.detail}`}
                      onMouseEnter={() => setActive(p.id)}
                      onFocus={() => setActive(p.id)}
                      onMouseLeave={() => setActive(null)}
                      onBlur={() => setActive(null)}
                      className="cursor-pointer outline-none"
                    >
                      <rect x="520" y={p.y - 23} width="128" height="46" rx="12" className={cn('transition-colors duration-300', on ? 'fill-saffron/15 stroke-saffron' : 'fill-night stroke-white/12')} strokeWidth="1" />
                      <circle cx="536" cy={p.y} r="3.5" className={on ? 'fill-saffron' : 'fill-[#5fd497]'} />
                      <text x="548" y={p.y - 3} className="fill-cream text-[12px] font-semibold">{p.name}</text>
                      <text x="548" y={p.y + 12} className="fill-cream/45 font-mono text-[9.5px]">{p.sub}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-2 min-h-[64px] rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm">
              <AnimatePresence mode="wait">
                <motion.p key={current?.id ?? 'hint'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-cream/65">
                  {current ? (
                    <>
                      <span className="font-semibold text-cream">{current.name}: </span>
                      {current.detail}
                    </>
                  ) : (
                    <span className="text-cream/40">Hover or tab to a provider to see how it is integrated. Amber packets are requests and light packets are responses.</span>
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
          </Reveal>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="flex gap-3.5 rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-saffron/12 text-saffron">
                    <f.icon size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-cream">{f.title}</h3>
                    <p className="mt-0.5 text-sm text-cream/55">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
