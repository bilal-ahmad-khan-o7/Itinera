/* Shapes shared between the Express API and the React client. */

export interface UpstreamCall {
  provider: string;
  label?: string;
  method: string;
  url: string;
  status: number | null;
  offsetMs: number | null;
  ms: number;
  ttfbMs?: number;
  cached: boolean;
  attempts: number;
  tokens?: { prompt?: number; completion?: number; total?: number };
  error?: string;
}

export interface ResponseMeta {
  requestId: string;
  durationMs: number;
  upstream: UpstreamCall[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

/* ───────── Destination intelligence ───────── */

export interface Place {
  name: string;
  displayName?: string;
  kind: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number;
  lon: number;
  timezone: string | null;
  population: number | null;
  flag: string | null;
  currency: string | null;
  currencySupported: boolean;
  source: 'nominatim' | 'open-meteo';
  isRegion?: boolean;
}

export interface WeatherDay {
  date: string;
  max: number;
  min: number;
  rainChance: number | null;
  uv: number | null;
  sunrise: string;
  sunset: string;
  code: number;
  label: string;
  icon: WeatherIconKey;
}

export type WeatherIconKey = 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export interface Weather {
  timezone: string;
  current: { temperature: number; feelsLike: number; humidity: number; wind: number; isDay: boolean; code: number; label: string; icon: WeatherIconKey };
  daily: WeatherDay[];
}

export interface WikiSummary {
  title: string;
  description: string | null;
  extract: string | null;
  image: string | null;
  thumbnail: string | null;
  url: string | null;
}

export interface FxRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface DestinationIntel {
  place: Place;
  weather: Weather | null;
  wiki: WikiSummary | null;
  fx: FxRates | null;
  warnings: { source: string; message: string }[];
}

/* ───────── Hotels ───────── */

export interface AiHotel {
  id: string;
  name: string;
  area: string;
  address: string;
  starCategory: number;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  roomTypes: string[];
  mealPlan: 'EP' | 'CP' | 'MAP' | 'AP';
  availableRooms: number;
  distanceFromCenterKm: number;
  highlight: string;
  idealFor: string[];
}

export interface OsmHotel {
  id: string;
  name: string;
  stars: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rooms: number | null;
  brand: string | null;
  amenities: string[];
  lat: number;
  lon: number;
  osmUrl: string;
}

export interface HotelFilters {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  stars?: number[];
  amenities?: string[];
  area?: string;
  purpose?: string;
}

/* ───────── CRM ───────── */

export type LeadStatus = 'new' | 'quoted' | 'confirmed' | 'invoiced' | 'lost';
export type TripType = 'honeymoon' | 'family' | 'leisure' | 'adventure' | 'pilgrimage' | 'business' | 'group' | 'other';

export interface ExtractedLead {
  customerName: string | null;
  email: string | null;
  phone: string | null;
  origin: string | null;
  destination: string | null;
  startDate: string | null;
  nights: number | null;
  adults: number;
  children: number;
  rooms: number | null;
  budget: number | null;
  budgetCurrency: string;
  budgetType: 'total' | 'per_person';
  hotelCategory: number | null;
  tripType: TripType;
  interests: string[];
  specialRequests: string | null;
  channel: 'email' | 'whatsapp' | 'phone' | 'web' | 'walk-in' | 'other';
  urgency: 'low' | 'medium' | 'high';
  summary: string;
  missingInfo: string[];
}

export interface Lead extends ExtractedLead {
  id: string;
  createdAt: string;
  status: LeadStatus;
  rawText: string;
  quoteId?: string;
}

export type ItemKind = 'arrival' | 'departure' | 'transfer' | 'checkin' | 'checkout' | 'sightseeing' | 'activity' | 'meal' | 'leisure' | 'shopping';

export interface ItineraryDay {
  type: 'day';
  day: number;
  date: string | null;
  title: string;
  city: string;
  items: { time: string; title: string; detail: string; kind: ItemKind }[];
  meals: string;
  overnight: string;
}

export interface ItinerarySummary {
  type: 'summary';
  headline: string;
  bestFor: string;
  inclusions: string[];
  exclusions: string[];
  tips: string[];
  estimate: { hotelPerNight: number; transfersTotal: number; sightseeingPerPax: number; mealsPerPaxPerDay: number };
}

export interface PriceLine {
  id: string;
  label: string;
  qty: number;
  unit: string;
  rate: number; // net cost in INR
}

export interface Pricing {
  lines: PriceLine[];
  markupPct: number;
  gstPct: number;
  clientType: 'B2C' | 'B2B';
  supply: 'intra' | 'inter'; // intra-state → CGST + SGST, inter-state → IGST
  currency: string;
  fxRate: number; // 1 INR = fxRate × currency
}

export type QuoteStatus = 'draft' | 'sent' | 'confirmed' | 'invoiced';

export interface Quote {
  id: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  status: QuoteStatus;
  leadId?: string;
  client: { name: string; email: string; phone: string; state: string };
  trip: {
    destination: string;
    origin: string;
    startDate: string;
    nights: number;
    adults: number;
    children: number;
    rooms: number;
    hotelCategory: number;
    tripType: string;
    interests: string[];
    pace: 'relaxed' | 'balanced' | 'packed';
    notes: string;
  };
  hotel?: { name: string; area: string; pricePerNight: number; mealPlan?: string; source: 'ai' | 'osm' | 'manual' };
  itinerary: ItineraryDay[];
  summary?: ItinerarySummary;
  pricing: Pricing;
  heroImage?: string | null;
  voucherNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  auth: string;
  docs: string;
  pattern: string;
  usedFor: string[];
  caching: string;
  stats: { calls: number; errors: number; cacheHits: number; avgMs: number | null; lastStatus: number | null; lastAt: string | null } | null;
}

export interface TraceEntry extends UpstreamCall {
  id: string;
  at: string;
  requestId: string | null;
  route: string | null;
  streamed?: boolean;
}
