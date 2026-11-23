import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowSquareOut,
  Buildings,
  DownloadSimple,
  Globe,
  Heart,
  MagnifyingGlass,
  MapPin,
  Phone,
  Sparkle,
  SpinnerGap,
  Star,
  Users,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DemoModeNotice, EmptyState, PageHeader, SourceBadge } from '@/components/app/common';
import { TracePopover } from '@/components/app/TracePopover';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { POPULAR_DESTINATIONS } from '@/lib/samples';
import type { AiHotel, HotelFilters, OsmHotel, Place, ResponseMeta } from '@/lib/types';
import { useCrm } from '@/store/crm';
import { cn } from '@/lib/utils';

const AMENITIES = ['Swimming pool', 'Spa', 'Free Wi-Fi', 'Gym', 'Airport shuttle', 'Kids club', 'Restaurant', 'Parking'];
const PURPOSES = ['any', 'families', 'honeymoon', 'business', 'groups'];
const PRICE_MAX = 40000;

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'rating';

function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${n} star`}>
      {Array.from({ length: Math.round(n) }, (_, i) => (
        <Star key={i} weight="fill" size={12} />
      ))}
    </span>
  );
}

function AiHotelCard({ hotel, city, index }: { hotel: AiHotel; city: string; index: number }) {
  const toggle = useCrm((s) => s.toggleShortlist);
  const saved = useCrm((s) => s.shortlist.some((x) => x.hotel.id === hotel.id));
  // Warm hues only (amber → clay), derived from the name so cards are distinguishable.
  const h = 42 + (hue(hotel.name) % 38);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (index % 12) * 0.03 }}>
      <Card className="h-full gap-0 overflow-hidden py-0">
        <div className="relative h-28 p-4" style={{ background: `linear-gradient(135deg, oklch(0.82 0.12 ${h}) 0%, oklch(0.64 0.14 ${h - 10}) 100%)` }}>
          <div className="bg-dots absolute inset-0 text-black opacity-20" />
          <div className="relative flex items-start justify-between">
            <Badge className="rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/35">
              <Stars n={hotel.starCategory} />
            </Badge>
            <button
              type="button"
              onClick={() => toggle({ kind: 'ai', city, hotel })}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
              className="grid size-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-transform hover:scale-110"
            >
              <Heart weight={saved ? 'fill' : 'bold'} size={16} className={saved ? 'text-red-400' : ''} />
            </button>
          </div>
          <p className="absolute bottom-3 left-4 font-display text-3xl font-bold text-black/25">{hotel.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</p>
        </div>
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="leading-snug font-semibold">{hotel.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={13} /> {hotel.area} · {hotel.distanceFromCenterKm} km from centre
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{hotel.highlight}</p>
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 4).map((a) => (
              <Badge key={a} variant="secondary" className="rounded-full text-[11px] font-normal">
                {a}
              </Badge>
            ))}
            {hotel.amenities.length > 4 && <Badge variant="outline" className="rounded-full text-[11px] font-normal">+{hotel.amenities.length - 4}</Badge>}
          </div>
          <div className="mt-auto flex items-end justify-between border-t pt-3">
            <div>
              <p className="text-lg font-semibold">{money(hotel.pricePerNight)}</p>
              <p className="text-xs text-muted-foreground">per night · {hotel.mealPlan}</p>
            </div>
            <div className="text-right">
              <p className="inline-flex items-center gap-1 rounded-md bg-success/12 px-1.5 py-0.5 text-sm font-semibold">
                {hotel.rating.toFixed(1)} <Star weight="fill" size={12} className="text-success" />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hotel.availableRooms} rooms left</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function OsmHotelCard({ hotel, city }: { hotel: OsmHotel; city: string }) {
  const toggle = useCrm((s) => s.toggleShortlist);
  const saved = useCrm((s) => s.shortlist.some((x) => x.hotel.id === hotel.id));
  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="leading-snug font-semibold">{hotel.name}</h3>
            {hotel.stars ? <Stars n={hotel.stars} className="mt-1 text-primary" /> : <p className="text-xs text-muted-foreground">Star rating not mapped</p>}
          </div>
          <button
            type="button"
            onClick={() => toggle({ kind: 'osm', city, hotel })}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
            className="grid size-8 shrink-0 place-items-center rounded-full border transition-colors hover:border-primary"
          >
            <Heart weight={saved ? 'fill' : 'regular'} size={15} className={saved ? 'text-red-500' : ''} />
          </button>
        </div>
        {hotel.address && (
          <p className="flex gap-1.5 text-sm text-muted-foreground">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {hotel.address}
          </p>
        )}
        {hotel.phone && (
          <p className="flex items-center gap-1.5 text-sm">
            <Phone size={14} className="text-muted-foreground" /> {hotel.phone}
          </p>
        )}
        {hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.map((a) => (
              <Badge key={a} variant="secondary" className="rounded-full text-[11px] font-normal">
                {a}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm">
          {hotel.website && (
            <a href={hotel.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
              <Globe size={14} /> Website
            </a>
          )}
          <a href={hotel.osmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:underline">
            <ArrowSquareOut size={14} /> OpenStreetMap
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Hotels() {
  const [cityInput, setCityInput] = useState('Jaipur');
  const [city, setCity] = useState('');
  const [tab, setTab] = useState('ai');
  const [price, setPrice] = useState<[number, number]>([0, PRICE_MAX]);
  const [minRating, setMinRating] = useState('0');
  const [stars, setStars] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('any');
  const [sort, setSort] = useState<Sort>('recommended');
  const [pages, setPages] = useState<{ hotels: AiHotel[]; meta: ResponseMeta; source: string }[]>([]);
  const shortlist = useCrm((s) => s.shortlist);

  const filters: HotelFilters = {
    minPrice: price[0] || undefined,
    maxPrice: price[1] < PRICE_MAX ? price[1] : undefined,
    minRating: Number(minRating) || undefined,
    stars: stars.map(Number),
    amenities,
    purpose: purpose === 'any' ? undefined : purpose,
  };

  const aiSearch = useMutation({
    mutationFn: ({ city, page, exclude }: { city: string; page: number; exclude: string[] }) =>
      api<{ hotels: AiHotel[]; source: string; rejected: number }>('/ai/hotels', { method: 'POST', body: { city, page, count: 12, filters, exclude } }),
    onSuccess: (res, vars) => {
      setPages((p) => (vars.page === 1 ? [{ hotels: res.data.hotels, meta: res.meta, source: res.data.source }] : [...p, { hotels: res.data.hotels, meta: res.meta, source: res.data.source }]));
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Hotel search failed'),
  });

  const osm = useQuery({
    queryKey: ['osm-hotels', city],
    queryFn: () => api<{ place: Place; hotels: OsmHotel[]; radius: number; source: 'overpass' | 'nominatim'; fallbackReason: string | null; attribution: string }>('/hotels/real', { query: { city } }),
    enabled: !!city && tab === 'osm',
  });

  const run = (target = cityInput.trim()) => {
    if (target.length < 2) return;
    setCity(target);
    setCityInput(target);
    setPages([]);
    // State updates are async, so the city travels with the mutation variables.
    aiSearch.mutate({ city: target, page: 1, exclude: [] });
  };

  const aiHotels = useMemo(() => {
    const all = pages.flatMap((p) => p.hotels);
    const filtered = all.filter(
      (h) => h.pricePerNight >= price[0] && (price[1] >= PRICE_MAX || h.pricePerNight <= price[1]) && h.rating >= Number(minRating) && (!stars.length || stars.includes(String(h.starCategory))),
    );
    const sorted = [...filtered];
    if (sort === 'price-asc') sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
    if (sort === 'price-desc') sorted.sort((a, b) => b.pricePerNight - a.pricePerNight);
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [pages, price, minRating, stars, sort]);

  const lastPage = pages.at(-1);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Hotel finder"
        description="Compare AI-generated sample inventory with real hotels from OpenStreetMap, shortlist the best and use them in quotes."
      />
      <DemoModeNotice />

      <form
        className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="City or region (e.g. Jaipur, Goa, Bali)" className="h-11 border-0 pl-10 text-base shadow-none focus-visible:ring-0" aria-label="City" />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:hidden lg:flex">
          {POPULAR_DESTINATIONS.slice(0, 5).map((d) => (
            <button key={d} type="button" onClick={() => run(d)} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
              {d}
            </button>
          ))}
        </div>
        <Button type="submit" size="lg" disabled={aiSearch.isPending}>
          {aiSearch.isPending && aiSearch.variables?.page === 1 ? <SpinnerGap className="animate-spin" /> : <MagnifyingGlass />} Search
        </Button>
      </form>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="ai">
            <Sparkle /> AI inventory
          </TabsTrigger>
          <TabsTrigger value="osm">
            <Buildings /> Real hotels
          </TabsTrigger>
          <TabsTrigger value="shortlist">
            <Heart /> Shortlist <span className="text-muted-foreground tabular-nums">{shortlist.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <Card className="h-fit gap-5 py-5 lg:sticky lg:top-6">
              <CardContent className="space-y-5 px-5">
                <div>
                  <Label className="mb-3 block">
                    Price per night{' '}
                    <span className="font-normal text-muted-foreground">
                      {money(price[0])} – {price[1] >= PRICE_MAX ? 'any' : money(price[1])}
                    </span>
                  </Label>
                  <Slider min={0} max={PRICE_MAX} step={500} value={price} onValueChange={(v) => setPrice(v as [number, number])} aria-label="Price range" />
                </div>
                <div>
                  <Label className="mb-2 block">Star category</Label>
                  <ToggleGroup type="multiple" value={stars} onValueChange={setStars} variant="outline" size="sm" className="w-full">
                    {['2', '3', '4', '5'].map((s) => (
                      <ToggleGroupItem key={s} value={s} className="flex-1 gap-0.5">
                        {s}
                        <Star weight="fill" size={11} />
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <div>
                  <Label className="mb-2 block">Guest rating</Label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="3.5">3.5+ good</SelectItem>
                      <SelectItem value="4">4.0+ very good</SelectItem>
                      <SelectItem value="4.5">4.5+ excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Ideal for</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p === 'any' ? 'Any traveller' : p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Must have</legend>
                  <div className="space-y-2">
                    {AMENITIES.map((a) => (
                      <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox checked={amenities.includes(a)} onCheckedChange={(c) => setAmenities((prev) => (c ? [...prev, a] : prev.filter((x) => x !== a)))} />
                        {a}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Button className="w-full" variant="secondary" disabled={!city || aiSearch.isPending} onClick={() => run(city)}>
                  Apply to AI search
                </Button>
                <p className="text-xs text-muted-foreground">Price, stars and rating also filter loaded results instantly. Amenities and purpose are sent to the model.</p>
              </CardContent>
            </Card>

            <div className="min-w-0">
              {pages.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <p className="mr-auto text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{aiHotels.length}</span> sample hotels in {city}
                  </p>
                  {lastPage && <SourceBadge source={lastPage.source} />}
                  {lastPage && <TracePopover meta={lastPage.meta} />}
                  <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                    <SelectTrigger size="sm" className="w-[170px]" aria-label="Sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Recommended</SelectItem>
                      <SelectItem value="price-asc">Price: low to high</SelectItem>
                      <SelectItem value="price-desc">Price: high to low</SelectItem>
                      <SelectItem value="rating">Guest rating</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const { exportAiHotels } = await import('@/lib/excel');
                      await exportAiHotels(aiHotels, city);
                    }}
                  >
                    <DownloadSimple /> Excel
                  </Button>
                </div>
              )}

              {aiSearch.isPending && pages.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-80 rounded-xl" />
                  ))}
                </div>
              ) : pages.length === 0 ? (
                <EmptyState icon={Sparkle} title="Search a destination" body="The model returns realistic sample inventory: prices in INR, star categories, amenities and meal plans. It is labelled as sample data and never includes invented phone numbers." />
              ) : (
                <>
                  <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence>
                      {aiHotels.map((h, i) => (
                        <AiHotelCard key={h.id} hotel={h} city={city} index={i} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      disabled={aiSearch.isPending || pages.length >= 8}
                      onClick={() => aiSearch.mutate({ city, page: pages.length + 1, exclude: pages.flatMap((p) => p.hotels.map((h) => h.name)) })}
                    >
                      {aiSearch.isPending ? <SpinnerGap className="animate-spin" /> : <Sparkle />} Load 12 more
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="osm">
          {!city ? (
            <EmptyState icon={Buildings} title="Search a city first" body="Real hotels come from OpenStreetMap via the Overpass API: community-mapped properties with website and phone where available." />
          ) : osm.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : osm.isError ? (
            <EmptyState
              icon={Buildings}
              title="OpenStreetMap didn't answer"
              body={(osm.error as Error).message + '. The public Overpass server is sometimes busy; try again in a minute.'}
              action={<Button onClick={() => osm.refetch()}>Retry</Button>}
            />
          ) : osm.data ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{osm.data.data.hotels.length}</span> mapped hotels within {(osm.data.data.radius / 1000).toFixed(0)} km of {osm.data.data.place.name}, {osm.data.data.place.country}
                </p>
                <TracePopover meta={osm.data.meta} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!osm.data.data.hotels.length}
                  onClick={async () => {
                    const { exportOsmHotels } = await import('@/lib/excel');
                    await exportOsmHotels(osm.data!.data.hotels, city);
                  }}
                >
                  <DownloadSimple /> Excel
                </Button>
              </div>
              {osm.data.data.hotels.length === 0 ? (
                <EmptyState icon={Buildings} title="No mapped hotels here" body="Try a city name rather than a region; regions are searched around their centre point." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {osm.data.data.hotels.map((h) => (
                    <OsmHotelCard key={h.id} hotel={h} city={city} />
                  ))}
                </div>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                {osm.data.data.attribution} · via {osm.data.data.source === 'overpass' ? 'Overpass API' : 'Nominatim'}
                {osm.data.data.fallbackReason && ` (Overpass unavailable: ${osm.data.data.fallbackReason})`}
              </p>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="shortlist">
          {shortlist.length === 0 ? (
            <EmptyState icon={Heart} title="Nothing shortlisted" body="Tap the heart on any hotel. Shortlisted hotels can be picked in the quote builder." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shortlist.map((s, i) =>
                s.kind === 'ai' ? <AiHotelCard key={s.hotel.id} hotel={s.hotel} city={s.city} index={i} /> : <OsmHotelCard key={s.hotel.id} hotel={s.hotel} city={s.city} />,
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <Users size={14} /> AI inventory is sample data for prototyping quotes. Always confirm rates and availability with the property.
      </p>
    </>
  );
}
