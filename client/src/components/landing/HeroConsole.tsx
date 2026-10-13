import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, FilePdf, Receipt, Sparkle, Ticket, WhatsappLogo } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/*
 * A scripted illustration of the real workflow. The numbers are internally
 * consistent (₹62,400 + 5% GST = ₹65,520) but this panel makes no API calls.
 */

const MESSAGE = 'Hi! 2 of us want a Goa trip, 4 nights from 12 Dec. Budget ~70k. Beaches + seafood pls 🙏';

const CHIPS = [
  ['Destination', 'Goa'],
  ['Dates', '12–16 Dec'],
  ['Travellers', '2 adults'],
  ['Budget', '₹70,000'],
  ['Interests', 'beach · food'],
  ['Channel', 'WhatsApp'],
];

const DAYS = [
  ['Day 1', 'Arrival · Candolim sunset'],
  ['Day 2', 'Fort Aguada & North Goa beaches'],
  ['Day 3', 'Old Goa churches · spice farm'],
  ['Day 4', 'Palolem & South Goa seafood trail'],
  ['Day 5', 'Departure'],
];

const CALLS = [
  { stage: 1, provider: 'groq', label: 'enquiry → JSON', ms: '840 ms' },
  { stage: 2, provider: 'nominatim', label: 'geocode Goa', ms: '412 ms' },
  { stage: 2, provider: 'open-meteo', label: '7-day forecast', ms: '233 ms' },
  { stage: 2, provider: 'groq', label: 'itinerary stream', ms: '1.9 s' },
  { stage: 3, provider: 'frankfurter', label: 'INR → USD', ms: 'cached' },
];

const STAGE_MS = [3200, 2600, 4200, 3800];

export function HeroConsole() {
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGE_MS.length), STAGE_MS[stage]);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 0) return;
    setTyped(0);
    const id = setInterval(() => setTyped((n) => (n >= MESSAGE.length ? n : n + 2)), 28);
    return () => clearInterval(id);
  }, [stage]);

  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-saffron/25 via-transparent to-ember/20 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-night-2/90 shadow-2xl shadow-black/60 backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 font-mono text-[11px] text-cream/40">itinera / enquiries / new</span>
          <span className="ml-auto flex gap-1">
            {STAGE_MS.map((_, i) => (
              <span key={i} className={cn('h-1 w-5 rounded-full transition-colors duration-500', i <= stage ? 'bg-saffron' : 'bg-white/10')} />
            ))}
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* Incoming message */}
          <div className="flex gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1f3d2f] text-[#5fd497]">
              <WhatsappLogo weight="fill" size={16} />
            </div>
            <div className="min-h-[60px] flex-1 rounded-2xl rounded-tl-sm border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-[13px] leading-relaxed text-cream/85">
              {stage === 0 ? MESSAGE.slice(0, typed) : MESSAGE}
              {stage === 0 && typed < MESSAGE.length && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-saffron" />}
            </div>
          </div>

          <div className="relative min-h-[236px]">
            <AnimatePresence mode="wait">
              {stage === 0 && (
                <motion.div key="idle" exit={{ opacity: 0 }} className="flex h-[236px] items-center justify-center text-sm text-cream/35">
                  <span className="flex items-center gap-2">
                    <Sparkle className="animate-pulse text-saffron" /> Waiting for the enquiry…
                  </span>
                </motion.div>
              )}

              {stage === 1 && (
                <motion.div key="lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
                  <p className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-wider text-saffron uppercase">
                    <Sparkle weight="fill" /> Lead extracted
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CHIPS.map(([k, v], idx) => (
                      <motion.div
                        key={k}
                        initial={{ opacity: 0, scale: 0.9, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.08 * idx, type: 'spring', stiffness: 260, damping: 22 }}
                        className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                      >
                        <div className="text-[10px] tracking-wider text-cream/40 uppercase">{k}</div>
                        <div className="text-sm font-medium text-cream">{v}</div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-xs text-cream/45">
                    Missing: hotel category — the agent is prompted to ask.
                  </motion.p>
                </motion.div>
              )}

              {stage === 2 && (
                <motion.div key="itinerary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} className="space-y-1.5">
                  <p className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-wider text-saffron uppercase">
                    <span className="size-1.5 animate-pulse rounded-full bg-saffron" /> Streaming itinerary
                  </p>
                  {DAYS.map(([d, t], idx) => (
                    <motion.div
                      key={d}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 * idx, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="rounded-md bg-saffron/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-saffron">{d}</span>
                      <span className="truncate text-[13px] text-cream/85">{t}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {stage === 3 && (
                <motion.div key="price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="rounded-2xl border border-saffron/25 bg-gradient-to-br from-saffron/12 to-transparent p-4">
                    <div className="flex items-baseline justify-between text-sm text-cream/60">
                      <span>Package (4N/5D, 2 adults)</span>
                      <span className="font-mono">₹62,400</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-sm text-cream/60">
                      <span>CGST 2.5% + SGST 2.5%</span>
                      <span className="font-mono">₹3,120</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                      <span className="text-sm text-cream/70">Total payable</span>
                      <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="font-display text-3xl font-semibold text-cream">
                        ₹65,520
                      </motion.span>
                    </div>
                    <div className="mt-1 text-right font-mono text-[11px] text-cream/40">≈ USD 684 · ECB rate</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      [FilePdf, 'Quotation'],
                      [Ticket, 'Voucher'],
                      [Receipt, 'GST invoice'],
                    ].map(([Icon, label], idx) => {
                      const I = Icon as typeof FilePdf;
                      return (
                        <motion.div
                          key={label as string}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + idx * 0.2 }}
                          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-xs text-cream/80"
                        >
                          <I size={16} className="text-saffron" />
                          {label as string}
                          <CheckCircle weight="fill" className="ml-auto text-[#5fd497]" />
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Network strip */}
        <div className="border-t border-white/8 bg-black/20 px-4 py-2.5">
          <div className="flex min-h-[26px] flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
            <span className="mr-1 text-cream/30">network</span>
            <AnimatePresence>
              {CALLS.filter((c) => c.stage <= stage && stage > 0).map((c) => (
                <motion.span
                  key={c.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.04] px-1.5 py-0.5 text-cream/60"
                >
                  <span className={cn('size-1.5 rounded-full', c.ms === 'cached' ? 'bg-cream/40' : 'bg-[#5fd497]')} />
                  {c.provider} <span className="text-cream/35">{c.ms}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
