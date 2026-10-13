import { useMemo } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChatsCircle, CheckCircle, Database, FilePlus, PlusCircle, TerminalWindow } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoModeNotice, PageHeader, StatusBadge, leadStatusMeta } from '@/components/app/common';
import { useCrm } from '@/store/crm';
import { useSettings } from '@/store/settings';
import { api } from '@/lib/api';
import { computeTotals } from '@/lib/pricing';
import { compact, money, relativeTime } from '@/lib/format';
import type { Integration, LeadStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function StatTile({ label, value, hint, delay }: { label: string; value: string; hint?: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full gap-1 py-5">
        <CardContent className="px-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const leads = useCrm((s) => s.leads);
  const quotes = useCrm((s) => s.quotes);
  const loadSampleData = useCrm((s) => s.loadSampleData);
  const agency = useSettings((s) => s.agency);

  const integrations = useQuery({ queryKey: ['integrations'], queryFn: () => api<{ integrations: Integration[]; demoMode: boolean }>('/meta/integrations') });

  const stats = useMemo(() => {
    const totals = quotes.map((q) => ({ q, t: computeTotals(q.pricing, q.trip.adults + q.trip.children).total }));
    const pipeline = totals.filter(({ q }) => q.status === 'draft' || q.status === 'sent').reduce((s, x) => s + x.t, 0);
    const won = totals.filter(({ q }) => q.status === 'confirmed' || q.status === 'invoiced').reduce((s, x) => s + x.t, 0);
    const byStatus = (['new', 'quoted', 'confirmed', 'invoiced', 'lost'] as LeadStatus[]).map((status) => ({ status, count: leads.filter((l) => l.status === status).length }));
    const decided = leads.filter((l) => l.status !== 'new' && l.status !== 'quoted').length;
    const conversion = decided ? Math.round((leads.filter((l) => l.status === 'confirmed' || l.status === 'invoiced').length / decided) * 100) : null;
    return { pipeline, won, byStatus, conversion };
  }, [leads, quotes]);

  const maxCount = Math.max(1, ...stats.byStatus.map((s) => s.count));
  const empty = leads.length === 0 && quotes.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={agency.name}
        title={`${greeting()}.`}
        description="Your travel desk at a glance: enquiries in, quotes out, and the APIs doing the work."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/app/enquiries">
                <ChatsCircle /> New enquiry
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app/quotes/new">
                <FilePlus /> New quote
              </Link>
            </Button>
          </>
        }
      />
      <DemoModeNotice />

      {empty && (
        <Card className="mb-8 overflow-hidden border-primary/30 bg-gradient-to-br from-accent to-card">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
            <div>
              <h2 className="font-display text-2xl font-semibold">Start with a real-looking pipeline</h2>
              <p className="mt-2 text-muted-foreground">
                Load three sample enquiries, or paste your own. Then build a quote, download the PDFs and watch every API call in the console.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={loadSampleData}>
                  <Database /> Load sample leads
                </Button>
                <Button asChild variant="outline">
                  <Link to="/app/enquiries">
                    <PlusCircle /> Paste an enquiry
                  </Link>
                </Button>
              </div>
            </div>
            <ol className="space-y-2.5 text-sm">
              {['Parse an enquiry into a lead', 'Stream a day-wise itinerary', 'Price it with GST and live FX', 'Download quotation, voucher & invoice', 'Inspect the calls in the API Console'].map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open enquiries" value={String(leads.filter((l) => l.status === 'new').length)} hint={`${leads.length} total`} delay={0} />
        <StatTile label="Quotes" value={String(quotes.length)} hint={`${quotes.filter((q) => q.status === 'draft').length} drafts`} delay={0.05} />
        <StatTile label="Open pipeline" value={stats.pipeline ? `₹${compact(stats.pipeline)}` : '₹0'} hint="Draft + sent quotes, incl. GST" delay={0.1} />
        <StatTile label="Won revenue" value={stats.won ? `₹${compact(stats.won)}` : '₹0'} hint={stats.conversion !== null ? `${stats.conversion}% of decided leads won` : 'No decided leads yet'} delay={0.15} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Enquiries by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3" aria-label="Number of enquiries in each stage">
              {stats.byStatus.map((s, i) => {
                const meta = leadStatusMeta[s.status];
                return (
                  <li key={s.status} className="grid grid-cols-[110px_1fr_32px] items-center gap-3" title={`${meta.label}: ${s.count}`}>
                    <span className="flex items-center gap-2 text-sm">
                      <meta.icon size={15} weight="fill" className="text-muted-foreground" />
                      {meta.label}
                    </span>
                    <div className="h-5 rounded-r-[4px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.count / maxCount) * 100}%` }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className={cn('h-full rounded-r-[4px]', s.count ? 'bg-primary' : 'bg-transparent')}
                      />
                    </div>
                    <span className="text-right text-sm font-medium tabular-nums">{s.count}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent enquiries</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/enquiries">
                All <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No enquiries yet.</p>
            ) : (
              <ul className="divide-y">
                {leads.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm font-semibold">
                      {(l.customerName ?? l.destination ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {l.customerName ?? 'Unknown customer'} · {l.destination ?? 'destination TBC'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{l.summary}</p>
                    </div>
                    <div className="hidden flex-col items-end gap-1 sm:flex">
                      <StatusBadge status={l.status} />
                      <span className="text-[11px] text-muted-foreground">{relativeTime(l.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent quotes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/quotes">
                All <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No quotes yet. Convert an enquiry or start a blank one.</p>
            ) : (
              <ul className="divide-y">
                {quotes.slice(0, 5).map((q) => (
                  <li key={q.id}>
                    <Link to={`/app/quotes/${q.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                      <span className="font-mono text-xs text-muted-foreground">{q.number}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {q.client.name || 'Unnamed client'} · {q.trip.destination}
                      </span>
                      <span className="text-sm tabular-nums">{money(computeTotals(q.pricing, q.trip.adults + q.trip.children).total)}</span>
                      <StatusBadge status={q.status} kind="quote" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Integrations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/api">
                <TerminalWindow /> Console
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {(integrations.data?.data.integrations ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  {i.stats?.errors ? (
                    <span className="size-2 rounded-full bg-warning" />
                  ) : (
                    <CheckCircle size={16} weight="fill" className={i.stats ? 'text-success' : 'text-muted-foreground/40'} />
                  )}
                  <span className="font-medium">{i.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {i.stats ? `${i.stats.calls} calls${i.stats.avgMs ? ` · ${i.stats.avgMs} ms` : ''}` : i.id === 'llm' && integrations.data?.data.demoMode ? 'demo mode' : 'idle'}
                  </span>
                </li>
              ))}
              {integrations.isError && <li className="text-sm text-destructive">API unreachable. Is the server running?</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
