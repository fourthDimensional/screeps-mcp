import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { transport } from '../../src/transport/screeps-transport.js';
import { getMemory } from '../../src/tools/memory.js';

const originalClient = transport.client;

afterEach(() => {
  transport.client = originalClient;
});

describe('getMemory', () => {
  it('decompresses gz-prefixed Memory payloads before parsing JSON', async () => {
    const memory = { telemetry: { version: 1, rooms: { W1N1: { cpu: 2.5 } } } };
    const compressed = gzipSync(JSON.stringify(memory)).toString('base64');
    transport.client = {
      request: async () => ({ data: { data: `gz:${compressed}`, tick: 12345 } }),
    };

    assert.deepEqual(await getMemory(), { data: memory, tick: 12345 });
  });
});
