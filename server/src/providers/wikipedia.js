import { upstream } from '../lib/upstream.js';
import { UpstreamError } from '../lib/errors.js';

const DAY = 86_400_000;

async function fetchSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return upstream({ provider: 'wikipedia', label: 'Page summary', url, cacheTtlMs: DAY, retries: 0 });
}

/**
 * Wikipedia REST API — a short destination description and a hero image.
 * Falls back to "City, Country" when the bare name is a disambiguation page.
 */
export async function destinationSummary(name, country, originalQuery) {
  const candidates = [...new Set([name, country ? `${name}, ${country}` : null, originalQuery].filter(Boolean))];
  for (const title of candidates) {
    try {
      const page = await fetchSummary(title);
      if (page.type === 'disambiguation') continue;
      return {
        title: page.title,
        description: page.description ?? null,
        extract: page.extract ?? null,
        image: page.originalimage?.source ?? page.thumbnail?.source ?? null,
        thumbnail: page.thumbnail?.source ?? null,
        url: page.content_urls?.desktop?.page ?? null,
      };
    } catch (err) {
      if (err instanceof UpstreamError && err.upstreamStatus === 404) continue;
      throw err;
    }
  }
  return null;
}
