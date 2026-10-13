import { Router } from 'express';
import { config, demoMode } from '../config.js';
import { ok, openSse, validate } from '../lib/http.js';
import { responseMeta } from '../lib/trace.js';
import { createObjectStreamParser } from '../lib/jsonStream.js';
import { AppError } from '../lib/errors.js';
import { chatJson, chatStream } from '../providers/llm.js';
import { AiHotel, AiLead, AiMessage, ComposeRequest, EnquiryRequest, HotelSearchRequest, ItineraryDay, ItineraryRequest, ItinerarySummary } from '../ai/schemas.js';
import { HOTELS_SYSTEM, ITINERARY_SYSTEM, composeSystem, enquirySystem, hotelsUser, itineraryUser } from '../ai/prompts.js';
import { demoCompose, demoEnquiry, demoHotels, demoItineraryStream } from '../ai/demo.js';

export const aiRouter = Router();

const source = () => (demoMode ? 'demo' : config.llm.model);

/**
 * POST /api/ai/hotels
 * LLM-generated sample hotel inventory (the original feature of this project),
 * now with filters, pagination without duplicates, and schema validation.
 */
aiRouter.post('/hotels', validate(HotelSearchRequest), async (req, res) => {
  const input = req.valid;
  let raw;
  if (demoMode) {
    raw = demoHotels(input);
  } else {
    const out = await chatJson({ label: 'Hotel inventory', system: HOTELS_SYSTEM, user: hotelsUser(input), temperature: 0.7, maxTokens: 6000 });
    raw = Array.isArray(out) ? out : out.hotels ?? [];
  }

  const hotels = [];
  let rejected = 0;
  for (const item of raw) {
    const parsed = AiHotel.safeParse(item);
    if (parsed.success) hotels.push({ ...parsed.data, id: `${input.city}-${input.page}-${hotels.length}`.toLowerCase().replace(/\s+/g, '-') });
    else rejected++;
  }
  if (!hotels.length) throw new AppError(502, 'EMPTY_RESULT', 'The model did not return any usable hotels — try again or relax the filters');

  ok(res, { city: input.city, page: input.page, hotels, rejected, source: source() });
});

/**
 * POST /api/ai/enquiry
 * Turn a raw customer message into a structured CRM lead.
 */
aiRouter.post('/enquiry', validate(EnquiryRequest), async (req, res) => {
  const { text } = req.valid;
  const today = req.valid.today ?? new Date().toISOString().slice(0, 10);

  const raw = demoMode
    ? demoEnquiry(text, today)
    : await chatJson({ label: 'Enquiry extraction', system: enquirySystem(today), user: text, temperature: 0, maxTokens: 1500 });

  const parsed = AiLead.safeParse(raw);
  if (!parsed.success) throw new AppError(502, 'BAD_EXTRACTION', 'Could not structure this enquiry — try adding more detail');
  ok(res, { lead: parsed.data, source: source() });
});

/**
 * POST /api/ai/itinerary  (Server-Sent Events)
 * Streams a day-wise itinerary. The model writes JSON Lines; we parse complete
 * objects out of the token stream, validate each one, and forward them as
 * `day` / `summary` events so the UI can render days as they are written.
 */
aiRouter.post('/itinerary', validate(ItineraryRequest), async (req, res) => {
  const input = req.valid;
  const sse = openSse(req, res);
  sse.send('start', { destination: input.destination, days: input.nights + 1, source: source(), requestId: req.ctx.requestId });

  let days = 0;
  let invalid = 0;
  let summary = false;
  const parser = createObjectStreamParser(
    (obj) => {
      if (obj?.type === 'day') {
        const day = ItineraryDay.safeParse(obj);
        if (day.success) {
          days++;
          sse.send('day', day.data);
        } else invalid++;
      } else if (obj?.type === 'summary') {
        const s = ItinerarySummary.safeParse(obj);
        if (s.success) {
          summary = true;
          sse.send('summary', s.data);
        } else invalid++;
      }
    },
    () => invalid++,
  );

  try {
    const stream = demoMode
      ? demoItineraryStream(input)
      : chatStream({ label: 'Itinerary stream', system: ITINERARY_SYSTEM, user: itineraryUser(input), temperature: 0.6, maxTokens: 8000 });

    for await (const delta of stream) {
      if (sse.closed) break; // client navigated away — stop paying for tokens
      sse.send('token', { t: delta });
      parser.push(delta);
    }
    sse.send('done', { days, summary, invalid, meta: responseMeta() });
  } catch (err) {
    sse.send('error', { code: err.code ?? 'STREAM_FAILED', message: err.status ? err.message : 'The itinerary stream failed', meta: responseMeta() });
  } finally {
    sse.end();
  }
});

/**
 * POST /api/ai/compose
 * Draft client communication (quote email, WhatsApp follow-up, reminders).
 */
aiRouter.post('/compose', validate(ComposeRequest), async (req, res) => {
  const input = req.valid;
  const raw = demoMode
    ? demoCompose(input)
    : await chatJson({
        label: 'Compose message',
        system: composeSystem(input),
        user: `Context (JSON):\n${JSON.stringify(input.context, null, 2)}`,
        temperature: 0.7,
        maxTokens: 1200,
      });

  const parsed = AiMessage.safeParse(raw);
  if (!parsed.success) throw new AppError(502, 'BAD_MESSAGE', 'The model returned an empty message — please retry');
  ok(res, { ...parsed.data, kind: input.kind, source: source() });
});
