import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { config, demoMode } from './config.js';
import { AppError } from './lib/errors.js';
import { responseMeta, traceMiddleware } from './lib/trace.js';
import { aiRouter } from './routes/ai.js';
import { travelRouter } from './routes/travel.js';
import { metaRouter } from './routes/meta.js';

const app = express();
const startedAt = Date.now();

// Railway (and most PaaS) terminate TLS at a proxy; trust it so req.ip is the real client.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://upload.wikimedia.org', 'https://*.wikimedia.org', 'https://flagcdn.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  compression({
    // Never buffer Server-Sent Events — they must reach the browser immediately.
    filter: (req, res) => !String(res.getHeader('Content-Type') ?? '').includes('text/event-stream') && compression.filter(req, res),
  }),
);
app.use(cors({ origin: config.corsOrigins, exposedHeaders: ['x-request-id', 'ratelimit', 'ratelimit-policy'] }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(config.isProd ? 'combined' : 'dev', { skip: (req) => req.path.endsWith('/logs/stream') }));

const limiter = (limit) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests — please wait a minute and try again' } }),
  });

/* ───────────── API ───────────── */

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), demoMode, model: demoMode ? null : config.llm.model });
});

app.use('/api', traceMiddleware, limiter(120));
app.use('/api/ai', limiter(config.aiRateLimitPerMin), aiRouter);
app.use('/api/meta', metaRouter);
app.use('/api', travelRouter);

app.use('/api', (req) => {
  throw new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`);
});

/* ───────────── Client (single-service deploy) ───────────── */

if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
  app.use('/assets', express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

/* ───────────── Errors ───────────── */

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const known = err instanceof AppError;
  const status = known ? err.status : err.type === 'entity.parse.failed' ? 400 : 500;
  if (!known && status === 500) console.error(`[${req.ctx?.requestId ?? '-'}]`, err);
  res.status(status).json({
    error: {
      code: known ? err.code : status === 400 ? 'BAD_JSON' : 'INTERNAL',
      message: known ? err.message : status === 400 ? 'Request body is not valid JSON' : 'Something went wrong on our side',
      ...(known && err.details ? { details: err.details } : {}),
    },
    meta: responseMeta(req.ctx),
  });
});

const server = app.listen(config.port, () => {
  console.log(`Itinera API listening on :${config.port} ${demoMode ? '(demo mode — no LLM key set)' : `(model: ${config.llm.model})`}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
