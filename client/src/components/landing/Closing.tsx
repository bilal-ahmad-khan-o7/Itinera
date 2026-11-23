import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { Accent, Reveal, SectionHeading } from './primitives';

const FAQ = [
  {
    q: 'Is the hotel data real?',
    a: 'Both kinds are available, and they are labelled differently. The "Real hotels" tab queries OpenStreetMap through the Overpass API and returns mapped properties with website and phone where contributors added them. The "AI inventory" tab asks the LLM for realistic sample inventory to prototype quotes; it is marked as sample data and the prompt forbids inventing contact details.',
  },
  {
    q: 'Where do the API keys live?',
    a: 'Only on the server, in Railway environment variables. The browser talks to /api on the same origin, and the Express gateway attaches credentials when it calls Groq. The original prototype called Groq from the browser with the key in the page source; removing that was the first fix.',
  },
  {
    q: 'What happens when an external API is slow or down?',
    a: 'Every call has a timeout and transient failures are retried with backoff. Geocoding fails over from Nominatim to Open-Meteo. The destination endpoint uses Promise.allSettled, so a Wikipedia outage shows up as a warning instead of failing the whole request.',
  },
  {
    q: 'Can it run without an LLM key?',
    a: 'Yes. Without LLM_API_KEY the server starts in demo mode. AI routes return deterministic sample output, including a simulated token stream, while the free APIs (weather, maps, Wikipedia, FX) are still called live.',
  },
  {
    q: 'Which LLM does it use?',
    a: 'Any OpenAI-compatible Chat Completions endpoint. It defaults to Groq, and LLM_BASE_URL and LLM_MODEL switch providers or models with no code changes.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-night py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions a <Accent>reviewer</Accent> would ask.
            </>
          }
        />
        <Reveal delay={0.1}>
          <Accordion type="single" collapsible className="rounded-3xl border border-white/8 bg-night-2/50 px-5">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className="border-white/8">
                <AccordionTrigger className="py-5 text-left text-base text-cream hover:no-underline [&>svg]:text-saffron">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-cream/60">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="bg-night px-4 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-saffron px-6 py-16 text-night sm:px-14 sm:py-20"
      >
        <div aria-hidden className="bg-grid absolute inset-0 text-night opacity-30 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <motion.div aria-hidden className="absolute -right-24 -bottom-24 size-80 rounded-full bg-ember/40 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            Turn the next enquiry into an <span className="font-serif font-normal italic">invoice</span>.
          </h2>
          <p className="mt-5 max-w-lg text-base text-night/70 sm:text-lg">Load the sample leads, generate a streamed itinerary and download all three documents in under two minutes.</p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-night px-6 text-base font-semibold text-cream hover:bg-night/90">
            <Link to="/app">
              Open the workspace <ArrowRight weight="bold" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/6 bg-night px-4 pt-14 pb-10 text-sm text-cream/50">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="text-cream" />
          <p className="mt-4 max-w-xs leading-relaxed">An AI travel desk that shows, step by step, how a web app integrates and orchestrates third-party APIs.</p>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-cream/40">Built as an internship project at DeBox Global IT Solutions, Noida.</p>
        </div>
        <div>
          <h3 className="font-medium text-cream">Workspace</h3>
          <ul className="mt-3 space-y-2">
            <li><Link className="hover:text-cream" to="/app/enquiries">Enquiries</Link></li>
            <li><Link className="hover:text-cream" to="/app/quotes/new">Quote builder</Link></li>
            <li><Link className="hover:text-cream" to="/app/hotels">Hotel finder</Link></li>
            <li><Link className="hover:text-cream" to="/app/api">API Console</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-cream">Data sources</h3>
          <ul className="mt-3 space-y-2">
            <li><a className="hover:text-cream" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></li>
            <li><a className="hover:text-cream" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a></li>
            <li><a className="hover:text-cream" href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License" target="_blank" rel="noreferrer">Wikipedia (CC BY-SA)</a></li>
            <li><a className="hover:text-cream" href="https://frankfurter.dev" target="_blank" rel="noreferrer">Rates by Frankfurter / ECB</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-cream">Stack</h3>
          <ul className="mt-3 space-y-2">
            <li>React · TypeScript</li>
            <li>Tailwind CSS · shadcn/ui</li>
            <li>Motion · Phosphor</li>
            <li>Express · Railway</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col justify-between gap-2 border-t border-white/6 pt-6 text-xs text-cream/35 sm:flex-row">
        <span>© {new Date().getFullYear()} Itinera. AI-generated content is for prototyping; verify before booking.</span>
        <span className="font-mono">v2.0</span>
      </div>
    </footer>
  );
}
