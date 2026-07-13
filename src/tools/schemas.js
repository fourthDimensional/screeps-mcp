import { SCREEPS_BRANCH } from '../config.js';

const object = (name, description, properties = {}, required = []) => ({
  name,
  description,
  inputSchema: { type: 'object', properties, ...(required.length ? { required } : {}) },
});
const string = (description, extra = {}) => ({ type: 'string', description, ...extra });
const branch = string('Target code branch.', { default: SCREEPS_BRANCH });
const roomName = string('Screeps room name, e.g. W1N1.');

export const tools = [
  object('get_policy', 'Read safety policy and currently approved operations. Safety: read-only.'),
  object('get_audit_log', 'Read append-only audited operations.', {
    limit: { type: 'integer', minimum: 1, maximum: 500 },
  }),
  object(
    'get_deployment',
    'Read one deployment record.',
    { deploymentId: string('Deployment ID.') },
    ['deploymentId']
  ),
  object('list_deployments', 'List recent deployment records.', {
    limit: { type: 'integer', minimum: 1, maximum: 500 },
  }),
  object('list_branches', 'List remotely available code branches. Freshness: request-time.'),
  object('get_active_branch', 'Read the active code branch. Freshness: request-time.'),
  object('list_code_modules', 'List module names on a branch.', { branch }),
  object('get_code_modules', 'Read complete code modules from a branch.', { branch }, ['branch']),
  object(
    'validate_modules',
    'Validate a complete module manifest without a network write.',
    { manifest: { type: 'object' } },
    ['manifest']
  ),
  object(
    'upload_modules',
    'Upload a validated, complete module manifest. Safety: code write.',
    { manifest: { type: 'object' }, branch },
    ['manifest']
  ),
  object(
    'upload_code',
    'Compatibility wrapper that uploads one main module from a local path. Safety: code write.',
    { mainJsPath: string('Local main.js path.'), branch },
    ['mainJsPath']
  ),
  object(
    'activate_branch',
    'Activate a code branch. Safety: production approval required by default.',
    { branch },
    ['branch']
  ),
  object(
    'rollback_deployment',
    'Activate only a deployment’s recorded rollback target. Safety: policy-gated.',
    { deploymentId: string('Deployment ID.') },
    ['deploymentId']
  ),
  object(
    'deploy_and_verify',
    'Validate, upload, record, and observe a deployment without implicitly activating it.',
    {
      manifest: { type: 'object' },
      branch,
      shard: string('Target shard.', { default: 'shard0' }),
      verificationTicks: { type: 'integer', minimum: 1, maximum: 30, default: 5 },
    },
    ['manifest']
  ),
  object(
    'get_console',
    'Read console records using cursors; raw console is an advanced observation.',
    {
      afterCursor: { type: 'integer', minimum: 0, default: 0 },
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
      levels: { type: 'array', items: { type: 'string' } },
      clearBuffer: { type: 'boolean', default: false },
    }
  ),
  object(
    'execute_command',
    'Issue raw JavaScript in the Screeps console. Safety: advanced and audited.',
    { command: string('JavaScript console expression.') },
    ['command']
  ),
  object('get_memory', 'Read bot Memory; advanced recovery surface.', {
    path: string('Optional dot-separated Memory path.', { default: '' }),
  }),
  object(
    'set_memory',
    'Write bot Memory. Safety: policy-gated and audited.',
    { path: string('Dot-separated Memory path.'), value: string('JSON-encoded value.') },
    ['path', 'value']
  ),
  object(
    'get_room_terrain',
    'Read terrain for a room.',
    {
      roomName,
      encoded: { type: 'boolean', default: false },
      shard: string('Shard.', { default: 'shard0' }),
    },
    ['roomName']
  ),
  object(
    'get_room_status',
    'Read ownership and reservation status.',
    { roomName, shard: string('Shard.', { default: 'shard0' }) },
    ['roomName']
  ),
  object('get_user_info', 'Read current account information.'),
  object('get_game_time', 'Read current tick.', { shard: string('Shard.', { default: 'shard0' }) }),
  object(
    'run_probe',
    'Run a named, tick-correlated structured probe.',
    {
      name: string('performance, room_objects, or empire_snapshot.'),
      parameters: { type: 'object', default: {} },
      timeoutTicks: { type: 'integer', minimum: 1, maximum: 30, default: 5 },
    },
    ['name']
  ),
  object('get_empire_snapshot', 'Get a compact, tick-correlated empire health snapshot.'),
  object(
    'get_room_snapshot',
    'Get a bounded room snapshot.',
    {
      roomName,
      detail: string('summary, economy, structures, creeps, threats, or planning.', {
        default: 'summary',
      }),
    },
    ['roomName']
  ),
  object('get_room_objects', 'Compatibility alias for the room_objects probe.', { roomName }, [
    'roomName',
  ]),
  object('analyze_performance', 'Compatibility alias for the performance probe.'),
  object('get_telemetry', 'Read optional versioned Memory.telemetry; absent is not zero.'),
  object('record_snapshot', 'Persist a tagged snapshot in the local metrics store.', {
    deploymentId: string('Optional deployment ID.'),
  }),
  object('get_metrics', 'Read local normalized metric records.', {
    deploymentId: string('Optional deployment ID.'),
    limit: { type: 'integer', minimum: 1, maximum: 1000 },
  }),
  object(
    'compare_deployments',
    'Compare deployment and baseline metric windows.',
    {
      deploymentId: string('Deployment ID.'),
      baselineDeploymentId: string('Baseline deployment ID.'),
    },
    ['deploymentId', 'baselineDeploymentId']
  ),
  object('evaluate_health', 'Evaluate heartbeat, probes, errors, and sample sufficiency.', {
    deploymentId: string('Optional deployment ID.'),
    baselineDeploymentId: string('Optional baseline ID.'),
  }),
  object('check_for_errors', 'Classify recent console errors.'),
  object('troubleshoot_bot', 'Run a compatibility diagnostic summary.'),
];
