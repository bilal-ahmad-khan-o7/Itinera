import { cn } from '@/lib/utils';

/** The mark is an "i" whose stem is a route line: a dot for the destination, a path to get there. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-saffron" />
      <circle cx="16" cy="9" r="3" className="fill-night" />
      <path d="M11 25.5c0-4 5-4.2 5-8.5v-2" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-night" />
      <circle cx="11" cy="25.5" r="1.6" className="fill-night" />
    </svg>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('font-display text-xl font-bold tracking-tight', wordmarkClassName)}>Itinera</span>
    </span>
  );
}
