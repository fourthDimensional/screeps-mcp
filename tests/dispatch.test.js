import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTool } from '../src/tools/dispatch.js';

describe('tool dispatch validation', () => {
  it('rejects room-name injection before any console command is issued', async () => {
    const result = await dispatchTool('get_room_objects', {
      roomName: "W1N1']; Game.notify('oops')//",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'invalid_request');
  });

  it('returns a structured unknown-tool error', async () => {
    const result = await dispatchTool('not_a_tool', {});
    assert.deepEqual(result, {
      ok: false,
      code: 'unknown_tool',
      message: 'Unknown tool: not_a_tool',
    });
  });

  it('validates memory JSON before attempting a mutation', async () => {
    const result = await dispatchTool('set_memory', { path: 'config.mode', value: '{' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'invalid_request');
  });

  it('requires a source path for file-native verified deployments', async () => {
    const result = await dispatchTool('deploy_files_and_verify', {});
    assert.equal(result.ok, false);
    assert.equal(result.code, 'invalid_request');
  });
});
