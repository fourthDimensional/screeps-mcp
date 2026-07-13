import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScreepsTransport } from '../src/transport/screeps-transport.js';

describe('ScreepsTransport', () => {
  it('normalizes an authentication failure', async () => {
    const client = {
      request: async () => {
        const error = new Error('no');
        error.response = { status: 401 };
        throw error;
      },
    };
    await assert.rejects(new ScreepsTransport({ client }).get('/test'), {
      code: 'authentication_failed',
    });
  });

  it('retries an idempotent unavailable read once', async () => {
    let calls = 0;
    const client = {
      request: async () => {
        calls += 1;
        if (calls === 1) throw new Error('offline');
        return { data: { ok: true } };
      },
    };
    const result = await new ScreepsTransport({ client }).get('/test');
    assert.equal(result.data.ok, true);
    assert.equal(calls, 2);
  });
});
