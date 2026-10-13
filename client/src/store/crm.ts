import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiHotel, ExtractedLead, Lead, LeadStatus, OsmHotel, Quote } from '@/lib/types';

export type ShortlistItem = { kind: 'ai'; city: string; hotel: AiHotel } | { kind: 'osm'; city: string; hotel: OsmHotel };

interface CrmState {
  leads: Lead[];
  quotes: Quote[];
  shortlist: ShortlistItem[];
  counters: { quote: number; voucher: number; invoice: number };

  addLead: (lead: ExtractedLead, rawText: string) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  removeLead: (id: string) => void;

  saveQuote: (quote: Quote) => void;
  removeQuote: (id: string) => void;
  nextNumber: (kind: 'quote' | 'voucher' | 'invoice') => string;

  toggleShortlist: (item: ShortlistItem) => void;
  isShortlisted: (id: string) => boolean;

  loadSampleData: () => void;
  reset: () => void;
}

const PREFIX = { quote: 'QT', voucher: 'VC', invoice: 'INV' } as const;

const SAMPLE_LEADS: Lead[] = [
  {
    id: 'sample-1',
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    status: 'new',
    rawText: 'Hi! Planning our honeymoon to Bali in December for 6 nights, 2 adults, budget around 1.8 lakh. Prefer a pool villa. — Ananya',
    customerName: 'Ananya Verma',
    email: 'ananya.v@example.com',
    phone: null,
    origin: 'Delhi',
    destination: 'Bali',
    startDate: null,
    nights: 6,
    adults: 2,
    children: 0,
    rooms: 1,
    budget: 180000,
    budgetCurrency: 'INR',
    budgetType: 'total',
    hotelCategory: 5,
    tripType: 'honeymoon',
    interests: ['beach', 'spa'],
    specialRequests: 'Pool villa',
    channel: 'whatsapp',
    urgency: 'medium',
    summary: 'Honeymoon in Bali, 6N, 2 adults, ₹1.8L total, pool villa.',
    missingInfo: ['Exact travel dates'],
  },
  {
    id: 'sample-2',
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
    status: 'quoted',
    rawText: 'Family of 4 (2 kids aged 8 and 11) looking at Kerala — Munnar + houseboat, 5 nights from 20 Dec. 4-star. Rohit Mehra, 98100 00000',
    customerName: 'Rohit Mehra',
    email: null,
    phone: '98100 00000',
    origin: null,
    destination: 'Kerala',
    startDate: null,
    nights: 5,
    adults: 2,
    children: 2,
    rooms: 2,
    budget: null,
    budgetCurrency: 'INR',
    budgetType: 'total',
    hotelCategory: 4,
    tripType: 'family',
    interests: ['houseboat', 'hills'],
    specialRequests: null,
    channel: 'phone',
    urgency: 'high',
    summary: 'Family trip to Kerala (Munnar + houseboat), 5N, 2+2, 4-star.',
    missingInfo: ['Budget'],
  },
  {
    id: 'sample-3',
    createdAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    status: 'confirmed',
    rawText: 'Corporate offsite for 18 people in Jaipur, 2 nights, heritage hotel with conference room.',
    customerName: 'Priya Nair',
    email: 'priya.nair@example.com',
    phone: null,
    origin: 'Noida',
    destination: 'Jaipur',
    startDate: null,
    nights: 2,
    adults: 18,
    children: 0,
    rooms: 9,
    budget: 540000,
    budgetCurrency: 'INR',
    budgetType: 'total',
    hotelCategory: 4,
    tripType: 'business',
    interests: ['heritage'],
    specialRequests: 'Conference room',
    channel: 'email',
    urgency: 'medium',
    summary: 'Corporate offsite, Jaipur, 2N, 18 pax, heritage hotel + conference.',
    missingInfo: [],
  },
];

export const useCrm = create<CrmState>()(
  persist(
    (set, get) => ({
      leads: [],
      quotes: [],
      shortlist: [],
      counters: { quote: 0, voucher: 0, invoice: 0 },

      addLead: (extracted, rawText) => {
        const lead: Lead = { ...extracted, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'new', rawText };
        set((s) => ({ leads: [lead, ...s.leads] }));
        return lead;
      },
      updateLead: (id, patch) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setLeadStatus: (id, status) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) })),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      saveQuote: (quote) =>
        set((s) => {
          const exists = s.quotes.some((q) => q.id === quote.id);
          const stamped = { ...quote, updatedAt: new Date().toISOString() };
          return { quotes: exists ? s.quotes.map((q) => (q.id === quote.id ? stamped : q)) : [stamped, ...s.quotes] };
        }),
      removeQuote: (id) => set((s) => ({ quotes: s.quotes.filter((q) => q.id !== id) })),
      nextNumber: (kind) => {
        const n = get().counters[kind] + 1;
        set((s) => ({ counters: { ...s.counters, [kind]: n } }));
        return `${PREFIX[kind]}-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
      },

      toggleShortlist: (item) =>
        set((s) => {
          const exists = s.shortlist.some((x) => x.hotel.id === item.hotel.id);
          return { shortlist: exists ? s.shortlist.filter((x) => x.hotel.id !== item.hotel.id) : [item, ...s.shortlist] };
        }),
      isShortlisted: (id) => get().shortlist.some((x) => x.hotel.id === id),

      loadSampleData: () =>
        set((s) => ({ leads: [...SAMPLE_LEADS.filter((l) => !s.leads.some((x) => x.id === l.id)), ...s.leads] })),
      reset: () => set({ leads: [], quotes: [], shortlist: [], counters: { quote: 0, voucher: 0, invoice: 0 } }),
    }),
    { name: 'itinera-crm', version: 1 },
  ),
);
