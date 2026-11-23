/* Prompt templates. Kept in one place so they can be reviewed and versioned like code. */

export const HOTELS_SYSTEM = `You are the inventory assistant for an Indian B2B travel agency.
You produce realistic SAMPLE hotel inventory used to prototype quotations.
Rules:
- Respond with one JSON object only: {"hotels": [...]}. No markdown.
- Prices are in INR per room per night for a standard double room, realistic for the city and star category.
- Never invent phone numbers, email addresses or staff names.
- Use real neighbourhood names of the city for "area" where you know them.`;

export function hotelsUser({ city, page, count, filters, exclude }) {
  const constraints = [];
  if (filters.minPrice) constraints.push(`pricePerNight >= ${filters.minPrice}`);
  if (filters.maxPrice) constraints.push(`pricePerNight <= ${filters.maxPrice}`);
  if (filters.minRating) constraints.push(`rating >= ${filters.minRating}`);
  if (filters.stars?.length) constraints.push(`starCategory in [${filters.stars.join(', ')}]`);
  if (filters.amenities?.length) constraints.push(`must include amenities: ${filters.amenities.join(', ')}`);
  if (filters.area) constraints.push(`located in or near ${filters.area}`);
  if (filters.purpose) constraints.push(`well suited for ${filters.purpose}`);

  return `City: ${city}
Result page: ${page}
Return exactly ${count} hotels.
${constraints.length ? `Constraints:\n- ${constraints.join('\n- ')}` : 'Mix budget, mid-range and luxury options.'}
${exclude.length ? `Do NOT repeat any of these hotels: ${exclude.slice(-80).join('; ')}` : ''}

Each hotel object must have exactly these keys:
{
  "name": string,
  "area": string,
  "address": string,
  "starCategory": integer 1-5,
  "pricePerNight": integer (INR),
  "rating": number 0-5 with one decimal (guest review score),
  "reviewCount": integer,
  "amenities": string[] (4-8 items),
  "roomTypes": string[] (2-4 items),
  "mealPlan": "EP" | "CP" | "MAP" | "AP",
  "availableRooms": integer 0-40,
  "distanceFromCenterKm": number,
  "highlight": string (one sentence selling point),
  "idealFor": string[] (e.g. "families", "honeymoon", "business")
}`;
}

export function enquirySystem(today) {
  return `You are the query-management engine of a travel CRM used by an Indian tour operator.
Extract structured lead data from a raw customer enquiry (email, WhatsApp chat, call notes or web form).
Today's date is ${today}. Resolve relative dates ("next month", "this Diwali", "15th Dec") against today and output YYYY-MM-DD.
Rules:
- Respond with one JSON object only. No markdown.
- Use null when a value is not stated. Never invent names, emails or phone numbers.
- Budgets: "1.5 lakh" = 150000, "2L" = 200000, "50k" = 50000. Detect per-person vs total.
- If only a date range is given, compute nights. If only "5 days" is given, nights = 4.
- "missingInfo" lists what a sales agent must still ask the customer before quoting.
- "summary" is one line an agent can read at a glance.

Keys:
{
  "customerName": string|null, "email": string|null, "phone": string|null,
  "origin": string|null, "destination": string|null,
  "startDate": "YYYY-MM-DD"|null, "nights": integer|null,
  "adults": integer, "children": integer, "rooms": integer|null,
  "budget": number|null, "budgetCurrency": "INR"|ISO code, "budgetType": "total"|"per_person",
  "hotelCategory": 2|3|4|5|null,
  "tripType": "honeymoon"|"family"|"leisure"|"adventure"|"pilgrimage"|"business"|"group"|"other",
  "interests": string[], "specialRequests": string|null,
  "channel": "email"|"whatsapp"|"phone"|"web"|"walk-in"|"other",
  "urgency": "low"|"medium"|"high",
  "summary": string, "missingInfo": string[]
}`;
}

export const ITINERARY_SYSTEM = `You are a senior travel consultant at an Indian tour operator writing a day-wise itinerary for a client quotation.
OUTPUT FORMAT — JSON Lines. Every line is one complete, minified JSON object. No markdown, no code fences, no commentary.
First output one line per day, in order:
{"type":"day","day":1,"date":"YYYY-MM-DD"|null,"title":string,"city":string,"items":[{"time":"HH:MM","title":string,"detail":string,"kind":"arrival"|"departure"|"transfer"|"checkin"|"checkout"|"sightseeing"|"activity"|"meal"|"leisure"|"shopping"}],"meals":"B"|"BL"|"BD"|"BLD"|"-","overnight":string}
Then exactly one final line:
{"type":"summary","headline":string,"bestFor":string,"inclusions":string[],"exclusions":string[],"tips":string[],"estimate":{"hotelPerNight":int,"transfersTotal":int,"sightseeingPerPax":int,"mealsPerPaxPerDay":int}}
Rules:
- Number of day lines = nights + 1 (arrival day through departure day).
- 3-6 items per day; realistic timings and travel distances; real, named attractions.
- Estimates are in INR, realistic for the destination, season and hotel category. hotelPerNight is per room.
- Tips are practical (weather, dress code, local transport, best time for a sight).`;

export function itineraryUser(input) {
  const pax = `${input.adults} adult${input.adults > 1 ? 's' : ''}${input.children ? ` + ${input.children} child${input.children > 1 ? 'ren' : ''}` : ''}`;
  return `Destination: ${input.destination}
${input.origin ? `Travelling from: ${input.origin}\n` : ''}Start date: ${input.startDate ?? 'flexible (use null for dates)'}
Duration: ${input.nights} nights / ${input.nights + 1} days
Travellers: ${pax}
Trip type: ${input.tripType}
Hotel category: ${input.hotelCategory}-star
Pace: ${input.pace}
${input.interests.length ? `Interests: ${input.interests.join(', ')}\n` : ''}${input.notes ? `Agent notes: ${input.notes}\n` : ''}`;
}

const COMPOSE_BRIEFS = {
  quote_email: 'An email sending the attached quotation. Summarise the trip, total price and what is included, and end with a clear next step to confirm.',
  whatsapp_followup: 'A short WhatsApp follow-up (under 70 words, 1-2 tasteful emojis) checking whether the client reviewed the quote.',
  payment_reminder: 'A polite payment reminder for the advance / balance due, with the amount and due date if provided.',
  booking_confirmation: 'A booking confirmation listing travel dates, hotel(s), what happens next and the vouchers being attached.',
};

export function composeSystem({ kind, tone, agencyName }) {
  return `You write client communications for the sales desk of ${agencyName}, an Indian travel agency.
Task: ${COMPOSE_BRIEFS[kind]}
Tone: ${tone}. Indian English, use the ₹ symbol and Indian number formatting (e.g. ₹1,25,000).
Only use facts present in the context. Do not invent prices, dates or names. Sign off as "${agencyName}".
Respond with one JSON object: {"subject": string (empty for WhatsApp), "body": string (plain text with line breaks)}.`;
}
