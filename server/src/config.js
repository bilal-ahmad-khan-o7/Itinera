import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env in development. On Railway, variables are injected directly.
try {
  process.loadEnvFile(path.resolve(here, '../.env'));
} catch {
  /* no .env file — rely on the real environment */
}

const env = process.env;

const llmModel = env.LLM_MODEL || 'openai/gpt-oss-120b';

export const config = {
  port: Number(env.PORT) || 8080,
  isProd: env.NODE_ENV === 'production',
  clientDist: path.resolve(here, '../../client/dist'),
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  aiRateLimitPerMin: Number(env.AI_RATE_LIMIT_PER_MIN) || 20,
  userAgent: `Itinera/2.0 (travel-desk demo${env.CONTACT_EMAIL ? `; ${env.CONTACT_EMAIL}` : ''})`,
  llm: {
    apiKey: env.LLM_API_KEY || env.GROQ_API_KEY || '',
    baseUrl: (env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
    model: llmModel,
    // Reasoning effort is only understood by reasoning models such as gpt-oss.
    reasoningEffort: /gpt-oss|o\d|reason/i.test(llmModel) ? env.LLM_REASONING_EFFORT || 'low' : undefined,
  },
};

export const demoMode = !config.llm.apiKey;
