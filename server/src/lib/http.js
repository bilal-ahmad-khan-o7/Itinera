import { AppError } from './errors.js';
import { responseMeta } from './trace.js';

/** Every JSON response uses the same envelope: { data, meta } or { error, meta }. */
export function ok(res, data, status = 200) {
  res.status(status).json({ data, meta: responseMeta() });
}

/** Validate req.body (or req.query) against a zod schema and replace it with the parsed value. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      throw new AppError(
        400,
        'VALIDATION_FAILED',
        'Some fields are missing or invalid',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    req.valid = result.data;
    next();
  };
}

/** Open a Server-Sent Events response and return a typed `send` helper. */
export function openSse(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'x-request-id': req.ctx?.requestId ?? '',
  });
  res.flushHeaders?.();
  let closed = false;
  res.on('close', () => {
    closed = true;
  });
  return {
    get closed() {
      return closed;
    },
    send(event, data) {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (!closed) res.end();
    },
  };
}
