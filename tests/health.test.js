import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { consoleEntriesForHealth } from '../src/health.js';
import { consoleCursorForState } from '../src/tools/console.js';

describe('health console evidence', () => {
  it('uses only records after the deployment cursor when available', () => {
    const result = consoleEntriesForHealth(
      {
        source: 'websocket',
        records: [
          { cursor: 4, value: 'fatal old error' },
          { cursor: 5, value: 'fatal new error' },
        ],
      },
      { afterCursor: 4, consoleCursorAvailable: true }
    );

    assert.equal(result.confidence, 'post_deployment');
    assert.deepEqual(result.entries, [{ cursor: 5, value: 'fatal new error' }]);
  });

  it('does not use unbounded HTTP logs for a deployment verdict', () => {
    const result = consoleEntriesForHealth(
      { source: 'http', logs: ['fatal historic error'] },
      { afterCursor: null, consoleCursorAvailable: false }
    );

    assert.equal(result.confidence, 'unavailable');
    assert.deepEqual(result.entries, []);
  });

  it('does not make a disconnected WebSocket cursor available to deployment health', () => {
    assert.equal(consoleCursorForState({ initialized: true, connected: false, cursor: 42 }), null);
  });

  it('downgrades cursor evidence when the socket disconnects during verification', () => {
    const result = consoleEntriesForHealth(
      { source: 'http', logs: ['fatal historic error'] },
      { afterCursor: 42, consoleCursorAvailable: true }
    );

    assert.equal(result.confidence, 'unavailable');
    assert.deepEqual(result.entries, []);
  });
});
