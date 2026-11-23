import { motion } from 'motion/react';
import { Buildings, ChartBar, CloudRain, CloudSun, FileText, Lightning, MapPin, Sparkle, Sun, TextAa } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Accent, Reveal, SectionHeading, SpotlightCard } from './primitives';

function Tile({ icon: Icon, title, body, children, className, delay = 0 }: { icon: typeof Sun; title: string; body: string; children?: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn('min-w-0', className)}>
      <SpotlightCard className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 text-saffron">
          <Icon size={20} weight="duotone" />
          <h3 className="font-display text-lg font-semibold text-cream">{title}</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-cream/55">{body}</p>
        {children && <div className="mt-6 flex-1">{children}</div>}
      </SpotlightCard>
    </Reveal>
  );
}

const WEEK = [
  { d: 'Mon', i: Sun, t: 31 },
  { d: 'Tue', i: Sun, t: 32 },
  { d: 'Wed', i: CloudSun, t: 30 },
  { d: 'Thu', i: CloudRain, t: 28 },
  { d: 'Fri', i: CloudSun, t: 29 },
  { d: 'Sat', i: Sun, t: 31 },
  { d: 'Sun', i: Sun, t: 32 },
];

const WATERFALL = [
  { label: 'nominatim', start: 0, len: 38 },
  { label: 'open-meteo', start: 40, len: 22 },
  { label: 'wikipedia', start: 40, len: 30 },
  { label: 'frankfurter', start: 40, len: 4, cached: true },
];

export function Bento() {
  return (
    <section id="features" className="bg-night py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Built like a product, <Accent>explained</Accent> like a lesson.
            </>
          }
          lead="Every screen in the workspace does real travel-desk work, and every screen shows the API calls behind it."
        />

        <div className="mt-14 grid auto-rows-[minmax(0,auto)] gap-4 md:grid-cols-6">
          <Tile className="md:col-span-4" icon={Lightning} title="Streaming itineraries" body="The model writes JSON Lines. The server pulls complete objects out of the token stream, validates each one and pushes day cards to the browser while the rest is still being written.">
            <div className="space-y-2">
              {['Arrival · Lake Pichola sunset cruise', 'City Palace, Jagdish Temple & old city walk', 'Day trip: Kumbhalgarh Fort & Ranakpur'].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.35 }}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
                >
                  <span className="rounded-md bg-saffron/15 px-1.5 py-0.5 font-mono text-[10px] text-saffron">Day {i + 1}</span>
                  <span className="truncate text-sm text-cream/80">{t}</span>
                </motion.div>
              ))}
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-3 py-2.5">
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-cream/40">Day 4</span>
                <span className="h-2 w-40 animate-shimmer rounded-full bg-white/10" />
              </div>
            </div>
          </Tile>

          <Tile className="md:col-span-2" icon={TextAa} title="Enquiry → lead" body="Free text in, a validated CRM lead out. Relative dates are resolved, and '1.5 lakh' becomes 150000.">
            <div className="flex flex-wrap gap-1.5">
              {['Goa', '4N', '12 Dec', '2 adults', '₹70,000', 'beach', 'WhatsApp'].map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.07, type: 'spring' }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-cream/80"
                >
                  {c}
                </motion.span>
              ))}
            </div>
          </Tile>

          <Tile className="md:col-span-2" icon={MapPin} title="Live destination intel" body="Geocoding, a 7-day forecast, a Wikipedia brief and the local currency, fetched in parallel.">
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEK.map((w) => (
                <div key={w.d} className="rounded-lg bg-black/20 py-2">
                  <div className="text-[10px] text-cream/40">{w.d}</div>
                  <w.i size={18} className="mx-auto my-1 text-saffron" weight="duotone" />
                  <div className="text-xs text-cream/80">{w.t}°</div>
                </div>
              ))}
            </div>
          </Tile>

          <Tile className="md:col-span-2" icon={Buildings} title="Real vs generated, clearly labelled" body="Real hotels from OpenStreetMap sit next to AI sample inventory, and the AI is never allowed to invent phone numbers.">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                <span className="text-cream/80">Trident, Jaipur</span>
                <span className="rounded bg-[#5fd497]/15 px-1.5 py-0.5 text-[#5fd497]">OSM · real</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                <span className="text-cream/80">Amber Courtyard Jaipur</span>
                <span className="rounded bg-saffron/15 px-1.5 py-0.5 text-saffron">AI · sample</span>
              </div>
            </div>
          </Tile>

          <Tile className="md:col-span-2" icon={FileText} title="Branded documents" body="Quotation, hotel voucher and GST tax invoice PDFs, with Excel export for hotels and leads.">
            <div className="relative h-24">
              {['Invoice', 'Voucher', 'Quotation'].map((d, i) => (
                <motion.div
                  key={d}
                  initial={{ rotate: 0, y: 10, opacity: 0 }}
                  whileInView={{ rotate: (i - 1) * 7, y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 120 }}
                  className="absolute left-1/2 top-0 w-28 -translate-x-1/2 rounded-lg border border-white/10 bg-cream p-2.5 shadow-xl"
                  style={{ marginLeft: (i - 1) * 46 }}
                >
                  <div className="h-1.5 w-10 rounded bg-night" />
                  <div className="mt-1 h-1 w-6 rounded bg-saffron" />
                  <div className="mt-3 space-y-1">
                    <div className="h-1 rounded bg-night/20" />
                    <div className="h-1 w-4/5 rounded bg-night/20" />
                    <div className="h-1 w-3/5 rounded bg-night/20" />
                  </div>
                  <div className="mt-2 text-[9px] font-semibold text-night/70">{d}</div>
                </motion.div>
              ))}
            </div>
          </Tile>

          <Tile className="md:col-span-6" icon={ChartBar} title="API Console: see every call" body="Health checks, provider statistics, a live feed of upstream requests and an interactive playground with ready-to-copy cURL. It is the integration story made visible.">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="scrollbar-thin min-w-0 overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-4 font-mono text-[11px] leading-relaxed whitespace-nowrap text-cream/70">
                <div>
                  <span className="text-[#5fd497]">GET</span> /api/destination?city=Udaipur
                </div>
                <div className="text-cream/35">x-request-id: 7f3a91c2 · 412 ms</div>
                <div className="mt-2 text-cream/50">{'"meta": { "upstream": ['}</div>
                <div className="pl-4">{'{ "provider": "openstreetmap", "ms": 152 },'}</div>
                <div className="pl-4">{'{ "provider": "open-meteo", "ms": 88 },'}</div>
                <div className="pl-4">{'{ "provider": "frankfurter", "cached": true }'}</div>
                <div className="text-cream/50">{']}'}</div>
              </div>
              <motion.div
                className="space-y-2.5 self-center"
                role="img"
                aria-label="Waterfall: geocoding first, then forecast, Wikipedia and a cached FX lookup in parallel"
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: '-40px' }}
                transition={{ staggerChildren: 0.12, delayChildren: 0.2 }}
              >
                {WATERFALL.map((w, i) => (
                  <div key={w.label} className="grid grid-cols-[88px_1fr] items-center gap-3">
                    <span className="font-mono text-[11px] text-cream/50">{w.label}</span>
                    <div className="relative h-3">
                      <motion.div
                        variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: 0.6, delay: i * 0.12 } } }}
                        style={{ left: `${w.start}%`, width: `${w.len}%`, transformOrigin: 'left' }}
                        className={`absolute inset-y-0 rounded-[4px] ${w.cached ? 'bg-cream/30' : 'bg-saffron'}`}
                      />
                    </div>
                  </div>
                ))}
                <p className="pl-[100px] text-[11px] text-cream/35">
                  <Sparkle className="mr-1 inline" />
                  Geocoding runs first, the rest in parallel. Grey bars are cache hits.
                </p>
              </motion.div>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
