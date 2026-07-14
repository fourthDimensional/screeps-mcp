import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../../src/tools/schemas.js';
import { SCREEPS_SHARD } from '../../src/config.js';

const REQUIRED_HARNESS_TOOLS = [
  'get_policy',
  'get_audit_log',
  'validate_modules',
  'upload_modules',
  'deploy_and_verify',
  'rollback_deployment',
  'run_probe',
  'get_empire_snapshot',
  'get_room_snapshot',
  'get_telemetry',
  'record_snapshot',
  'compare_deployments',
  'evaluate_health',
];

describe('tool schemas', () => {
  it('exposes the core closed-loop harness tools and legacy compatibility tools', () => {
    const names = tools.map((tool) => tool.name);
    for (const name of REQUIRED_HARNESS_TOOLS)
      assert.ok(names.includes(name), `${name} should exist`);
    assert.ok(names.includes('upload_code'));
    assert.ok(names.includes('get_room_objects'));
  });

  it('marks required parameters on tools that need them', () => {
    const requiredParams = {
      upload_code: ['mainJsPath'],
      execute_command: ['command'],
      set_memory: ['path', 'value'],
      get_room_terrain: ['roomName'],
      get_room_status: ['roomName'],
      get_room_objects: ['roomName'],
      screeps_search: ['query'],
      screeps_read_section: ['id'],
      screeps_read_page: ['id'],
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

    assert.equal(roomTerrain.inputSchema.properties.shard.default, SCREEPS_SHARD);
    assert.equal(roomStatus.inputSchema.properties.shard.default, SCREEPS_SHARD);
    assert.equal(gameTime.inputSchema.properties.shard.default, SCREEPS_SHARD);
  });
});
