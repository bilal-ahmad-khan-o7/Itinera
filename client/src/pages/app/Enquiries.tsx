import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  ChatCircleText,
  Copy,
  Database,
  DownloadSimple,
  Envelope,
  MagnifyingGlass,
  Phone,
  Sparkle,
  SpinnerGap,
  Trash,
  Tray,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DemoModeNotice, EmptyState, PageHeader, SourceBadge, StatusBadge } from '@/components/app/common';
import { TracePopover } from '@/components/app/TracePopover';
import { api, ApiError } from '@/lib/api';
import { formatDate, money, paxLabel, relativeTime, titleCase, todayIso } from '@/lib/format';
import { SAMPLE_ENQUIRIES } from '@/lib/samples';
import type { ApiEnvelope, ExtractedLead, Lead, LeadStatus } from '@/lib/types';
import { useCrm } from '@/store/crm';
import { useSettings } from '@/store/settings';

const CHANNEL_ICON = { whatsapp: WhatsappLogo, email: Envelope, phone: Phone, web: ChatCircleText, 'walk-in': ChatCircleText, other: ChatCircleText };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function LeadFields({ lead }: { lead: ExtractedLead }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Field label="Customer" value={lead.customerName} />
      <Field label="Destination" value={lead.destination} />
      <Field label="Start date" value={lead.startDate ? formatDate(lead.startDate) : null} />
      <Field label="Nights" value={lead.nights} />
      <Field label="Travellers" value={paxLabel(lead.adults, lead.children)} />
      <Field label="Budget" value={lead.budget ? `${money(lead.budget, lead.budgetCurrency)}${lead.budgetType === 'per_person' ? ' pp' : ''}` : null} />
      <Field label="Hotel" value={lead.hotelCategory ? `${lead.hotelCategory}-star` : null} />
      <Field label="Trip type" value={titleCase(lead.tripType)} />
      <Field label="Urgency" value={titleCase(lead.urgency)} />
      <Field label="Email" value={lead.email} />
      <Field label="Phone" value={lead.phone} />
      <Field label="Channel" value={titleCase(lead.channel)} />
    </dl>
  );
}

export default function Enquiries() {
  const navigate = useNavigate();
  const { leads, addLead, setLeadStatus, removeLead, loadSampleData } = useCrm();
  const agencyName = useSettings((s) => s.agency.name);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'all' | LeadStatus>('all');
  const [search, setSearch] = useState('');
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<{ body: string; source: string } | null>(null);

  const extract = useMutation({
    mutationFn: (t: string) => api<{ lead: ExtractedLead; source: string }>('/ai/enquiry', { method: 'POST', body: { text: t, today: todayIso() } }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Extraction failed'),
  });

  const compose = useMutation({
    mutationFn: (lead: Lead) =>
      api<{ subject: string; body: string; source: string }>('/ai/compose', {
        method: 'POST',
        body: {
          kind: 'whatsapp_followup',
          agencyName,
          context: { customerName: lead.customerName, destination: lead.destination, nights: lead.nights, missingInfo: lead.missingInfo, summary: lead.summary },
        },
      }),
    onSuccess: (res) => setDraft({ body: res.data.body, source: res.data.source }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not draft a message'),
  });

  const result = extract.data as ApiEnvelope<{ lead: ExtractedLead; source: string }> | undefined;

  const save = (andQuote: boolean) => {
    if (!result) return;
    const lead = addLead(result.data.lead, text);
    toast.success('Lead saved to the pipeline');
    setText('');
    extract.reset();
    if (andQuote) navigate(`/app/quotes/new?lead=${lead.id}`);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(
      (l) => (filter === 'all' || l.status === filter) && (!q || [l.customerName, l.destination, l.summary, l.email].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [leads, filter, search]);

  return (
    <>
      <PageHeader
        eyebrow="Query management"
        title="Enquiries"
        description="Paste a message from any channel. The LLM turns it into a structured lead and flags what you still need to ask."
        actions={
          <>
            <Button variant="outline" onClick={loadSampleData}>
              <Database /> Sample leads
            </Button>
            <Button
              variant="outline"
              disabled={!leads.length}
              onClick={async () => {
                const { exportLeads } = await import('@/lib/excel');
                await exportLeads(leads);
              }}
            >
              <DownloadSimple /> Export Excel
            </Button>
          </>
        }
      />
      <DemoModeNotice />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Composer */}
        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkle weight="duotone" className="text-primary" /> New enquiry
            </CardTitle>
            <CardDescription>Email, WhatsApp chat, call notes: anything a customer sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_ENQUIRIES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setText(s.text);
                    extract.reset();
                  }}
                  className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Hi! 2 of us want a Goa trip for 4 nights from 12 Dec, budget around 70k…"
              className="min-h-40 resize-y font-mono text-[13px] leading-relaxed"
              aria-label="Enquiry text"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">{text.length} / 6000</span>
              <Button onClick={() => extract.mutate(text)} disabled={text.trim().length < 10 || extract.isPending}>
                {extract.isPending ? <SpinnerGap className="animate-spin" /> : <Sparkle weight="fill" />}
                Extract lead
              </Button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-4 rounded-2xl border border-primary/30 bg-accent/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-auto text-sm font-medium">{result.data.lead.summary || 'Lead extracted'}</p>
                      <SourceBadge source={result.data.source} />
                      <TracePopover meta={result.meta} />
                    </div>
                    <LeadFields lead={result.data.lead} />
                    {result.data.lead.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.data.lead.interests.map((i) => (
                          <Badge key={i} variant="secondary" className="rounded-full">
                            {i}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {result.data.lead.missingInfo.length > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                        <WarningCircle weight="fill" className="mt-0.5 shrink-0 text-warning" />
                        <span>
                          <span className="font-medium">Ask the customer for: </span>
                          {result.data.lead.missingInfo.join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => save(false)}>
                        Save lead
                      </Button>
                      <Button onClick={() => save(true)}>
                        Save & build quote <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} variant="outline" size="sm" className="flex-wrap">
              {(['all', 'new', 'quoted', 'confirmed', 'invoiced', 'lost'] as const).map((f) => (
                <ToggleGroupItem key={f} value={f} className="px-3 capitalize">
                  {f}
                  <span className="ml-1 text-muted-foreground tabular-nums">{f === 'all' ? leads.length : leads.filter((l) => l.status === f).length}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="relative sm:ml-auto sm:w-56">
              <MagnifyingGlass className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" className="pl-8" aria-label="Search leads" />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Tray}
              title={leads.length ? 'Nothing matches' : 'No enquiries yet'}
              body={leads.length ? 'Try another filter or search term.' : 'Extract one from the composer or load the sample leads to explore the workflow.'}
              action={!leads.length && <Button onClick={loadSampleData}>Load sample leads</Button>}
            />
          ) : (
            <motion.ul layout className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.map((l) => {
                  const ChannelIcon = CHANNEL_ICON[l.channel] ?? ChatCircleText;
                  return (
                    <motion.li key={l.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <Card className="gap-0 py-0 transition-colors hover:border-primary/40">
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                          <button type="button" onClick={() => setOpenLead(l)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
                              <ChannelIcon size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                                {l.customerName ?? 'Unknown customer'}
                                {l.urgency === 'high' && (
                                  <Badge variant="outline" className="rounded-full border-destructive/40 text-[10px] text-destructive">
                                    urgent
                                  </Badge>
                                )}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {[l.destination, l.nights && `${l.nights}N`, paxLabel(l.adults, l.children), l.budget && money(l.budget)].filter(Boolean).join(' · ')}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(l.createdAt)}</p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Select value={l.status} onValueChange={(v) => setLeadStatus(l.id, v as LeadStatus)}>
                              <SelectTrigger size="sm" className="w-[130px]" aria-label="Lead status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(['new', 'quoted', 'confirmed', 'invoiced', 'lost'] as LeadStatus[]).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <StatusBadge status={s} />
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => navigate(l.quoteId ? `/app/quotes/${l.quoteId}` : `/app/quotes/new?lead=${l.id}`)}>
                              {l.quoteId ? 'Open quote' : 'Quote'} <ArrowRight />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>

      <Dialog
        open={!!openLead}
        onOpenChange={(o) => {
          if (!o) {
            setOpenLead(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {openLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {openLead.customerName ?? 'Unknown customer'} <StatusBadge status={openLead.status} />
                </DialogTitle>
                <DialogDescription>{openLead.summary}</DialogDescription>
              </DialogHeader>
              <LeadFields lead={openLead} />
              {openLead.missingInfo.length > 0 && <p className="text-sm text-muted-foreground">Still to ask: {openLead.missingInfo.join(', ')}</p>}
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Original message</p>
                <pre className="max-h-40 overflow-auto rounded-xl bg-secondary/60 p-3 font-mono text-xs whitespace-pre-wrap">{openLead.rawText}</pre>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">WhatsApp follow-up</p>
                  <Button size="sm" variant="outline" onClick={() => compose.mutate(openLead)} disabled={compose.isPending}>
                    {compose.isPending ? <SpinnerGap className="animate-spin" /> : <Sparkle />} {draft ? 'Redraft' : 'Draft with AI'}
                  </Button>
                </div>
                {draft && (
                  <div className="mt-3 space-y-2">
                    <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-28 text-sm" aria-label="Draft message" />
                    <div className="flex items-center justify-between">
                      <SourceBadge source={draft.source} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(draft.body);
                          toast.success('Copied to clipboard');
                        }}
                      >
                        <Copy /> Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    removeLead(openLead.id);
                    setOpenLead(null);
                    toast('Lead deleted');
                  }}
                >
                  <Trash /> Delete
                </Button>
                <Button onClick={() => navigate(openLead.quoteId ? `/app/quotes/${openLead.quoteId}` : `/app/quotes/new?lead=${openLead.id}`)}>
                  {openLead.quoteId ? 'Open quote' : 'Build quote'} <ArrowRight />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
