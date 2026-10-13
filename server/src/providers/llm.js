import { config } from '../config.js';
import { upstream, upstreamStream } from '../lib/upstream.js';
import { UpstreamError } from '../lib/errors.js';

/**
 * Client for any OpenAI-compatible Chat Completions API (Groq by default).
 * The API key never leaves the server — the browser only talks to our Express routes.
 */

const PROVIDER = 'llm';

function baseBody({ system, user, temperature, maxTokens }) {
  return {
    model: config.llm.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_completion_tokens: maxTokens,
    ...(config.llm.reasoningEffort ? { reasoning_effort: config.llm.reasoningEffort } : {}),
  };
}

function authHeaders() {
  return { Authorization: `Bearer ${config.llm.apiKey}` };
}

function usageOf(data) {
  const u = data?.usage ?? data?.x_groq?.usage;
  return u ? { tokens: { prompt: u.prompt_tokens, completion: u.completion_tokens, total: u.total_tokens } } : {};
}

/** Pull the first balanced JSON object/array out of a string (models sometimes wrap output in prose). */
export function extractJson(text) {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** One-shot completion in JSON mode. Returns the parsed object. */
export async function chatJson({ system, user, label, temperature = 0.4, maxTokens = 4096 }) {
  const data = await upstream({
    provider: PROVIDER,
    label,
    url: `${config.llm.baseUrl}/chat/completions`,
    method: 'POST',
    headers: authHeaders(),
    body: { ...baseBody({ system, user, temperature, maxTokens }), response_format: { type: 'json_object' } },
    timeoutMs: 60_000,
    retries: 1,
    annotate: usageOf,
  });

  const content = data?.choices?.[0]?.message?.content ?? '';
  try {
    return JSON.parse(content);
  } catch {
    const salvaged = extractJson(content);
    if (salvaged) return salvaged;
    throw new UpstreamError(PROVIDER, 502, 'The model returned malformed JSON — please retry', { preview: content.slice(0, 300) });
  }
}

/**
 * Streaming completion. Parses the provider's Server-Sent Events and yields
 * plain text deltas as they arrive.
 */
export async function* chatStream({ system, user, label, temperature = 0.6, maxTokens = 6000 }) {
  const { res, done } = await upstreamStream({
    provider: PROVIDER,
    label,
    url: `${config.llm.baseUrl}/chat/completions`,
    headers: authHeaders(),
    body: { ...baseBody({ system, user, temperature, maxTokens }), stream: true },
  });

  const decoder = new TextDecoder();
  let buffer = '';
  let usage = {};
  try {
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }
        if (event.error) throw new UpstreamError(PROVIDER, 502, event.error.message ?? 'Stream error');
        const u = usageOf(event);
        if (u.tokens) usage = u;
        const delta = event.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  } finally {
    done(usage);
  }
}
