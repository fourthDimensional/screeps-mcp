import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { consoleEntriesFromEvent } from '../src/websocket/manager.js';

describe('WebSocket console event ingestion', () => {
  it('preserves a runtime error emitted outside messages.log/results', () => {
    const runtimeError = `Error: Could not set creep memory\n    at Object.set (<runtime>:24487:23)`;

    assert.deepEqual(consoleEntriesFromEvent({ data: { error: runtimeError } }), {
      logs: [runtimeError],
      results: [],
    });
  });
});
