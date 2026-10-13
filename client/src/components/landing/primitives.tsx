import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const ease = [0.22, 1, 0.36, 1] as const;

/** Fade + rise when scrolled into view. */
export function Reveal({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-saffron', className)}>
      <span className="h-px w-6 bg-saffron/60" />
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, lead, className, align = 'left' }: { eyebrow: string; title: ReactNode; lead?: ReactNode; className?: string; align?: 'left' | 'center' }) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <Reveal>
        <SectionEyebrow className={align === 'center' ? 'justify-center' : undefined}>{eyebrow}</SectionEyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.05] text-cream sm:text-5xl">{title}</h2>
      </Reveal>
      {lead && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-pretty text-base leading-relaxed text-cream/60 sm:text-lg">{lead}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Serif italic accent used inside display headings. */
export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-serif font-normal italic tracking-normal text-saffron', className)}>{children}</span>;
}

/** Animated count-up that starts when visible. */
export function CountUp({ to, suffix = '', className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const value = useMotionValue(0);
  const spring = useSpring(value, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) value.set(to);
  }, [inView, to, value]);
  useEffect(() => spring.on('change', (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

/** Card with a soft spotlight that follows the cursor. */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`);
        ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/8 bg-night-2/70 p-6 transition-colors duration-300 hover:border-saffron/25',
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500 before:content-[''] hover:before:opacity-100",
        'before:bg-[radial-gradient(420px_circle_at_var(--mx)_var(--my),color-mix(in_oklch,var(--color-saffron)_12%,transparent),transparent_60%)]',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
