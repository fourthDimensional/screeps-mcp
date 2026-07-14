import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clearBuffer, getBuffer, getLatestCursor, pushLogs } from '../src/websocket/buffer.js';

describe('console cursor buffer', () => {
  afterEach(() => clearBuffer());

  it('returns the high-water cursor rather than the oldest retained record', () => {
    pushLogs(['historic error', 'newer error']);

    assert.equal(getLatestCursor(), 2);
  });

  it('reads a bounded cursor window for deployment correlation', () => {
    pushLogs(['before', 'during', 'after']);

    const buffer = getBuffer({ afterCursor: 1, beforeCursor: 2 });

    assert.deepEqual(buffer.logs, ['during']);
    assert.equal(buffer.nextCursor, 2);
  });
});
