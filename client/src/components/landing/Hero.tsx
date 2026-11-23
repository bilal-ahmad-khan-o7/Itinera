import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, Key, Lightning, Train } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { HeroConsole } from './HeroConsole';
import { Accent, ease } from './primitives';

const HEADLINE: { text: string; accent?: boolean }[][] = [
  [{ text: 'From' }, { text: 'enquiry', accent: true }, { text: 'to' }, { text: 'invoice,', accent: true }],
  [{ text: 'at' }, { text: 'the' }, { text: 'speed' }, { text: 'of' }, { text: 'a' }, { text: 'prompt.' }],
];

export function Hero() {
  let i = 0;
  return (
    <section className="grain relative overflow-hidden bg-night pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid mask-fade-b absolute inset-0 text-cream opacity-40" />
        <motion.div
          className="absolute -top-40 right-[-10%] size-[42rem] rounded-full bg-saffron/20 blur-[120px]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-[-20%] left-[-10%] size-[36rem] rounded-full bg-ember/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <motion.a
            href="#integrations"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pr-3 pl-1.5 text-xs text-cream/75 backdrop-blur transition-colors hover:border-saffron/40"
          >
            <span className="flex items-center gap-1.5 rounded-full bg-saffron/15 px-2 py-0.5 font-medium text-saffron">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-saffron opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-saffron" />
              </span>
              Live
            </span>
            7 travel &amp; AI APIs behind one Express gateway
            <ArrowRight size={12} />
          </motion.a>

          <h1 className="mt-7 font-display text-[2.9rem] leading-[0.98] font-semibold tracking-tight text-cream sm:text-6xl lg:text-[4.6rem]">
            {HEADLINE.map((line, li) => (
              <span key={li} className="block">
                {line.map((w) => {
                  const delay = 0.15 + i++ * 0.06;
                  return (
                    <motion.span
                      key={w.text}
                      className="mr-[0.22em] inline-block"
                      initial={{ opacity: 0, y: '0.5em', filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.7, delay, ease }}
                    >
                      {w.accent ? <Accent className="pr-1">{w.text}</Accent> : w.text}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75, ease }}
            className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-cream/65"
          >
            Itinera is an AI travel desk for tour operators. Paste a WhatsApp enquiry and get a structured lead, a day-wise itinerary
            that streams in live, pricing with markup, GST and real exchange rates, then a hotel voucher and a tax invoice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 rounded-xl bg-saffron px-6 text-base font-semibold text-night shadow-[0_10px_40px_-10px] shadow-saffron/60 hover:bg-saffron/90">
              <Link to="/app">
                Open the workspace <ArrowRight weight="bold" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-xl border border-white/12 px-6 text-base text-cream hover:bg-white/5 hover:text-cream">
              <a href="#integrations">
                See how the APIs connect <ArrowDown />
              </a>
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-cream/50"
          >
            <li className="flex items-center gap-2">
              <Key className="text-saffron" /> No API keys in the browser
            </li>
            <li className="flex items-center gap-2">
              <Lightning className="text-saffron" /> Demo mode works without an LLM key
            </li>
            <li className="flex items-center gap-2">
              <Train className="text-saffron" /> One-click Railway deploy
            </li>
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.4, ease }}
          style={{ perspective: 1200 }}
        >
          <HeroConsole />
        </motion.div>
      </div>
    </section>
  );
}
