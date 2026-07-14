import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clearBuffer, getLatestCursor, pushLogs } from '../src/websocket/buffer.js';

describe('console cursor buffer', () => {
  afterEach(() => clearBuffer());

  it('returns the high-water cursor rather than the oldest retained record', () => {
    pushLogs(['historic error', 'newer error']);

    assert.equal(getLatestCursor(), 2);
  });
});
