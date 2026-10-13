import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChatsCircle, MapTrifold, Receipt, Ticket } from '@phosphor-icons/react';
import { Accent, SectionHeading, ease } from './primitives';

const STEPS = [
  {
    n: '01',
    icon: ChatsCircle,
    title: 'Query',
    body: 'Paste any enquiry: email, WhatsApp chat or call notes. The LLM returns a validated lead and lists what the agent still needs to ask.',
    tag: 'POST /api/ai/enquiry',
  },
  {
    n: '02',
    icon: MapTrifold,
    title: 'Quotation',
    body: 'A day-wise itinerary streams in over Server-Sent Events. Costs are editable lines with markup, 5% GST and live exchange rates.',
    tag: 'POST /api/ai/itinerary',
  },
  {
    n: '03',
    icon: Ticket,
    title: 'Voucher',
    body: 'Confirm the booking and issue a branded hotel & services voucher with arrival schedule, meal plan and guest details.',
    tag: 'jsPDF · client-side',
  },
  {
    n: '04',
    icon: Receipt,
    title: 'Invoice',
    body: 'Generate a GST tax invoice under SAC 998555, with CGST/SGST or IGST worked out from the place of supply and the amount in words.',
    tag: 'Indian GST rules',
  },
];

export function Workflow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const width = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="workflow" className="relative bg-night py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="The workflow"
          title={
            <>
              The whole sales desk, in <Accent>four moves</Accent>.
            </>
          }
          lead="Itinera follows the query → quotation → voucher → invoice pipeline that travel CRMs are built around, and puts an API integration behind each step."
        />

        <div ref={ref} className="relative mt-16">
          {/* Progress rail (desktop) */}
          <div className="absolute top-7 right-[12.5%] left-[12.5%] hidden h-px bg-white/10 lg:block">
            <motion.div style={{ width }} className="h-full bg-gradient-to-r from-saffron via-saffron to-ember" />
          </div>

          <ol className="grid gap-5 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                className="relative flex flex-col"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: i * 0.08, ease }}
              >
                  <div className="relative z-10 mx-auto mb-6 hidden size-14 place-items-center rounded-2xl border border-saffron/30 bg-night-2 text-saffron shadow-[0_0_40px_-8px] shadow-saffron/40 lg:grid">
                    <s.icon size={26} weight="duotone" />
                  </div>
                  <div className="flex-1 rounded-3xl border border-white/8 bg-night-2/60 p-6 transition-colors hover:border-saffron/25">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-cream/35">{s.n}</span>
                      <s.icon size={22} weight="duotone" className="text-saffron lg:hidden" />
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-cream">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-cream/60">{s.body}</p>
                    <code className="mt-5 inline-block rounded-md border border-white/8 bg-black/30 px-2 py-1 font-mono text-[11px] text-saffron/90">{s.tag}</code>
                  </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
