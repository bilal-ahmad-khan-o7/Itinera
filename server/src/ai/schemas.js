import { z } from 'zod';

/* ───────────── Request bodies (validated before any API call is made) ───────────── */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const HotelSearchRequest = z.object({
  city: z.string().trim().min(2).max(80),
  page: z.coerce.number().int().min(1).max(20).default(1),
  count: z.coerce.number().int().min(4).max(24).default(12),
  filters: z
    .object({
      minPrice: z.coerce.number().min(0).max(1_000_000),
      maxPrice: z.coerce.number().min(0).max(1_000_000),
      minRating: z.coerce.number().min(0).max(5),
      stars: z.array(z.coerce.number().int().min(1).max(5)).max(5),
      amenities: z.array(z.string().trim().max(40)).max(10),
      area: z.string().trim().max(80),
      purpose: z.string().trim().max(80),
    })
    .partial()
    .default({}),
  exclude: z.array(z.string().max(120)).max(240).default([]),
});

export const EnquiryRequest = z.object({
  text: z.string().trim().min(10, 'Paste at least a sentence of the enquiry').max(6000),
  today: isoDate.optional(),
});

export const ItineraryRequest = z.object({
  destination: z.string().trim().min(2).max(80),
  origin: z.string().trim().max(80).optional(),
  startDate: isoDate.optional(),
  nights: z.coerce.number().int().min(1).max(21),
  adults: z.coerce.number().int().min(1).max(30).default(2),
  children: z.coerce.number().int().min(0).max(10).default(0),
  hotelCategory: z.coerce.number().int().min(2).max(5).default(4),
  tripType: z.string().trim().max(40).default('leisure'),
  interests: z.array(z.string().trim().max(40)).max(10).default([]),
  pace: z.enum(['relaxed', 'balanced', 'packed']).default('balanced'),
  notes: z.string().trim().max(600).optional(),
});

export const ComposeRequest = z.object({
  kind: z.enum(['quote_email', 'whatsapp_followup', 'payment_reminder', 'booking_confirmation']),
  tone: z.enum(['warm', 'formal', 'concise']).default('warm'),
  agencyName: z.string().trim().max(80).default('Itinera Travel Desk'),
  context: z.record(z.string(), z.unknown()).refine((c) => JSON.stringify(c).length < 6000, 'Context too large'),
});

/* ───────────── Model outputs (validated after the LLM responds) ───────────── */

const str = (fallback = '') => z.string().trim().catch(fallback);
const nullableStr = z
  .string()
  .trim()
  .transform((s) => (s === '' || /^(null|n\/a|unknown|none)$/i.test(s) ? null : s))
  .nullable()
  .catch(null);
const strList = z.array(z.string().trim().min(1)).catch([]);

export const AiHotel = z.object({
  name: z.string().trim().min(2),
  area: str(),
  address: str(),
  starCategory: z.coerce.number().int().min(1).max(5).catch(3),
  pricePerNight: z.coerce.number().min(300).max(1_000_000),
  rating: z.coerce.number().min(0).max(5).catch(4),
  reviewCount: z.coerce.number().int().min(0).catch(0),
  amenities: strList,
  roomTypes: strList,
  mealPlan: z.enum(['EP', 'CP', 'MAP', 'AP']).catch('CP'),
  availableRooms: z.coerce.number().int().min(0).max(500).catch(5),
  distanceFromCenterKm: z.coerce.number().min(0).max(200).catch(3),
  highlight: str(),
  idealFor: strList,
});

export const AiLead = z.object({
  customerName: nullableStr,
  email: nullableStr,
  phone: nullableStr,
  origin: nullableStr,
  destination: nullableStr,
  startDate: isoDate.nullable().catch(null),
  nights: z.coerce.number().int().min(1).max(60).nullable().catch(null),
  adults: z.coerce.number().int().min(1).max(60).catch(2),
  children: z.coerce.number().int().min(0).max(30).catch(0),
  rooms: z.coerce.number().int().min(1).max(40).nullable().catch(null),
  budget: z.coerce.number().positive().nullable().catch(null),
  budgetCurrency: z.string().trim().length(3).toUpperCase().catch('INR'),
  budgetType: z.enum(['total', 'per_person']).catch('total'),
  hotelCategory: z.coerce.number().int().min(2).max(5).nullable().catch(null),
  tripType: z.enum(['honeymoon', 'family', 'leisure', 'adventure', 'pilgrimage', 'business', 'group', 'other']).catch('leisure'),
  interests: strList,
  specialRequests: nullableStr,
  channel: z.enum(['email', 'whatsapp', 'phone', 'web', 'walk-in', 'other']).catch('other'),
  urgency: z.enum(['low', 'medium', 'high']).catch('medium'),
  summary: str(),
  missingInfo: strList,
});

const ItineraryItem = z.object({
  time: str(),
  title: z.string().trim().min(1),
  detail: str(),
  kind: z.enum(['arrival', 'departure', 'transfer', 'checkin', 'checkout', 'sightseeing', 'activity', 'meal', 'leisure', 'shopping']).catch('activity'),
});

export const ItineraryDay = z.object({
  type: z.literal('day'),
  day: z.coerce.number().int().min(1),
  date: isoDate.nullable().catch(null),
  title: z.string().trim().min(1),
  city: str(),
  items: z.array(ItineraryItem.catch(null)).transform((a) => a.filter(Boolean)).catch([]),
  meals: str(),
  overnight: str(),
});

const money = z.coerce.number().min(0).max(10_000_000).catch(0);

export const ItinerarySummary = z.object({
  type: z.literal('summary'),
  headline: str(),
  bestFor: str(),
  inclusions: strList,
  exclusions: strList,
  tips: strList,
  estimate: z
    .object({
      hotelPerNight: money,
      transfersTotal: money,
      sightseeingPerPax: money,
      mealsPerPaxPerDay: money,
    })
    .catch({ hotelPerNight: 0, transfersTotal: 0, sightseeingPerPax: 0, mealsPerPaxPerDay: 0 }),
});

export const AiMessage = z.object({
  subject: str(),
  body: z.string().trim().min(1),
});
