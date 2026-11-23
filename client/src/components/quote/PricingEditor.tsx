import { useQuery } from '@tanstack/react-query';
import { ArrowsClockwise, Plus, Trash } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TracePopover } from '@/components/app/TracePopover';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { uid } from '@/lib/pricing';
import type { FxRates, Pricing } from '@/lib/types';
import { useSettings } from '@/store/settings';

export const QUOTE_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'THB', 'MYR', 'JPY', 'CHF', 'NZD'];

export function PricingEditor({ pricing, onChange, onResetFromAi, canReset }: { pricing: Pricing; onChange: (p: Pricing) => void; onResetFromAi: () => void; canReset: boolean }) {
  const { defaultMarkupB2B, defaultMarkupB2C } = useSettings();
  const set = (patch: Partial<Pricing>) => onChange({ ...pricing, ...patch });

  const fx = useQuery({
    queryKey: ['fx', pricing.currency],
    queryFn: () => api<FxRates & { supported: string[] }>('/fx', { query: { base: 'INR', symbols: pricing.currency } }),
    enabled: pricing.currency !== 'INR',
    staleTime: 60 * 60_000,
  });

  // Keep the stored rate in sync with the live ECB rate for the chosen currency.
  const liveRate = fx.data?.data.rates[pricing.currency];
  useEffect(() => {
    if (pricing.currency === 'INR' && pricing.fxRate !== 1) onChange({ ...pricing, fxRate: 1 });
    else if (liveRate && Math.abs(liveRate - pricing.fxRate) > 1e-9) onChange({ ...pricing, fxRate: liveRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRate, pricing.currency]);

  const updateLine = (id: string, patch: Partial<Pricing['lines'][number]>) => set({ lines: pricing.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] table-fixed text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Cost line (net)</th>
              <th className="w-[72px] px-2 py-2 font-medium">Qty</th>
              <th className="w-[112px] px-2 py-2 font-medium">Rate (₹)</th>
              <th className="w-[104px] px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {pricing.lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1.5">
                  <Input value={l.label} onChange={(e) => updateLine(l.id, { label: e.target.value })} className="h-8 border-transparent shadow-none hover:border-input" aria-label="Line description" />
                </td>
                <td className="px-2 py-1.5">
                  <Input type="number" min={0} value={l.qty} onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })} className="h-8 tabular-nums" aria-label="Quantity" />
                </td>
                <td className="px-2 py-1.5">
                  <Input type="number" min={0} step={100} value={l.rate} onChange={(e) => updateLine(l.id, { rate: Number(e.target.value) })} className="h-8 tabular-nums" aria-label="Rate" />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(l.qty * l.rate)}</td>
                <td className="px-1">
                  <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={() => set({ lines: pricing.lines.filter((x) => x.id !== l.id) })} aria-label="Remove line">
                    <Trash />
                  </Button>
                </td>
              </tr>
            ))}
            {pricing.lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Generate an itinerary to pre-fill cost lines from the AI estimate, or add lines by hand.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => set({ lines: [...pricing.lines, { id: uid(), label: 'New cost line', qty: 1, unit: 'unit', rate: 0 }] })}>
          <Plus /> Add line
        </Button>
        <Button variant="ghost" size="sm" onClick={onResetFromAi} disabled={!canReset}>
          <ArrowsClockwise /> Reset from AI estimate
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="mb-2 block">Client type</Label>
          <ToggleGroup
            type="single"
            value={pricing.clientType}
            onValueChange={(v) => v && set({ clientType: v as Pricing['clientType'], markupPct: v === 'B2B' ? defaultMarkupB2B : defaultMarkupB2C })}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="B2C" className="flex-1">
              B2C
            </ToggleGroupItem>
            <ToggleGroupItem value="B2B" className="flex-1">
              B2B agent
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <Label htmlFor="markup" className="mb-2 block">
            Markup %
          </Label>
          <Input id="markup" type="number" min={0} max={100} value={pricing.markupPct} onChange={(e) => set({ markupPct: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="mb-2 block">Place of supply</Label>
          <Select value={pricing.supply} onValueChange={(v) => set({ supply: v as Pricing['supply'] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intra">Same state · CGST + SGST</SelectItem>
              <SelectItem value="inter">Other state · IGST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Show totals in</Label>
          <Select value={pricing.currency} onValueChange={(v) => set({ currency: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUOTE_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {pricing.currency !== 'INR' && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {fx.isLoading ? 'Fetching ECB rate…' : fx.isError ? <span className="text-destructive">Could not fetch the exchange rate.</span> : fx.data && (
            <>
              <span>
                ₹1 = {pricing.fxRate.toFixed(5)} {pricing.currency} · ECB reference rate of {fx.data.data.date}
              </span>
              <TracePopover meta={fx.data.meta} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
