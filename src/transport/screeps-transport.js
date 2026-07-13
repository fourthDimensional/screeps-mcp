import axios from 'axios';
import { getAuth, SCREEPS_SERVER } from '../config.js';
import { HarnessError } from '../core/result.js';

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function clientForConfig() {
  const auth = getAuth();
  const headers = { 'Content-Type': 'application/json' };
  if (auth.method === 'token') headers['X-Token'] = auth.token;
  return axios.create({
    baseURL: SCREEPS_SERVER,
    headers,
    ...(auth.method === 'basic'
      ? { auth: { username: auth.username, password: auth.password } }
      : {}),
  });
}

export class ScreepsTransport {
  constructor({
    client,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxResponseBytes = MAX_RESPONSE_BYTES,
  } = {}) {
    this.client = client;
    this.timeoutMs = timeoutMs;
    this.maxResponseBytes = maxResponseBytes;
  }

  async request(method, url, { data, idempotent = false, timeoutMs = this.timeoutMs } = {}) {
    const attempts = idempotent ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await (this.client || (this.client = clientForConfig())).request({
          method,
          url,
          data,
          timeout: timeoutMs,
          maxContentLength: this.maxResponseBytes,
        });
        const size = Buffer.byteLength(JSON.stringify(response.data ?? ''));
        if (size > this.maxResponseBytes) {
          throw new HarnessError(
            'response_too_large',
            'Screeps response exceeded the configured size cap.',
            { size, maxResponseBytes: this.maxResponseBytes }
          );
        }
        return response;
      } catch (error) {
        if (error instanceof HarnessError) throw error;
        const status = error.response?.status;
        if (status === 401 || status === 403)
          throw new HarnessError('authentication_failed', 'Screeps authentication was rejected.', {
            status,
          });
        if (status === 404)
          throw new HarnessError(
            'feature_unavailable',
            'This Screeps server does not provide the requested endpoint.',
            { url, status }
          );
        if (status === 429) {
          const seconds = Number(error.response?.headers?.['retry-after'] || 0);
          throw new HarnessError(
            'rate_limited',
            'Screeps rate limited this request.',
            { url, status },
            seconds * 1000 || undefined
          );
        }
        if (attempt + 1 < attempts && (!status || status >= 500)) continue;
        if (error.code === 'ECONNABORTED')
          throw new HarnessError('timeout', 'Screeps request timed out.', { url, timeoutMs });
        throw new HarnessError('transport_unavailable', 'Unable to reach the Screeps server.', {
          url,
          status,
          cause: error.message,
        });
      }
    }
  }

  get(url, options) {
    return this.request('get', url, { idempotent: true, ...options });
  }
  post(url, data, options) {
    return this.request('post', url, { data, ...options });
  }
}

export const transport = new ScreepsTransport();
