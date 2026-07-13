import fs from 'node:fs/promises';
import { SCREEPS_BRANCH, SCREEPS_SHARD } from '../config.js';
import { auditStore } from '../audit.js';
import { deploymentStore } from '../deployments.js';
import { evaluateHealth } from '../health.js';
import { compareDeployments, getMetrics, metricsStore } from '../metrics.js';
import {
  activateBranch,
  getCodeModules,
  listBranches,
  listCodeModules,
  uploadModules,
  validateManifest,
} from '../modules.js';
import { checkPolicy, policyForEnvironment } from '../policy.js';
import { getEmpireSnapshot, getRoomSnapshot, runProbe } from '../probes.js';
import { errorResult, fail, HarnessError, ok } from '../core/result.js';
import { validateToolArguments } from '../core/validation.js';
import { getTelemetry } from '../telemetry.js';
import { clearConsoleBuffer, getConsole } from './console.js';
import { executeConsoleCommand } from './execute-command.js';
import { getGameTime } from './game-time.js';
import { getMemory, setMemory } from './memory.js';
import { checkForErrors, troubleshootBot } from './performance.js';
import { getRoomStatus, getRoomTerrain } from './room.js';
import { getUserInfo } from './user.js';

function normalized(value) {
  if (value && typeof value === 'object' && typeof value.ok === 'boolean' && value.code)
    return value;
  return ok(value);
}

async function mutation(operation, args, target, action, { deploymentId, tick } = {}) {
  const permission = checkPolicy(operation, target);
  if (!permission.ok) {
    await auditStore.append({
      operation,
      request: args,
      target,
      deploymentId,
      result: permission,
      tick,
    });
    return permission;
  }
  let result;
  try {
    result = normalized(await action());
  } catch (error) {
    result = errorResult(error);
  }
  await auditStore.append({ operation, request: args, target, deploymentId, result, tick });
  return result;
}

async function uploadCodeCompatibility({ mainJsPath, branch = SCREEPS_BRANCH }) {
  const source = await fs.readFile(mainJsPath, 'utf8');
  return uploadModules({ entryModule: 'main', modules: { main: source } }, branch);
}

function parseMemoryValue(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw new HarnessError('invalid_request', 'value must be valid JSON.');
  }
}

async function deployAndVerify({
  manifest,
  branch = SCREEPS_BRANCH,
  shard = SCREEPS_SHARD,
  verificationTicks = 5,
}) {
  const validation = validateManifest(manifest);
  if (!validation.valid)
    return fail(
      'validation_failed',
      'Module manifest failed validation; no deployment was started.',
      validation.errors
    );
  const baseline = await deploymentStore.latestKnownGood({ branch, shard });
  let requestedTick = null;
  try {
    requestedTick = (await getGameTime(shard)).tick ?? null;
  } catch {
    // A configured server may not expose game time; the deployment remains traceable by wall clock.
  }
  const record = await deploymentStore.create({
    sourceHash: validation.sourceHash,
    branch,
    shard,
    baselineId: baseline?.id || null,
    rollbackTarget: baseline?.branch && baseline.branch !== branch ? baseline.branch : null,
    requestedTick,
    verificationWindowTicks: verificationTicks,
    status: 'uploading',
  });
  const upload = await mutation(
    'code_upload',
    { manifest, branch },
    { branch, shard },
    () => uploadModules({ ...manifest, sourceHash: validation.sourceHash }, branch),
    { deploymentId: record.id }
  );
  if (!upload.ok) {
    await deploymentStore.update(record.id, { status: 'failed', failure: upload });
    return upload;
  }
  let health;
  try {
    const observedTicks = [];
    for (let index = 0; index < verificationTicks; index += 1) {
      const snapshot = await getEmpireSnapshot();
      const metric = await metricsStore.record({ ...snapshot.data, deploymentId: record.id });
      observedTicks.push(metric.tick);
      if (index + 1 < verificationTicks) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    health = await evaluateHealth({ deploymentId: record.id, baselineDeploymentId: baseline?.id });
    health.data.observedTicks = observedTicks;
  } catch (error) {
    health = errorResult(error);
  }
  const status =
    health.ok && health.data.verdict === 'healthy'
      ? 'healthy'
      : health.ok
        ? 'inconclusive'
        : 'failed';
  const completed = await deploymentStore.update(record.id, {
    status,
    completionTick: health.data?.evidence?.find((item) => item.check === 'probe')?.tick,
    verification: health,
  });
  return ok(
    { deployment: completed, upload: upload.data, verification: health.data },
    status === 'healthy'
      ? 'Deployment verified healthy.'
      : 'Deployment uploaded; verification is not conclusive.'
  );
}

async function rollbackDeployment({ deploymentId }) {
  const record = await deploymentStore.get(deploymentId);
  if (!record) return fail('not_found', 'Deployment record was not found.', { deploymentId });
  if (!record.rollbackTarget)
    return fail('rollback_unavailable', 'Deployment has no recorded rollback target.', {
      deploymentId,
    });
  return mutation(
    'automatic_rollback',
    { deploymentId },
    { branch: record.rollbackTarget },
    async () => {
      const activationPermission = checkPolicy('branch_activation', {
        branch: record.rollbackTarget,
      });
      if (!activationPermission.ok) return activationPermission;
      const result = await activateBranch(record.rollbackTarget);
      if (result.ok)
        await deploymentStore.update(deploymentId, {
          status: 'rolled_back',
          rolledBackAt: new Date().toISOString(),
        });
      return result;
    },
    { deploymentId }
  );
}

const handlers = {
  get_policy: async () => ok(policyForEnvironment()),
  get_audit_log: async (args) => ok({ events: await auditStore.list(args) }),
  get_deployment: async ({ deploymentId }) => {
    const deployment = await deploymentStore.get(deploymentId);
    return deployment
      ? ok({ deployment })
      : fail('not_found', 'Deployment record was not found.', { deploymentId });
  },
  list_deployments: async (args) => ok({ deployments: await deploymentStore.list(args) }),
  list_branches: listBranches,
  list_code_modules: ({ branch = SCREEPS_BRANCH }) => listCodeModules(branch),
  get_code_modules: ({ branch = SCREEPS_BRANCH }) => getCodeModules(branch),
  validate_modules: ({ manifest }) => {
    const validation = validateManifest(manifest);
    return validation.valid
      ? ok(validation, 'Module manifest is valid.')
      : fail('validation_failed', 'Module manifest is invalid.', validation.errors);
  },
  upload_modules: ({ manifest, branch = SCREEPS_BRANCH }) =>
    mutation('code_upload', { manifest, branch }, { branch }, () =>
      uploadModules(manifest, branch)
    ),
  upload_code: (args) =>
    mutation('code_upload', args, { branch: args.branch || SCREEPS_BRANCH }, () =>
      uploadCodeCompatibility(args)
    ),
  activate_branch: ({ branch }) =>
    mutation('branch_activation', { branch }, { branch }, () => activateBranch(branch)),
  rollback_deployment: rollbackDeployment,
  deploy_and_verify: deployAndVerify,
  get_console: async (args) => {
    if (args.clearBuffer) await clearConsoleBuffer();
    return getConsole(args);
  },
  execute_command: (args) =>
    mutation('raw_console', args, { console: true }, () =>
      executeConsoleCommand(args.command, args.shard)
    ),
  get_memory: ({ path = '' }) => getMemory(path),
  set_memory: (args) =>
    mutation('memory_write', args, { path: args.path }, () =>
      setMemory(args.path, parseMemoryValue(args.value))
    ),
  get_room_terrain: ({ roomName, encoded, shard = SCREEPS_SHARD }) =>
    getRoomTerrain(roomName, encoded, shard),
  get_room_status: ({ roomName, shard = SCREEPS_SHARD }) => getRoomStatus(roomName, shard),
  get_user_info: getUserInfo,
  get_game_time: ({ shard = SCREEPS_SHARD }) => getGameTime(shard),
  run_probe: runProbe,
  get_empire_snapshot: getEmpireSnapshot,
  get_room_snapshot: getRoomSnapshot,
  get_room_objects: ({ roomName }) => runProbe({ name: 'room_objects', parameters: { roomName } }),
  analyze_performance: () => runProbe({ name: 'performance' }),
  get_telemetry: getTelemetry,
  record_snapshot: async ({ deploymentId }) => {
    const snapshot = await getEmpireSnapshot();
    return ok({ record: await metricsStore.record({ ...snapshot.data, deploymentId }) });
  },
  get_metrics: getMetrics,
  compare_deployments: compareDeployments,
  evaluate_health: evaluateHealth,
  check_for_errors: checkForErrors,
  troubleshoot_bot: troubleshootBot,
};

export async function dispatchTool(name, args = {}) {
  const handler = handlers[name];
  if (!handler) return fail('unknown_tool', `Unknown tool: ${name}`);
  try {
    validateToolArguments(name, args);
    return normalized(await handler(args));
  } catch (error) {
    return errorResult(error);
  }
}

export function listToolNames() {
  return Object.keys(handlers);
}
