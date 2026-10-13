import type { ItinerarySummary, Pricing, PriceLine, Quote } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface Totals {
  net: number;
  markup: number;
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  perPerson: number;
  /** total converted to the quote currency */
  totalFx: number;
  perPersonFx: number;
}

/**
 * Indian tour-operator pricing: net supplier cost → agency markup → taxable value
 * → GST (5% on the package; split CGST/SGST within the agency's state, IGST otherwise).
 */
export function computeTotals(pricing: Pricing, pax: number): Totals {
  const net = pricing.lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const markup = Math.round((net * (pricing.markupPct || 0)) / 100);
  const taxable = net + markup;
  const gst = Math.round((taxable * (pricing.gstPct || 0)) / 100);
  const intra = pricing.supply === 'intra';
  const cgst = intra ? Math.round(gst / 2) : 0;
  const sgst = intra ? gst - cgst : 0;
  const igst = intra ? 0 : gst;
  const total = taxable + gst;
  const perPerson = pax > 0 ? Math.round(total / pax) : total;
  const rate = pricing.currency === 'INR' ? 1 : pricing.fxRate || 1;
  return { net, markup, taxable, gst, cgst, sgst, igst, total, perPerson, totalFx: total * rate, perPersonFx: perPerson * rate };
}

/** Seed editable cost lines from the itinerary's AI estimate. */
export function linesFromEstimate(trip: Quote['trip'], estimate: ItinerarySummary['estimate'] | undefined, hotelRate?: number): PriceLine[] {
  const pax = trip.adults + trip.children;
  const e = estimate ?? { hotelPerNight: 0, transfersTotal: 0, sightseeingPerPax: 0, mealsPerPaxPerDay: 0 };
  return [
    { id: uid(), label: `Hotel accommodation (${trip.rooms} room${trip.rooms > 1 ? 's' : ''} × ${trip.nights} nights)`, qty: trip.rooms * trip.nights, unit: 'room-night', rate: hotelRate || e.hotelPerNight },
    { id: uid(), label: 'Airport / station transfers & intercity cab', qty: 1, unit: 'package', rate: e.transfersTotal },
    { id: uid(), label: 'Sightseeing & activities', qty: pax, unit: 'pax', rate: e.sightseeingPerPax },
    { id: uid(), label: 'Meals as per itinerary', qty: pax * (trip.nights + 1), unit: 'pax-day', rate: e.mealsPerPaxPerDay },
  ].filter((l) => l.rate > 0 || l.label.startsWith('Hotel'));
}

export const DEFAULT_MARKUP = { B2C: 15, B2B: 8 } as const;
