export function ok(data = {}, message = 'OK', extras = {}) {
  return { ok: true, code: 'ok', message, data, ...extras };
}

export function fail(code, message, details, extras = {}) {
  return {
    ok: false,
    code,
    message,
    ...(details === undefined ? {} : { details }),
    ...extras,
  };
}

export class HarnessError extends Error {
  constructor(code, message, details, retryAfterMs) {
    super(message);
    this.name = 'HarnessError';
    this.code = code;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
  }
}

export function errorResult(error) {
  if (error instanceof HarnessError) {
    return fail(error.code, error.message, error.details, {
      ...(error.retryAfterMs ? { retryAfterMs: error.retryAfterMs } : {}),
    });
  }
  return fail('internal_error', error.message || 'Unexpected server error.');
}
