import { HarnessError } from './result.js';

const ROOM_NAME = /^(?:[WE]\d+[NS]\d+|sim)$/i;
const IDENTIFIER = /^[A-Za-z_$][\w$]*(?:[./-][A-Za-z_$][\w$]*)*$/;

export function assertObject(value, label = 'arguments') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HarnessError('invalid_request', `${label} must be an object.`);
  }
}

export function assertString(value, name, { min = 1, max = 10000, pattern } = {}) {
  if (
    typeof value !== 'string' ||
    value.length < min ||
    value.length > max ||
    (pattern && !pattern.test(value))
  ) {
    throw new HarnessError('invalid_request', `Invalid ${name}.`);
  }
  return value;
}

export function validateRoomName(roomName) {
  return assertString(roomName, 'roomName', { max: 16, pattern: ROOM_NAME });
}

export function validateShard(shard) {
  return assertString(shard, 'shard', { max: 64, pattern: /^[A-Za-z0-9_-]+$/ });
}

export function validateBranch(branch) {
  return assertString(branch, 'branch', { max: 64, pattern: /^[A-Za-z0-9_.-]+$/ });
}

export function validateModuleName(name) {
  return assertString(name, 'module name', { max: 128, pattern: IDENTIFIER });
}

export function validatePath(path) {
  if (path === '') return path;
  return assertString(path, 'path', {
    min: 0,
    max: 1024,
    pattern: /^(?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*$/,
  });
}

export function validateToolArguments(name, args = {}) {
  assertObject(args);
  const required = {
    upload_modules: ['manifest'],
    validate_modules: ['manifest'],
    get_code_modules: ['branch'],
    list_code_modules: ['branch'],
    activate_branch: ['branch'],
    get_deployment: ['deploymentId'],
    rollback_deployment: ['deploymentId'],
    run_probe: ['name'],
    get_room_snapshot: ['roomName'],
    set_memory: ['path', 'value'],
    execute_command: ['command'],
    get_room_terrain: ['roomName'],
    get_room_status: ['roomName'],
    get_room_objects: ['roomName'],
    screeps_search: ['query'],
    screeps_read_section: ['id'],
    screeps_read_page: ['id'],
  }[name];
  for (const key of required || []) {
    if (!(key in args)) throw new HarnessError('invalid_request', `${key} is required.`);
  }
  if ('roomName' in args) validateRoomName(args.roomName);
  if ('shard' in args) validateShard(args.shard);
  if ('branch' in args) validateBranch(args.branch);
  if ('path' in args) validatePath(args.path);
  if ('mainJsPath' in args) assertString(args.mainJsPath, 'mainJsPath', { max: 4096 });
  if ('command' in args) assertString(args.command, 'command', { max: 10000 });
  if ('deploymentId' in args)
    assertString(args.deploymentId, 'deploymentId', { max: 128, pattern: /^[A-Za-z0-9-]+$/ });
  if ('baselineDeploymentId' in args)
    assertString(args.baselineDeploymentId, 'baselineDeploymentId', {
      max: 128,
      pattern: /^[A-Za-z0-9-]+$/,
    });
  if (
    'manifest' in args &&
    (!args.manifest || typeof args.manifest !== 'object' || Array.isArray(args.manifest))
  ) {
    throw new HarnessError('invalid_request', 'manifest must be an object.');
  }
  if ('limit' in args && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 1000)) {
    throw new HarnessError('invalid_request', 'limit must be an integer from 1 to 1000.');
  }
  if ('afterCursor' in args && (!Number.isInteger(args.afterCursor) || args.afterCursor < 0)) {
    throw new HarnessError('invalid_request', 'afterCursor must be a non-negative integer.');
  }
  if ('clearBuffer' in args && typeof args.clearBuffer !== 'boolean') {
    throw new HarnessError('invalid_request', 'clearBuffer must be a boolean.');
  }
  for (const field of ['timeoutTicks', 'verificationTicks']) {
    if (field in args && (!Number.isInteger(args[field]) || args[field] < 1 || args[field] > 30)) {
      throw new HarnessError('invalid_request', `${field} must be an integer from 1 to 30.`);
    }
  }
  if ('encoded' in args && typeof args.encoded !== 'boolean') {
    throw new HarnessError('invalid_request', 'encoded must be a boolean.');
  }
  if (
    'parameters' in args &&
    (!args.parameters || typeof args.parameters !== 'object' || Array.isArray(args.parameters))
  ) {
    throw new HarnessError('invalid_request', 'parameters must be an object.');
  }
  if (
    'levels' in args &&
    (!Array.isArray(args.levels) || args.levels.some((level) => typeof level !== 'string'))
  ) {
    throw new HarnessError('invalid_request', 'levels must be an array of strings.');
  }
  if (
    'detail' in args &&
    !['summary', 'economy', 'structures', 'creeps', 'threats', 'planning'].includes(args.detail)
  ) {
    throw new HarnessError('invalid_request', 'detail must be a supported room snapshot detail.');
  }
  if ('value' in args) {
    try {
      JSON.parse(args.value);
    } catch {
      throw new HarnessError('invalid_request', 'value must be valid JSON.');
    }
  }
  if ('query' in args) {
    assertString(args.query, 'query', { min: 1, max: 256 });
  }
  if ('scope' in args && !['all', 'api', 'guide'].includes(args.scope)) {
    throw new HarnessError('invalid_request', 'scope must be all, api, or guide.');
  }
  if ('id' in args && (!Number.isInteger(args.id) || args.id < 1)) {
    throw new HarnessError('invalid_request', 'id must be a positive integer.');
  }
  return args;
}
