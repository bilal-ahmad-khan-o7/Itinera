import { Link } from 'react-router';
import { motion } from 'motion/react';
import { CalendarBlank, FilePlus, FileText, Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, StatusBadge } from '@/components/app/common';
import { useCrm } from '@/store/crm';
import { computeTotals } from '@/lib/pricing';
import { formatDate, money, paxLabel, relativeTime } from '@/lib/format';

export default function Quotes() {
  const quotes = useCrm((s) => s.quotes);

  return (
    <>
      <PageHeader
        eyebrow="Quotation"
        title="Quotes"
        description="Every quotation, its status and the documents issued from it."
        actions={
          <Button asChild>
            <Link to="/app/quotes/new">
              <FilePlus /> New quote
            </Link>
          </Button>
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          body="Start from an enquiry to pre-fill the client and trip, or create a blank quote."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/app/enquiries">From an enquiry</Link>
              </Button>
              <Button asChild>
                <Link to="/app/quotes/new">Blank quote</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((q, i) => {
            const total = computeTotals(q.pricing, q.trip.adults + q.trip.children).total;
            return (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/app/quotes/${q.id}`} className="block h-full">
                  <Card className="group h-full gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                    <div className="relative h-28 bg-gradient-to-br from-primary/70 to-clay/70">
                      {q.heroImage && <img src={q.heroImage} alt="" className="absolute inset-0 size-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between text-white">
                        <p className="font-display text-xl font-semibold drop-shadow">{q.trip.destination || 'Untitled trip'}</p>
                        <span className="font-mono text-[11px] opacity-80">{q.number}</span>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{q.client.name || 'Unnamed client'}</p>
                        <StatusBadge status={q.status} kind="quote" />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarBlank size={14} /> {formatDate(q.trip.startDate, { day: 'numeric', month: 'short' })} · {q.trip.nights}N
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} /> {paxLabel(q.trip.adults, q.trip.children)}
                        </span>
                      </div>
                      <div className="flex items-end justify-between border-t pt-3">
                        <p className="text-lg font-semibold">{money(total)}</p>
                        <p className="text-xs text-muted-foreground">updated {relativeTime(q.updatedAt)}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
