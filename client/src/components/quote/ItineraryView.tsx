import { AnimatePresence, motion } from 'motion/react';
import {
  AirplaneLanding,
  AirplaneTakeoff,
  Binoculars,
  Car,
  Coffee,
  Compass,
  ForkKnife,
  Key,
  Moon,
  ShoppingBag,
  SignOut,
  type Icon,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/format';
import type { ItemKind, ItineraryDay } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const KIND_ICON: Record<ItemKind, Icon> = {
  arrival: AirplaneLanding,
  departure: AirplaneTakeoff,
  transfer: Car,
  checkin: Key,
  checkout: SignOut,
  sightseeing: Binoculars,
  activity: Compass,
  meal: ForkKnife,
  leisure: Coffee,
  shopping: ShoppingBag,
};

export function ItineraryView({ days, pending }: { days: ItineraryDay[]; pending: number }) {
  return (
    <ol className="relative space-y-4">
      <AnimatePresence initial={false}>
        {days.map((d) => (
          <motion.li
            key={d.day}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="rounded-2xl border bg-card"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
              <span className="rounded-lg bg-primary px-2 py-0.5 font-mono text-xs font-semibold text-primary-foreground">Day {d.day}</span>
              <h4 className="font-semibold">{d.title}</h4>
              <span className="ml-auto text-xs text-muted-foreground">
                {d.date ? formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }) : d.city}
              </span>
            </div>
            <ul className="space-y-0 px-4 py-2">
              {d.items.map((item, i) => {
                const I = KIND_ICON[item.kind] ?? Compass;
                return (
                  <li key={i} className="relative grid grid-cols-[44px_28px_minmax(0,1fr)] items-start gap-2 py-2">
                    <span className="pt-1 font-mono text-xs text-muted-foreground tabular-nums">{item.time}</span>
                    <span className="relative z-10 grid size-7 place-items-center rounded-full border bg-background">
                      <I size={14} />
                    </span>
                    {i < d.items.length - 1 && <span className="absolute top-9 bottom-0 left-[65px] w-px bg-border" aria-hidden />}
                    <div className="pt-0.5">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {(d.overnight || d.meals) && (
              <div className="flex flex-wrap gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
                {d.overnight && d.overnight !== '—' && (
                  <span className="flex items-center gap-1">
                    <Moon size={12} /> Overnight: {d.overnight}
                  </span>
                )}
                {d.meals && d.meals !== '-' && (
                  <span className="flex items-center gap-1">
                    <ForkKnife size={12} /> Meals: {d.meals}
                  </span>
                )}
              </div>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
      {Array.from({ length: pending }, (_, i) => (
        <li key={`p${i}`} className="rounded-2xl border border-dashed p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-48" />
          </div>
          {i === 0 && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
