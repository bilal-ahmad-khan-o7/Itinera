/**
 * Demo mode: used when no LLM_API_KEY is configured. Produces deterministic,
 * clearly-labelled sample output so the full UI can be demonstrated offline
 * from the LLM. All other (free) APIs are still called for real.
 */

function seeded(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ───────────── Hotels ───────────── */

const NAME_A = ['Amber', 'Lotus', 'Saffron', 'Indigo', 'Banyan', 'Peacock', 'Marigold', 'Sandstone', 'Monsoon', 'Coral', 'Jasmine', 'Teak', 'Cedar', 'Orchid', 'Ivory', 'Copper', 'Haveli', 'Palm', 'Juniper', 'Sapphire'];
const NAME_B = ['Residency', 'Retreat', 'Suites', 'Grand', 'Courtyard', 'Inn', 'Palace', 'House', 'Heights', 'Bay', 'Manor', 'Lodge', 'Sarai', 'Villas', 'Regency'];
const AREAS = ['City Centre', 'Old Town', 'Airport Road', 'Lakeside', 'Station Road', 'Civil Lines', 'Market Quarter', 'Riverside', 'Hill View', 'Business District', 'Heritage Quarter', 'Beach Road'];
const AMENITIES = ['Free Wi-Fi', 'Swimming pool', 'Spa', 'Gym', 'Restaurant', 'Rooftop bar', 'Airport shuttle', 'Parking', 'Room service', 'Kids club', 'Banquet hall', 'Business centre', 'Pet friendly', 'EV charging'];
const ROOMS = ['Standard', 'Deluxe', 'Premium', 'Executive', 'Family Suite', 'Club Room', 'Pool Villa'];
const IDEAL = ['families', 'couples', 'honeymoon', 'business', 'groups', 'solo travellers'];
const BASE_PRICE = { 1: 1400, 2: 2400, 3: 4200, 4: 7800, 5: 15500 };

export function demoHotels({ city, page, count, filters, exclude }) {
  const rand = seeded(`${city.toLowerCase()}|${page}`);
  const excluded = new Set(exclude.map((n) => n.toLowerCase()));
  const hotels = [];
  let guard = 0;

  while (hotels.length < count && guard++ < 400) {
    const stars = filters.stars?.length ? pick(rand, filters.stars) : 2 + Math.floor(rand() * 4);
    const name = `${pick(rand, NAME_A)} ${pick(rand, NAME_B)} ${titleCase(city)}`;
    if (excluded.has(name.toLowerCase()) || hotels.some((h) => h.name === name)) continue;

    const price = Math.round((BASE_PRICE[stars] * (0.75 + rand() * 0.7)) / 50) * 50;
    const rating = Math.min(5, Math.round((3.4 + stars * 0.22 + rand() * 0.5) * 10) / 10);
    const amenities = [...new Set([...(filters.amenities ?? []), ...Array.from({ length: 4 + Math.floor(rand() * 4) }, () => pick(rand, AMENITIES))])];
    const area = filters.area || pick(rand, AREAS);

    const hotel = {
      name,
      area,
      address: `${10 + Math.floor(rand() * 180)}, ${area}, ${titleCase(city)}`,
      starCategory: stars,
      pricePerNight: price,
      rating,
      reviewCount: 120 + Math.floor(rand() * 2400),
      amenities,
      roomTypes: [...new Set([ROOMS[0], pick(rand, ROOMS), pick(rand, ROOMS)])],
      mealPlan: pick(rand, ['EP', 'CP', 'CP', 'MAP', 'AP']),
      availableRooms: Math.floor(rand() * 25),
      distanceFromCenterKm: Math.round(rand() * 120) / 10,
      highlight: `${pick(rand, ['Walking distance to', 'Quiet escape near', 'Great value close to', 'Panoramic views over'])} ${area.toLowerCase()}, ${pick(rand, ['ideal for short stays', 'with an award-winning kitchen', 'loved for its service', 'with spacious rooms'])}.`,
      idealFor: [...new Set([pick(rand, IDEAL), pick(rand, IDEAL)])],
    };

    if (filters.minPrice && hotel.pricePerNight < filters.minPrice) hotel.pricePerNight = filters.minPrice + Math.round(rand() * 2000);
    if (filters.maxPrice && hotel.pricePerNight > filters.maxPrice) hotel.pricePerNight = Math.max(800, filters.maxPrice - Math.round(rand() * 1500));
    if (filters.minRating && hotel.rating < filters.minRating) hotel.rating = Math.min(5, filters.minRating + Math.round(rand() * 3) / 10);
    hotels.push(hotel);
  }
  return hotels;
}

/* ───────────── Enquiry parsing (rule-based stand-in for the LLM) ───────────── */

const KNOWN_DESTINATIONS = ['Goa', 'Kerala', 'Jaipur', 'Udaipur', 'Manali', 'Shimla', 'Leh', 'Ladakh', 'Kashmir', 'Srinagar', 'Andaman', 'Rishikesh', 'Varanasi', 'Agra', 'Darjeeling', 'Sikkim', 'Ooty', 'Coorg', 'Munnar', 'Bali', 'Dubai', 'Thailand', 'Phuket', 'Bangkok', 'Singapore', 'Maldives', 'Sri Lanka', 'Vietnam', 'Paris', 'Switzerland', 'London', 'Bhutan', 'Nepal', 'Mauritius', 'Japan', 'Europe', 'Kedarnath'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseBudget(text) {
  const m = text.match(/(?:₹|rs\.?|inr)?\s*([\d.,]+)\s*(lakh|lac|l\b|k\b|thousand)?/i);
  const lakh = text.match(/([\d.]+)\s*(lakh|lac|l)\b/i);
  if (lakh) return Math.round(Number.parseFloat(lakh[1]) * 100000);
  const k = text.match(/([\d.]+)\s*k\b/i);
  if (k) return Math.round(Number.parseFloat(k[1]) * 1000);
  const rupees = text.match(/(?:₹|rs\.?|inr)\s*([\d,]{4,})/i);
  if (rupees) return Number(rupees[1].replace(/,/g, ''));
  return m && /budget/i.test(text) ? Number(m[1].replace(/,/g, '')) || null : null;
}

function parseDate(text, today) {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
  if (!m) return null;
  const now = new Date(`${today}T00:00:00Z`);
  const month = MONTHS.indexOf(m[2].toLowerCase());
  let year = now.getUTCFullYear();
  if (month < now.getUTCMonth()) year += 1;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
}

export function demoEnquiry(text, today) {
  const lower = text.toLowerCase();
  const destination = KNOWN_DESTINATIONS.find((d) => lower.includes(d.toLowerCase())) ?? null;
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const phone = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)?.[0] ?? null;
  const name = text.match(/\b(?:[Ii] am|I'm|[Tt]his is|[Nn]ame is|[Rr]egards,?|[Tt]hanks,?)\s+([A-Z][a-z]+(?:[ \t][A-Z][a-z]+)?)/)?.[1] ?? null;
  const nightsMatch = lower.match(/(\d+)\s*(?:nights?|n\b)/);
  const daysMatch = lower.match(/(\d+)\s*days?/);
  const nights = nightsMatch ? Number(nightsMatch[1]) : daysMatch ? Math.max(1, Number(daysMatch[1]) - 1) : null;
  const adults = Number(lower.match(/(\d+)\s*(?:adults?|pax|people|persons|of us)/)?.[1]) || (/(couple|honeymoon|wife|husband)/.test(lower) ? 2 : 2);
  const children = Number(lower.match(/(\d+)\s*(?:kids?|child(?:ren)?)/)?.[1]) || 0;
  const hotelCategory = Number(lower.match(/([345])\s*(?:-|\s)?star/)?.[1]) || null;
  const tripType = /honeymoon/.test(lower) ? 'honeymoon' : children || /family|parents/.test(lower) ? 'family' : /trek|adventure|rafting|scuba/.test(lower) ? 'adventure' : /temple|darshan|yatra|pilgrim/.test(lower) ? 'pilgrimage' : /office|team|offsite|conference/.test(lower) ? 'business' : 'leisure';
  const interests = ['beach', 'heritage', 'food', 'nightlife', 'shopping', 'trek', 'wildlife', 'spa', 'scuba', 'temples', 'snow', 'houseboat'].filter((i) => lower.includes(i));
  const channel = /whatsapp|^\[\d|\bwa\b/.test(lower) ? 'whatsapp' : email || /subject:|dear/.test(lower) ? 'email' : /call|spoke/.test(lower) ? 'phone' : 'web';
  const budget = parseBudget(text);
  const startDate = parseDate(text, today);

  const missingInfo = [
    !destination && 'Destination',
    !startDate && 'Travel dates',
    !nights && 'Trip duration',
    !budget && 'Budget',
    !email && !phone && 'Contact details',
    !hotelCategory && 'Preferred hotel category',
  ].filter(Boolean);

  return {
    customerName: name,
    email,
    phone,
    origin: lower.match(/from\s+([a-z]+)/)?.[1] ? titleCase(lower.match(/from\s+([a-z]+)/)[1]) : null,
    destination,
    startDate,
    nights,
    adults,
    children,
    rooms: Math.max(1, Math.ceil(adults / 2)),
    budget,
    budgetCurrency: 'INR',
    budgetType: /per\s*(person|head|pax)/.test(lower) ? 'per_person' : 'total',
    hotelCategory,
    tripType,
    interests,
    specialRequests: lower.match(/(veg(?:etarian)?|jain food|wheelchair|early check-?in|late check-?out|sea view|candle ?light)/)?.[0] ?? null,
    channel,
    urgency: /urgent|asap|immediately|this week/.test(lower) ? 'high' : 'medium',
    summary: `${titleCase(tripType)} enquiry${destination ? ` for ${destination}` : ''}${nights ? `, ${nights}N` : ''}${adults ? `, ${adults} adults` : ''}${children ? ` + ${children} kids` : ''}${budget ? `, budget ₹${budget.toLocaleString('en-IN')}` : ''}.`,
    missingInfo,
  };
}

/* ───────────── Itinerary (simulated stream) ───────────── */

const DAY_THEMES = [
  ['Heritage walk & old quarter', 'sightseeing', 'Guided walk through the historic core with a local expert'],
  ['Signature landmarks tour', 'sightseeing', 'Full-day tour of the destination’s best-known sights with a private car'],
  ['Food trail & markets', 'activity', 'Tasting tour of street food favourites and the main bazaar'],
  ['Nature day trip', 'activity', 'Excursion to a nearby lake, hill or beach with a packed lunch'],
  ['Museums & culture', 'sightseeing', 'Curated visit to the city museum and a craft village'],
  ['Leisure & spa', 'leisure', 'Unhurried morning, afternoon spa session at the hotel'],
  ['Adventure activity', 'activity', 'Half-day outdoor activity suited to the season'],
];

function addDays(iso, n) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function* demoItineraryStream(input) {
  const dest = titleCase(input.destination);
  const totalDays = input.nights + 1;
  const rand = seeded(`${dest}|${input.nights}|${input.tripType}`);
  const lines = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(input.startDate, i);
    if (i === 0) {
      lines.push({ type: 'day', day: 1, date, title: `Arrival in ${dest}`, city: dest, meals: '-', overnight: dest, items: [
        { time: '11:00', title: `Arrive in ${dest}`, detail: 'Meet & greet by our representative, private transfer to the hotel', kind: 'arrival' },
        { time: '14:00', title: 'Hotel check-in', detail: `Check in to your ${input.hotelCategory}-star hotel and freshen up`, kind: 'checkin' },
        { time: '17:30', title: 'Evening orientation walk', detail: 'Easy stroll around the neighbourhood to get your bearings', kind: 'leisure' },
        { time: '20:00', title: 'Welcome dinner', detail: 'Regional cuisine at a well-reviewed local restaurant', kind: 'meal' },
      ] });
    } else if (i === totalDays - 1) {
      lines.push({ type: 'day', day: i + 1, date, title: `Departure from ${dest}`, city: dest, meals: 'B', overnight: '—', items: [
        { time: '08:00', title: 'Breakfast at the hotel', detail: 'Leisurely breakfast and last-minute packing', kind: 'meal' },
        { time: '11:00', title: 'Check-out', detail: 'Settle incidentals and check out', kind: 'checkout' },
        { time: '12:00', title: 'Souvenir stop', detail: 'Quick stop for local handicrafts on the way', kind: 'shopping' },
        { time: '14:00', title: 'Transfer for onward journey', detail: 'Private drop to the airport / railway station', kind: 'departure' },
      ] });
    } else {
      const [title, kind, detail] = DAY_THEMES[(i - 1 + Math.floor(rand() * 3)) % DAY_THEMES.length];
      lines.push({ type: 'day', day: i + 1, date, title: `${title}`, city: dest, meals: 'BD', overnight: dest, items: [
        { time: '08:00', title: 'Breakfast', detail: 'Buffet breakfast at the hotel', kind: 'meal' },
        { time: '09:30', title, detail, kind },
        { time: '13:30', title: 'Lunch break', detail: 'Lunch at a recommended local spot (own expense)', kind: 'meal' },
        { time: '15:30', title: input.interests[0] ? `${titleCase(input.interests[0])} experience` : 'Free afternoon', detail: input.interests[0] ? `Hand-picked ${input.interests[0]} experience matched to your interests` : 'Time at leisure to explore on your own', kind: 'activity' },
        { time: '20:00', title: 'Dinner at hotel', detail: 'Buffet or set-menu dinner', kind: 'meal' },
      ] });
    }
  }

  const perNight = { 2: 2600, 3: 4200, 4: 7800, 5: 15000 }[input.hotelCategory] ?? 6000;
  lines.push({
    type: 'summary',
    headline: `${input.nights}N/${totalDays}D ${titleCase(input.tripType)} escape to ${dest}`,
    bestFor: input.tripType,
    inclusions: [`${input.nights} nights in a ${input.hotelCategory}-star hotel`, 'Daily breakfast and dinners as per itinerary', 'Airport / station transfers in a private AC vehicle', 'Sightseeing by private car with driver', 'All toll, parking and driver allowances'],
    exclusions: ['Flights / train tickets', 'Monument entry fees and camera charges', 'Lunches and personal expenses', 'Travel insurance', 'Anything not mentioned in inclusions'],
    tips: ['Carry a light jacket for evenings', 'Start sightseeing early to avoid crowds', 'Keep small change for local markets'],
    estimate: { hotelPerNight: perNight, transfersTotal: 2500 + input.nights * 1800, sightseeingPerPax: 1200 * Math.max(1, input.nights - 1), mealsPerPaxPerDay: 900 },
  });

  // Emit like a real model would: minified JSON Lines, a few characters at a time.
  for (const line of lines) {
    const text = `${JSON.stringify(line)}\n`;
    for (let i = 0; i < text.length; i += 24) {
      yield text.slice(i, i + 24);
      await sleep(12);
    }
  }
}

/* ───────────── Client messages ───────────── */

export function demoCompose({ kind, agencyName, context }) {
  const name = context.customerName || 'there';
  const dest = context.destination || 'your trip';
  const total = context.total ? `₹${Number(context.total).toLocaleString('en-IN')}` : 'as per the quotation';
  const dates = context.startDate ? ` starting ${context.startDate}` : '';
  const templates = {
    quote_email: {
      subject: `Your ${dest} holiday quotation`,
      body: `Dear ${name},\n\nThank you for choosing ${agencyName}. Please find attached the quotation for your ${context.nights ? `${context.nights}-night ` : ''}${dest} holiday${dates}.\n\nPackage cost: ${total}\nIncludes hotel stay, transfers and sightseeing as listed in the attached itinerary.\n\nTo confirm, simply reply to this email and we will block the rooms right away. Rates are subject to availability at the time of booking.\n\nWarm regards,\n${agencyName}`,
    },
    whatsapp_followup: {
      subject: '',
      body: `Hi ${name} 👋 Just checking if you had a chance to look at the ${dest} quote we shared. Happy to tweak hotels or dates — reply here and we'll update it right away! — ${agencyName}`,
    },
    payment_reminder: {
      subject: `Payment reminder — ${dest} booking`,
      body: `Dear ${name},\n\nThis is a gentle reminder that the payment of ${context.amountDue ? `₹${Number(context.amountDue).toLocaleString('en-IN')}` : total} for your ${dest} booking is due${context.dueDate ? ` on ${context.dueDate}` : ' soon'}.\n\nPlease let us know once the transfer is done so we can share the receipt.\n\nThank you,\n${agencyName}`,
    },
    booking_confirmation: {
      subject: `Booking confirmed — ${dest}${dates}`,
      body: `Dear ${name},\n\nGreat news — your ${dest} trip${dates} is confirmed!\n\nYour hotel and transfer vouchers are attached. Our representative will contact you 24 hours before arrival.\n\nHave a wonderful journey,\n${agencyName}`,
    },
  };
  return templates[kind];
}
