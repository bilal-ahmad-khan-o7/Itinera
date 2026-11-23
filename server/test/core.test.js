import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObjectStreamParser } from '../src/lib/jsonStream.js';
import { TtlCache } from '../src/lib/cache.js';
import { extractJson } from '../src/providers/llm.js';
import { demoEnquiry } from '../src/ai/demo.js';
import { AiHotel, AiLead, ItineraryDay } from '../src/ai/schemas.js';
import { currencyFor, flagEmoji } from '../src/data/countries.js';

test('stream parser emits objects split across arbitrary chunk boundaries', () => {
  const seen = [];
  const parser = createObjectStreamParser((o) => seen.push(o));
  const text = '{"type":"day","day":1,"title":"Arrive {early}"}\n{"type":"day","day":2,"title":"Say \\"hi\\""}\n';
  for (let i = 0; i < text.length; i += 3) parser.push(text.slice(i, i + 3));
  assert.deepEqual(
    seen.map((o) => o.title),
    ['Arrive {early}', 'Say "hi"'],
  );
});

test('stream parser tolerates code fences, prose and pretty-printed JSON', () => {
  const seen = [];
  const invalid = [];
  const parser = createObjectStreamParser((o) => seen.push(o), (raw) => invalid.push(raw));
  parser.push('Here you go:\n```json\n{\n  "type": "day",\n  "day": 1\n}\n```\nand {"type":"summary"}');
  assert.equal(seen.length, 2);
  assert.equal(seen[1].type, 'summary');
  assert.equal(invalid.length, 0);
});

test('extractJson salvages an object wrapped in text', () => {
  assert.deepEqual(extractJson('Sure! {"hotels":[{"name":"A"}]} Hope this helps.'), { hotels: [{ name: 'A' }] });
  assert.equal(extractJson('no json here'), null);
});

test('TTL cache expires entries and evicts least recently used', async () => {
  const c = new TtlCache(2);
  c.set('a', 1, 1000);
  c.set('b', 2, 1000);
  c.get('a'); // a is now most recent
  c.set('c', 3, 1000); // evicts b
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 1);
  c.set('d', 4, 5);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(c.get('d'), undefined);
});

test('demo enquiry parser extracts the essentials', () => {
  const lead = demoEnquiry('Hi, I am Rahul Sharma. Honeymoon to Bali for 6 nights from 12 Dec, budget 1.5 lakh. rahul@example.com +91 98765 43210', '2026-10-13');
  assert.equal(lead.customerName, 'Rahul Sharma');
  assert.equal(lead.destination, 'Bali');
  assert.equal(lead.nights, 6);
  assert.equal(lead.budget, 150000);
  assert.equal(lead.startDate, '2026-12-12');
  assert.equal(lead.tripType, 'honeymoon');
  assert.ok(AiLead.safeParse(lead).success);
});

test('schemas coerce loose model output and reject unusable items', () => {
  const ok = AiHotel.safeParse({ name: 'Test Hotel', pricePerNight: '4500', starCategory: '4', rating: 'great', amenities: 'pool' });
  assert.ok(ok.success);
  assert.equal(ok.data.pricePerNight, 4500);
  assert.equal(ok.data.rating, 4); // .catch fallback
  assert.deepEqual(ok.data.amenities, []);
  assert.equal(AiHotel.safeParse({ name: 'No price' }).success, false);

  const day = ItineraryDay.safeParse({ type: 'day', day: '2', title: 'Forts', items: [{ title: 'Amber Fort', kind: 'spaceship' }, { nope: true }] });
  assert.ok(day.success);
  assert.equal(day.data.items.length, 1);
  assert.equal(day.data.items[0].kind, 'activity');
});

test('country helpers', () => {
  assert.equal(currencyFor('th'), 'THB');
  assert.equal(currencyFor('ZZ'), null);
  assert.equal(flagEmoji('IN'), '🇮🇳');
});
