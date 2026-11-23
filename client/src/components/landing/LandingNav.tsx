import { useState } from 'react';
import { Link } from 'react-router';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, List, X } from '@phosphor-icons/react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#workflow', label: 'Workflow' },
  { href: '#integrations', label: 'Integrations' },
  { href: '#features', label: 'Features' },
  { href: '#architecture', label: 'Under the hood' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-3"
    >
      <nav
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-3 py-2 transition-all duration-300 sm:px-4',
          scrolled || open ? 'border-white/10 bg-night/75 shadow-2xl shadow-black/40 backdrop-blur-xl' : 'border-transparent bg-transparent',
        )}
      >
        <Link to="/" aria-label="Itinera home" className="text-cream">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-cream/65 transition-colors hover:bg-white/5 hover:text-cream">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden rounded-xl bg-saffron font-semibold text-night hover:bg-saffron/90 sm:inline-flex">
            <Link to="/app">
              Open workspace <ArrowRight weight="bold" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-lg text-cream/80 hover:bg-white/5 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/10 bg-night/90 p-2 backdrop-blur-xl md:hidden"
        >
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-cream/80 hover:bg-white/5">
              {l.label}
            </a>
          ))}
          <Link to="/app" className="mt-1 flex items-center justify-between rounded-lg bg-saffron px-3 py-2.5 font-semibold text-night">
            Open workspace <ArrowRight weight="bold" />
          </Link>
        </motion.div>
      )}
    </motion.header>
  );
}
