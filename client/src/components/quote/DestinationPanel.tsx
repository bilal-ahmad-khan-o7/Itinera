import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowSquareOut, Drop, Warning } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WeatherIcon } from '@/components/app/common';
import { TracePopover } from '@/components/app/TracePopover';
import { api } from '@/lib/api';
import { addDays, formatDate } from '@/lib/format';
import type { DestinationIntel } from '@/lib/types';
import { cn } from '@/lib/utils';

export function useDestination(city: string) {
  return useQuery({
    queryKey: ['destination', city.toLowerCase()],
    queryFn: () => api<DestinationIntel>('/destination', { query: { city } }),
    enabled: city.trim().length >= 2,
    staleTime: 30 * 60_000,
  });
}

export function DestinationPanel({ city, startDate, nights, compact = false }: { city: string; startDate?: string; nights?: number; compact?: boolean }) {
  const q = useDestination(city);

  if (city.trim().length < 2) return null;
  if (q.isLoading) {
    return (
      <Card className="overflow-hidden py-0">
        <div className="grid md:grid-cols-[220px_1fr]">
          <Skeleton className="h-44 rounded-none md:h-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </Card>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Card className="py-4">
        <CardContent className="flex items-center gap-2 px-5 text-sm text-muted-foreground">
          <Warning className="text-warning" /> {(q.error as Error)?.message ?? 'No destination data'}
        </CardContent>
      </Card>
    );
  }

  const { place, weather, wiki, fx, warnings } = q.data.data;
  const tripEnd = startDate && nights ? addDays(startDate, nights) : null;
  const inTrip = (d: string) => !!startDate && !!tripEnd && d >= startDate && d <= tripEnd;
  const overlap = weather?.daily.some((d) => inTrip(d.date));
  const localRate = place.currency && fx?.rates[place.currency];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden py-0">
        <div className={cn('grid', !compact && wiki?.image && 'md:grid-cols-[230px_minmax(0,1fr)]')}>
          {!compact && wiki?.image && (
            <div className="relative h-44 md:h-auto">
              {/* The REST summary thumbnail is small but light; originals can be several MB. */}
              <img src={wiki.thumbnail ?? wiki.image} alt={wiki.title} className="absolute inset-0 size-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-2 left-3 text-[10px] text-white/80">Image: Wikipedia</span>
            </div>
          )}
          <div className="min-w-0 space-y-4 p-5">
            <div className="flex flex-wrap items-start gap-2">
              <div className="mr-auto min-w-0">
                <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                  {/* Flag images instead of emoji: Windows doesn't render regional-indicator flags. */}
                  {place.countryCode && <img src={`https://flagcdn.com/w40/${place.countryCode.toLowerCase()}.png`} alt={place.country ?? ''} className="h-4 w-auto rounded-[3px] shadow-sm" loading="lazy" />}
                  {place.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {[place.region !== place.name ? place.region : null, place.country, place.timezone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <TracePopover meta={q.data.meta} />
            </div>

            {wiki?.extract && !compact && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{wiki.extract}</p>}

            {weather && (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Now {Math.round(weather.current.temperature)}°C, {weather.current.label.toLowerCase()} · feels {Math.round(weather.current.feelsLike)}°
                  </span>
                  <span>{overlap ? 'Highlighted: your travel dates' : startDate ? 'Trip is beyond the 7-day forecast' : '7-day outlook'}</span>
                </div>
                <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
                  {weather.daily.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.label}, rain ${d.rainChance ?? 0}%`}
                      className={cn('min-w-[62px] flex-1 rounded-xl border px-2 py-2 text-center', inTrip(d.date) ? 'border-primary bg-accent' : 'bg-secondary/40')}
                    >
                      <p className="text-[11px] text-muted-foreground">{formatDate(d.date, { weekday: 'short' })}</p>
                      <WeatherIcon icon={d.icon} className="mx-auto my-1 text-foreground" />
                      <p className="text-xs font-medium tabular-nums">
                        {Math.round(d.max)}° <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                      </p>
                      {(d.rainChance ?? 0) >= 30 && (
                        <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-lagoon">
                          <Drop size={10} weight="fill" />
                          {d.rainChance}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {place.currency && (
                <span>
                  Local currency <span className="font-medium text-foreground">{place.currency}</span>
                  {localRate && place.currency !== 'INR' ? ` · ₹1 = ${localRate.toFixed(4)} ${place.currency}` : ''}
                  {!place.currencySupported && place.currency !== 'INR' ? ' (no ECB rate)' : ''}
                </span>
              )}
              {fx?.rates.USD && <span>₹1,000 = ${(1000 * fx.rates.USD).toFixed(2)}</span>}
              <span>Geocoded by {place.source === 'nominatim' ? 'OpenStreetMap Nominatim' : 'Open-Meteo (fallback)'}</span>
              {wiki?.url && (
                <a href={wiki.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  Wikipedia <ArrowSquareOut size={11} />
                </a>
              )}
            </div>
            {warnings.length > 0 && (
              <p className="text-xs text-warning">
                <Warning className="mr-1 inline" />
                {warnings.map((w) => `${w.source}: ${w.message}`).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
