# Roadmap & presentation guide

Itinera is built around the same problem DeBox Global solves for travel businesses with **TravCRM**: moving an enquiry through *query → quotation → voucher → invoice*. Each idea below extends that workflow, or reuses its integration layer for one of the company's other product lines (Sales CRM, loyalty programmes, mobile apps, e-commerce). Every idea comes with the API-integration skill it demonstrates.

---

## 1. What v2 already demonstrates

| Capability | Integration skill on show |
|---|---|
| Enquiry → structured lead | LLM JSON mode, prompt design, schema validation of model output |
| Streamed itinerary | Consuming provider SSE, incremental JSON parsing, re-emitting typed SSE, cancellation |
| Destination intel | Fan-out/fan-in with `Promise.allSettled`, partial failure, caching |
| Geocoding & hotels | Primary/fallback providers, rate-limit politeness queue |
| Quote pricing | Live FX conversion, Indian GST rules (CGST/SGST vs IGST, SAC 998555) |
| Documents | Client-side PDF/Excel generation |
| API Console | Request tracing, health checks, live log streaming, API playground |
| Deployment | 12-factor config, health checks, single-service Railway deploy, demo mode |

---

## 2. Next integrations, mapped to DeBox product lines

### Travel CRM (TravCRM-style)

1. **Real supplier inventory: Amadeus for Developers (free test environment)**
   - Hotel List + Hotel Search (offers and prices), Flight Offers Search, Airport & City Search.
   - *Skill:* OAuth2 client-credentials flow, token caching and refresh, pagination, mapping a supplier schema onto our own `Hotel` type.
   - Swap the "AI sample" tab for live rates, keeping the LLM for descriptions only.
2. **Payments: Razorpay Payment Links (test mode)**
   - "Collect 25% advance" on a quote creates a payment link; a **webhook** marks the invoice paid.
   - *Skill:* webhook signature verification (HMAC), idempotency keys, a payment state machine.
3. **WhatsApp Cloud API (Meta) or a BSP such as Gupshup**
   - Inbound messages arrive via webhook and become leads automatically through `/api/ai/enquiry`; quotes go out as a PDF document message.
   - *Skill:* webhook verification handshake, message templates, media upload.
4. **Transactional email: Resend or SendGrid**
   - Send the drafted quote email with the PDF attached, and track opens.
   - *Skill:* server-side PDF generation (move jsPDF to the server or use pdfkit), attachments, delivery webhooks.
5. **GSTIN validation for B2B agents**
   - Validate checksum locally, then look up the legal name via a GST verification API before invoicing.
   - *Skill:* layered validation and third-party KYC APIs.
6. **Maps & routing: Leaflet + OSM tiles, OSRM or OpenRouteService**
   - Show the itinerary on a map and compute drive times between day-items so the LLM's plan can be checked for feasibility.
   - *Skill:* using one API's output to validate another's (LLM vs routing engine).

### Sales CRM

7. **Persistence & multi-user: Postgres on Railway (Drizzle or Prisma) + authentication**
   - Agents, roles (sales, operations, accounts), lead assignment and an activity timeline.
   - *Skill:* migrations, transactions, row-level ownership, session/JWT auth.
8. **Scheduled reports**
   - A daily query summary and pending-payments report emailed every morning (TravCRM ships these reports), using a Railway cron service.
   - *Skill:* background jobs, idempotent schedulers, report generation.

### Loyalty (Praemia Rewards-style)

9. **Points ledger**
   - Earn points on invoiced bookings, redeem them as a discount line on the next quote, with a tier badge in the client profile.
   - *Skill:* double-entry style ledger, idempotent award events triggered by the payment webhook.

### Mobile apps

10. **Expo / React Native companion app**
    - Field agents capture enquiries by voice (speech-to-text, e.g. Groq Whisper) and get the same streamed itinerary.
    - *Skill:* reusing one API across web and mobile, audio upload, streaming on mobile.

### AI depth

11. **Tool-calling itinerary agent**: let the model call our own `/destination`, `/fx` and `/hotels/real` endpoints, so plans are grounded in live weather and real hotels.
12. **Retrieval over the agency's own packages**: embed past quotes and package PDFs; suggest similar trips for a new enquiry.
13. **Evaluation harness**: a fixed set of enquiries with expected fields; score extraction accuracy per model and prompt version and track it in CI.

### Engineering quality

14. **Contract tests with recorded fixtures** (MSW/nock), **Playwright e2e** of the enquiry → invoice flow, and **GitHub Actions** for test + typecheck + build on every PR.
15. **Observability**: structured logs (pino), OpenTelemetry traces exported to a collector, and Sentry for client errors.
16. **Redis** (a Railway plugin) for cache and rate-limit state, so the API can scale past one replica.

---

## 3. Suggested phasing

| Phase | Scope | Outcome to demo |
|---|---|---|
| 1 | v2 as delivered | Enquiry → quote → PDFs, API Console |
| 2 | Postgres + auth, Razorpay test links + webhook | Real persistence, payment closes the loop |
| 3 | Amadeus hotels/flights, Resend email | Live supplier rates, quote emailed with PDF |
| 4 | WhatsApp intake, scheduled reports, loyalty | Omnichannel CRM with retention |
| 5 | Tests in CI, observability, mobile companion | Production-readiness story |

---

## 4. Live demo script (about 7 minutes)

1. **Landing page (45 s):** the hero walkthrough and the integration diagram. Hover a provider to explain its role.
2. **Enquiries (1 min):** click *Email · Kerala family*, then *Extract lead*. Point out the resolved date, the "1.5 lakh" → 150000 conversion and the *missing info* list. Open the trace chip.
3. **Quote builder (2 min):** *Save & build quote*. Destination intel loads (open its trace: four providers, geocoding first and the rest in parallel). *Generate itinerary*, then toggle **Show raw stream** to show JSON Lines arriving while validated day cards appear.
4. **Costing (1 min):** switch to B2B (markup changes), change the client's state (CGST/SGST becomes IGST), and switch currency to USD (live ECB rate).
5. **Documents (1 min):** download the quotation, then *Confirm & issue voucher*, then *Issue GST invoice*. Show the amount in words and SAC code.
6. **API Console (1 min):** run the live health check. Open *Live traffic* in a second tab and trigger a search to show calls streaming in. In the *Playground*, send the invalid request to show field-level 400 errors.
7. **Resilience (30 s):** explain the Overpass → Nominatim fallback using a trace where Overpass returned 504.

---

## 5. Report outline (for the updated internship documentation)

1. About DeBox Global IT Solutions and its travel CRM domain
2. Problem statement: manual query handling and quotation effort
3. v1 prototype and its limitations (key exposure, no validation, no streaming)
4. v2 architecture: BFF gateway, data flow diagram, technology choices
5. API integration patterns, one subsection each with code: timeouts/retries, caching, fallback, fan-out, LLM structured output, streaming
6. Business logic: pricing, markup, GST, multi-currency
7. Security: secret management, rate limiting, input/output validation, CSP
8. Testing & deployment on Railway
9. Results: before/after table, response-time traces
10. Learnings and future work (sections 2–3 above)
