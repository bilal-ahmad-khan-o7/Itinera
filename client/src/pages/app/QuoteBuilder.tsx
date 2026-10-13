import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  CheckCircle,
  Code,
  Copy,
  EnvelopeSimple,
  FilePdf,
  FloppyDisk,
  Heart,
  Lightning,
  PaperPlaneTilt,
  Receipt,
  Sparkle,
  SpinnerGap,
  Stop,
  Ticket,
  Trash,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DemoModeNotice, PageHeader, SourceBadge, StatusBadge } from '@/components/app/common';
import { TracePopover } from '@/components/app/TracePopover';
import { DestinationPanel, useDestination } from '@/components/quote/DestinationPanel';
import { ItineraryView } from '@/components/quote/ItineraryView';
import { PricingEditor } from '@/components/quote/PricingEditor';
import { api, ApiError, streamSse } from '@/lib/api';
import { addDays, formatDate, money, paxLabel, todayIso } from '@/lib/format';
import { computeTotals, linesFromEstimate } from '@/lib/pricing';
import { INTEREST_OPTIONS, POPULAR_DESTINATIONS } from '@/lib/samples';
import type { ItineraryDay, ItinerarySummary, Lead, Quote, ResponseMeta } from '@/lib/types';
import { useCrm } from '@/store/crm';
import { useSettings, type AgencyProfile } from '@/store/settings';
import { cn } from '@/lib/utils';

const TRIP_TYPES = ['leisure', 'honeymoon', 'family', 'adventure', 'pilgrimage', 'business', 'group'];

function blankQuote(agency: AgencyProfile, markup: number, gstPct: number, lead?: Lead): Quote {
  const now = new Date().toISOString();
  const adults = lead?.adults ?? 2;
  return {
    id: crypto.randomUUID(),
    number: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    leadId: lead?.id,
    client: { name: lead?.customerName ?? '', email: lead?.email ?? '', phone: lead?.phone ?? '', state: agency.state },
    trip: {
      destination: lead?.destination ?? '',
      origin: lead?.origin ?? '',
      startDate: lead?.startDate ?? addDays(todayIso(), 30),
      nights: lead?.nights ?? 4,
      adults,
      children: lead?.children ?? 0,
      rooms: lead?.rooms ?? Math.max(1, Math.ceil(adults / 2)),
      hotelCategory: lead?.hotelCategory ?? 4,
      tripType: lead?.tripType && TRIP_TYPES.includes(lead.tripType) ? lead.tripType : 'leisure',
      interests: lead?.interests ?? [],
      pace: 'balanced',
      notes: lead?.specialRequests ?? '',
    },
    itinerary: [],
    pricing: { lines: [], markupPct: markup, gstPct, clientType: 'B2C', supply: 'intra', currency: 'INR', fxRate: 1 },
  };
}

function NumberField({ id, label, value, onChange, min = 0, max = 99 }: { id: string; label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Input id={id} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className="tabular-nums" />
    </div>
  );
}

export default function QuoteBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { quotes, leads, shortlist, saveQuote, removeQuote, nextNumber, updateLead } = useCrm();
  const { agency, defaultMarkupB2C, gstPct } = useSettings();

  const existing = id ? quotes.find((q) => q.id === id) : undefined;
  const lead = existing?.leadId ? leads.find((l) => l.id === existing.leadId) : leads.find((l) => l.id === params.get('lead'));

  const [quote, setQuote] = useState<Quote>(() => {
    if (existing) return existing;
    const q = blankQuote(agency, defaultMarkupB2C, gstPct, lead);
    const dest = params.get('destination');
    return dest && !q.trip.destination ? { ...q, trip: { ...q.trip, destination: dest } } : q;
  });
  const [dirty, setDirty] = useState(!existing);
  const update = (fn: (q: Quote) => Quote) => {
    setQuote(fn);
    setDirty(true);
  };
  const setTrip = (patch: Partial<Quote['trip']>) => update((q) => ({ ...q, trip: { ...q.trip, ...patch } }));
  const setClient = (patch: Partial<Quote['client']>) => update((q) => ({ ...q, client: { ...q.client, ...patch } }));

  // Destination is committed on blur so typing doesn't fire a request per keystroke.
  const [committedDest, setCommittedDest] = useState(quote.trip.destination);
  const intel = useDestination(committedDest);

  /* ───────── Streaming itinerary ───────── */
  const [streaming, setStreaming] = useState(false);
  const [expected, setExpected] = useState(0);
  const [streamSource, setStreamSource] = useState<string>();
  const [streamMeta, setStreamMeta] = useState<ResponseMeta>();
  const [showRaw, setShowRaw] = useState(false);
  const [raw, setRaw] = useState('');
  const rawRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);
  const [ttfd, setTtfd] = useState<number | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => setRaw(rawRef.current), 120);
    return () => clearInterval(t);
  }, [streaming]);

  const generate = async () => {
    const t = quote.trip;
    if (t.destination.trim().length < 2) return toast.error('Add a destination first');
    setCommittedDest(t.destination);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    rawRef.current = '';
    setRaw('');
    setTtfd(null);
    setStreamMeta(undefined);
    setStreaming(true);
    startedRef.current = performance.now();
    update((q) => ({ ...q, itinerary: [], summary: undefined }));

    try {
      await streamSse(
        '/ai/itinerary',
        {
          destination: t.destination,
          origin: t.origin || undefined,
          startDate: t.startDate || undefined,
          nights: t.nights,
          adults: t.adults,
          children: t.children,
          hotelCategory: t.hotelCategory,
          tripType: t.tripType,
          interests: t.interests,
          pace: t.pace,
          notes: t.notes || undefined,
        },
        {
          start: (d) => {
            setExpected(d.days);
            setStreamSource(d.source);
          },
          token: (d) => {
            rawRef.current += d.t;
          },
          day: (day: ItineraryDay) => {
            setTtfd((v) => v ?? Math.round(performance.now() - startedRef.current));
            update((q) => ({ ...q, itinerary: [...q.itinerary.filter((x) => x.day !== day.day), day].sort((a, b) => a.day - b.day) }));
          },
          summary: (s: ItinerarySummary) =>
            update((q) => ({
              ...q,
              summary: s,
              pricing: { ...q.pricing, lines: linesFromEstimate(q.trip, s.estimate, q.hotel?.pricePerNight) },
            })),
          done: (d) => setStreamMeta(d.meta),
          error: (e) => toast.error(e.message ?? 'Generation failed'),
        },
        ac.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error(err instanceof ApiError ? err.message : 'Could not reach the itinerary stream');
    } finally {
      setRaw(rawRef.current);
      setStreaming(false);
    }
  };

  /* ───────── Pricing & totals ───────── */
  const pax = quote.trip.adults + quote.trip.children;
  const totals = useMemo(() => computeTotals(quote.pricing, pax), [quote.pricing, pax]);
  const budget = lead?.budget ? (lead.budgetType === 'per_person' ? lead.budget * pax : lead.budget) : null;

  // Auto-pick IGST vs CGST/SGST from the client's state.
  useEffect(() => {
    const intra = !quote.client.state || quote.client.state.trim().toLowerCase() === agency.state.trim().toLowerCase();
    const supply = intra ? 'intra' : 'inter';
    if (quote.pricing.supply !== supply) setQuote((q) => ({ ...q, pricing: { ...q.pricing, supply } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.client.state, agency.state]);

  const hotelOptions = shortlist.filter((s) => !quote.trip.destination || s.city.toLowerCase().includes(quote.trip.destination.toLowerCase()) || quote.trip.destination.toLowerCase().includes(s.city.toLowerCase()));

  /* ───────── Persistence & documents ───────── */
  const persist = (patch: Partial<Quote> = {}) => {
    const number = quote.number || nextNumber('quote');
    const next = { ...quote, ...patch, number, heroImage: intel.data?.data.wiki?.thumbnail ?? quote.heroImage ?? null };
    setQuote(next);
    saveQuote(next);
    setDirty(false);
    if (next.leadId) {
      const leadStatus = next.status === 'invoiced' ? 'invoiced' : next.status === 'confirmed' ? 'confirmed' : 'quoted';
      updateLead(next.leadId, { quoteId: next.id, status: leadStatus });
    }
    if (!id) navigate(`/app/quotes/${next.id}`, { replace: true });
    return next;
  };

  const requireItinerary = () => {
    if (!quote.itinerary.length) {
      toast.error('Generate the itinerary first');
      return false;
    }
    return true;
  };

  const downloadQuotation = async () => {
    if (!requireItinerary()) return;
    const saved = persist(quote.status === 'draft' ? { status: 'sent' } : {});
    const { quotationPdf } = await import('@/lib/pdf');
    quotationPdf(saved, agency);
    toast.success(`Quotation ${saved.number} downloaded`);
  };

  const confirmBooking = async () => {
    if (!requireItinerary()) return;
    const saved = persist({ status: 'confirmed', voucherNumber: quote.voucherNumber || nextNumber('voucher') });
    const { voucherPdf } = await import('@/lib/pdf');
    voucherPdf(saved, agency, saved.voucherNumber!);
    toast.success(`Booking confirmed · voucher ${saved.voucherNumber}`);
  };

  const issueInvoice = async () => {
    if (!requireItinerary()) return;
    const saved = persist({
      status: 'invoiced',
      voucherNumber: quote.voucherNumber || nextNumber('voucher'),
      invoiceNumber: quote.invoiceNumber || nextNumber('invoice'),
      invoiceDate: quote.invoiceDate || todayIso(),
    });
    const { invoicePdf } = await import('@/lib/pdf');
    invoicePdf(saved, agency, saved.invoiceNumber!, saved.invoiceDate!);
    toast.success(`Tax invoice ${saved.invoiceNumber} downloaded`);
  };

  const [emailOpen, setEmailOpen] = useState(false);
  const [mail, setMail] = useState({ subject: '', body: '' });
  const email = useMutation({
    mutationFn: () =>
      api<{ subject: string; body: string; source: string }>('/ai/compose', {
        method: 'POST',
        body: {
          kind: 'quote_email',
          agencyName: agency.name,
          context: {
            customerName: quote.client.name,
            destination: quote.trip.destination,
            startDate: quote.trip.startDate,
            nights: quote.trip.nights,
            travellers: paxLabel(quote.trip.adults, quote.trip.children),
            hotel: quote.hotel?.name ?? `${quote.trip.hotelCategory}-star hotel`,
            total: totals.total,
            perPerson: totals.perPerson,
            inclusions: quote.summary?.inclusions?.slice(0, 5),
            quoteNumber: quote.number,
          },
        },
      }),
    onSuccess: (res) => {
      setMail({ subject: res.data.subject, body: res.data.body });
      setEmailOpen(true);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not draft the email'),
  });

  const t = quote.trip;
  const pending = streaming ? Math.max(0, Math.min(2, expected - quote.itinerary.length)) : 0;

  return (
    <>
      <PageHeader
        eyebrow={quote.number || 'New quotation'}
        title={t.destination ? `${t.nights}N/${t.nights + 1}D · ${t.destination}` : 'Quote builder'}
        description={lead ? `From enquiry: ${lead.summary}` : 'Build a day-wise, priced quotation and issue the voucher and GST invoice from it.'}
        actions={
          <>
            {quote.number && <StatusBadge status={quote.status} kind="quote" />}
            <Button variant="outline" onClick={() => persist()} disabled={!dirty && !!quote.number}>
              <FloppyDisk /> {dirty ? 'Save' : 'Saved'}
            </Button>
          </>
        }
      />
      <DemoModeNotice />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* Trip */}
          <Card>
            <CardHeader>
              <CardTitle>Client & trip</CardTitle>
              <CardDescription>Everything the itinerary prompt and the documents need.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="client" className="mb-1.5 block">
                    Client name
                  </Label>
                  <Input id="client" value={quote.client.name} onChange={(e) => setClient({ name: e.target.value })} placeholder="e.g. Sneha Iyer" />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-1.5 block">
                    Email
                  </Label>
                  <Input id="email" type="email" value={quote.client.email} onChange={(e) => setClient({ email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-1.5 block">
                    Phone
                  </Label>
                  <Input id="phone" value={quote.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="dest" className="mb-1.5 block">
                    Destination
                  </Label>
                  <Input
                    id="dest"
                    list="dest-list"
                    value={t.destination}
                    onChange={(e) => setTrip({ destination: e.target.value })}
                    onBlur={() => setCommittedDest(t.destination)}
                    onKeyDown={(e) => e.key === 'Enter' && setCommittedDest(t.destination)}
                    placeholder="City or region"
                  />
                  <datalist id="dest-list">
                    {POPULAR_DESTINATIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="origin" className="mb-1.5 block">
                    Travelling from
                  </Label>
                  <Input id="origin" value={t.origin} onChange={(e) => setTrip({ origin: e.target.value })} placeholder="e.g. Delhi" />
                </div>
                <div>
                  <Label htmlFor="start" className="mb-1.5 block">
                    Start date
                  </Label>
                  <Input id="start" type="date" value={t.startDate} min={todayIso()} onChange={(e) => setTrip({ startDate: e.target.value })} />
                </div>
                <NumberField id="nights" label="Nights" value={t.nights} min={1} max={21} onChange={(n) => setTrip({ nights: n })} />
                <NumberField id="adults" label="Adults" value={t.adults} min={1} max={30} onChange={(n) => setTrip({ adults: n })} />
                <NumberField id="children" label="Children" value={t.children} min={0} max={10} onChange={(n) => setTrip({ children: n })} />
                <NumberField id="rooms" label="Rooms" value={t.rooms} min={1} max={30} onChange={(n) => setTrip({ rooms: n })} />
                <div>
                  <Label className="mb-1.5 block">Hotel category</Label>
                  <Select value={String(t.hotelCategory)} onValueChange={(v) => setTrip({ hotelCategory: Number(v) })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}-star
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Trip type</Label>
                  <Select value={t.tripType} onValueChange={(v) => setTrip({ tripType: v })}>
                    <SelectTrigger className="w-full capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_TYPES.map((tt) => (
                        <SelectItem key={tt} value={tt} className="capitalize">
                          {tt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Pace</Label>
                  <ToggleGroup type="single" value={t.pace} onValueChange={(v) => v && setTrip({ pace: v as Quote['trip']['pace'] })} variant="outline" className="w-full">
                    {['relaxed', 'balanced', 'packed'].map((p) => (
                      <ToggleGroupItem key={p} value={p} className="flex-1 capitalize">
                        {p}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cstate" className="mb-1.5 block">
                    Client's state (GST place of supply)
                  </Label>
                  <Input id="cstate" value={quote.client.state} onChange={(e) => setClient({ state: e.target.value })} placeholder={agency.state} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Interests</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...INTEREST_OPTIONS, ...t.interests])].map((i) => {
                    const on = t.interests.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTrip({ interests: on ? t.interests.filter((x) => x !== i) : [...t.interests, i] })}
                        className={cn('rounded-full border px-3 py-1 text-sm capitalize transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50')}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="mb-1.5 block">
                  Notes for the planner
                </Label>
                <Textarea id="notes" value={t.notes} onChange={(e) => setTrip({ notes: e.target.value })} placeholder="e.g. vegetarian meals, avoid long drives on day 1, anniversary dinner on day 3" className="min-h-20" />
              </div>
            </CardContent>
          </Card>

          <DestinationPanel city={committedDest} startDate={t.startDate} nights={t.nights} />

          {/* Hotel */}
          <Card>
            <CardHeader>
              <CardTitle>Hotel</CardTitle>
              <CardDescription>Pick from your shortlist, or leave it to the {t.hotelCategory}-star estimate.</CardDescription>
            </CardHeader>
            <CardContent>
              {hotelOptions.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart /> No shortlisted hotels for this destination yet. Use the Hotel finder to add some.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {hotelOptions.map((s) => {
                    const selected = quote.hotel?.name === s.hotel.name;
                    const rate = s.kind === 'ai' ? s.hotel.pricePerNight : undefined;
                    return (
                      <button
                        key={s.hotel.id}
                        type="button"
                        onClick={() =>
                          update((q) => {
                            const hotel = selected
                              ? undefined
                              : {
                                  name: s.hotel.name,
                                  area: s.kind === 'ai' ? s.hotel.area : s.hotel.address ?? '',
                                  pricePerNight: rate ?? q.summary?.estimate.hotelPerNight ?? 0,
                                  mealPlan: s.kind === 'ai' ? s.hotel.mealPlan : undefined,
                                  source: s.kind,
                                };
                            const lines = q.pricing.lines.map((l, i) => (i === 0 && l.label.startsWith('Hotel') && hotel?.pricePerNight ? { ...l, rate: hotel.pricePerNight } : l));
                            return { ...q, hotel, pricing: { ...q.pricing, lines } };
                          })
                        }
                        className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', selected ? 'border-primary bg-accent' : 'hover:border-primary/40')}
                      >
                        <CheckCircle weight={selected ? 'fill' : 'regular'} className={selected ? 'text-foreground' : 'text-muted-foreground'} size={20} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.hotel.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.kind === 'ai' ? `${money(s.hotel.pricePerNight)}/night · AI sample` : 'OpenStreetMap · rate on request'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itinerary */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Day-wise itinerary {streamSource && <SourceBadge source={streamSource} />}
                </CardTitle>
                <CardDescription>Streamed over Server-Sent Events; each day is validated on the server before it reaches you.</CardDescription>
              </div>
              <div className="flex gap-2">
                {streaming ? (
                  <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                    <Stop weight="fill" /> Stop
                  </Button>
                ) : (
                  <Button onClick={generate}>
                    <Sparkle weight="fill" /> {quote.itinerary.length ? 'Regenerate' : 'Generate itinerary'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {(streaming || streamMeta) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {streaming ? (
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <SpinnerGap className="animate-spin" /> Streaming day {Math.min(quote.itinerary.length + 1, expected)} of {expected}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle weight="fill" className="text-success" /> {quote.itinerary.length} days received
                        </span>
                      )}
                      {ttfd !== null && (
                        <span className="flex items-center gap-1">
                          <Lightning size={12} /> first day after {ttfd} ms
                        </span>
                      )}
                      <button type="button" onClick={() => setShowRaw((s) => !s)} className="flex items-center gap-1 hover:text-foreground">
                        <Code size={12} /> {showRaw ? 'Hide' : 'Show'} raw stream
                      </button>
                      {streamMeta && <TracePopover meta={streamMeta} className="ml-auto" />}
                    </div>
                    <Progress value={expected ? (quote.itinerary.length / expected) * 100 : 0} className="h-1.5" />
                    {showRaw && (
                      <pre className="scrollbar-thin max-h-48 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-paper/80">
                        {raw || 'waiting for first token…'}
                        {streaming && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />}
                      </pre>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {quote.itinerary.length === 0 && !streaming ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Fill in the trip details and press <span className="font-medium text-foreground">Generate itinerary</span>. Day cards appear as the model writes them.
                </div>
              ) : (
                <ItineraryView days={quote.itinerary} pending={pending} />
              )}

              {quote.summary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 rounded-2xl bg-secondary/50 p-4 md:grid-cols-3">
                  {[
                    ['Included', quote.summary.inclusions],
                    ['Not included', quote.summary.exclusions],
                    ['Good to know', quote.summary.tips],
                  ].map(([title, list]) => (
                    <div key={title as string}>
                      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title as string}</p>
                      <ul className="space-y-1 text-sm">
                        {(list as string[]).map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Costing</CardTitle>
              <CardDescription>Net supplier cost → markup → 5% GST. Lines are pre-filled from the AI estimate; edit anything.</CardDescription>
            </CardHeader>
            <CardContent>
              <PricingEditor
                pricing={quote.pricing}
                onChange={(p) => update((q) => ({ ...q, pricing: p }))}
                canReset={!!quote.summary}
                onResetFromAi={() => update((q) => ({ ...q, pricing: { ...q.pricing, lines: linesFromEstimate(q.trip, q.summary?.estimate, q.hotel?.pricePerNight) } }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary rail */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
          <Card className="overflow-hidden py-0">
            <div className="bg-ink p-5 text-paper">
              <p className="text-xs tracking-wide text-paper/55 uppercase">Total payable</p>
              <motion.p key={totals.total} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-5xl font-semibold tracking-tight">
                {money(totals.total)}
              </motion.p>
              <p className="mt-1 text-sm text-paper/60">
                {money(totals.perPerson)} per person · {paxLabel(t.adults, t.children)}
              </p>
              {quote.pricing.currency !== 'INR' && (
                <p className="mt-2 font-mono text-xs text-primary">
                  ≈ {money(totals.totalFx, quote.pricing.currency)} · {money(totals.perPersonFx, quote.pricing.currency)} pp
                </p>
              )}
            </div>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net cost</span>
                <span className="tabular-nums">{money(totals.net)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Markup ({quote.pricing.markupPct}%)</span>
                <span className="tabular-nums">{money(totals.markup)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable value</span>
                <span className="tabular-nums">{money(totals.taxable)}</span>
              </div>
              {quote.pricing.supply === 'intra' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST {quote.pricing.gstPct / 2}%</span>
                    <span className="tabular-nums">{money(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST {quote.pricing.gstPct / 2}%</span>
                    <span className="tabular-nums">{money(totals.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST {quote.pricing.gstPct}%</span>
                  <span className="tabular-nums">{money(totals.igst)}</span>
                </div>
              )}
              {budget && totals.total > 0 && (
                <div className={cn('mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs', totals.total <= budget ? 'bg-success/12' : 'bg-warning/15')}>
                  {totals.total <= budget ? <CheckCircle weight="fill" className="mt-px shrink-0 text-success" /> : <Warning weight="fill" className="mt-px shrink-0 text-warning" />}
                  <span>
                    Client budget {money(budget)}: {totals.total <= budget ? `${money(budget - totals.total)} headroom` : `${money(totals.total - budget)} over`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>Numbers are assigned on first download.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5">
              <Button className="w-full justify-start" variant="outline" onClick={downloadQuotation}>
                <FilePdf /> Quotation PDF
                {quote.number && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{quote.number}</span>}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => email.mutate()} disabled={email.isPending}>
                {email.isPending ? <SpinnerGap className="animate-spin" /> : <EnvelopeSimple />} Draft email to client
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={confirmBooking}>
                <Ticket /> {quote.voucherNumber ? 'Download voucher' : 'Confirm & issue voucher'}
                {quote.voucherNumber && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{quote.voucherNumber}</span>}
              </Button>
              <Button className="w-full justify-start" onClick={issueInvoice}>
                <Receipt /> {quote.invoiceNumber ? 'Download tax invoice' : 'Issue GST invoice'}
                {quote.invoiceNumber && <span className="ml-auto font-mono text-[11px] opacity-70">{quote.invoiceNumber}</span>}
              </Button>
            </CardContent>
          </Card>

          {quote.number && (
            <div className="flex justify-between px-1 text-xs text-muted-foreground">
              <span>
                Created {formatDate(quote.createdAt)}
                {quote.invoiceDate ? ` · invoiced ${formatDate(quote.invoiceDate)}` : ''}
              </span>
              <button
                type="button"
                className="flex items-center gap-1 hover:text-destructive"
                onClick={() => {
                  removeQuote(quote.id);
                  if (quote.leadId) updateLead(quote.leadId, { quoteId: undefined, status: 'new' });
                  toast('Quote deleted');
                  navigate('/app/quotes');
                }}
              >
                <Trash size={12} /> Delete
              </button>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PaperPlaneTilt /> Email to {quote.client.name || 'client'}
            </DialogTitle>
            <DialogDescription>Review and copy into your mail client. Nothing is sent automatically.</DialogDescription>
          </DialogHeader>
          {email.data && (
            <div className="space-y-3">
              <Input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} aria-label="Subject" />
              <Textarea value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} className="min-h-64 text-sm" aria-label="Email body" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SourceBadge source={email.data.data.source} />
                  <TracePopover meta={email.data.meta} />
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${mail.subject}\n\n${mail.body}`);
                    toast.success('Copied to clipboard');
                  }}
                >
                  <Copy /> Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
