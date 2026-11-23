/** An error that is safe to show to API consumers. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Raised when a third-party API fails, times out or returns something unusable. */
export class UpstreamError extends AppError {
  constructor(provider, status, message, details) {
    // A broken upstream is a 502 for our callers, except rate limits which we pass through.
    super(status === 429 ? 429 : 502, `UPSTREAM_${provider.toUpperCase()}`, message, details);
    this.provider = provider;
    this.upstreamStatus = status;
  }
}
