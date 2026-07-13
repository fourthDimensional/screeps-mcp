import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../../src/tools/schemas.js';

const EXPECTED_TOOLS = [
  'upload_code',
  'get_console',
  'execute_command',
  'get_memory',
  'set_memory',
  'get_room_terrain',
  'get_room_status',
  'get_user_info',
  'get_game_time',
  'analyze_performance',
  'check_for_errors',
  'troubleshoot_bot',
  'get_room_objects',
];

describe('tool schemas', () => {
  it('exposes all 13 expected tools', () => {
    const names = tools.map((tool) => tool.name);
    assert.deepEqual(names, EXPECTED_TOOLS);
  });

  it('marks required parameters on tools that need them', () => {
    const requiredParams = {
      upload_code: ['mainJsPath'],
      execute_command: ['command'],
      set_memory: ['path', 'value'],
      get_room_terrain: ['roomName'],
      get_room_status: ['roomName'],
      get_room_objects: ['roomName'],
    };

    for (const [toolName, expectedRequired] of Object.entries(requiredParams)) {
      const tool = tools.find((t) => t.name === toolName);
      assert.ok(tool, `Tool ${toolName} should exist`);
      assert.deepEqual(tool.inputSchema.required, expectedRequired);
    }
  });

  it('includes default shards for room and game time tools', () => {
    const roomTerrain = tools.find((t) => t.name === 'get_room_terrain');
    const roomStatus = tools.find((t) => t.name === 'get_room_status');
    const gameTime = tools.find((t) => t.name === 'get_game_time');

    assert.equal(roomTerrain.inputSchema.properties.shard.default, 'shard0');
    assert.equal(roomStatus.inputSchema.properties.shard.default, 'shard0');
    assert.equal(gameTime.inputSchema.properties.shard.default, 'shard0');
  });
});
