import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { SCREEPS_BRANCH } from './config.js';
import { HarnessError, ok } from './core/result.js';
import { validateBranch, validateModuleName } from './core/validation.js';
import { transport } from './transport/screeps-transport.js';

const MAX_MODULES = 200;
const MAX_MODULE_BYTES = 500 * 1024;

export function hashModules(modules) {
  const normalized = Object.keys(modules)
    .sort()
    .map((name) => [name, modules[name]]);
  return `sha256:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`;
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    return { valid: false, errors: [{ field: 'manifest', message: 'must be an object' }] };
  const { entryModule, modules, sourceHash } = manifest;
  try {
    validateModuleName(entryModule);
  } catch (error) {
    errors.push({ field: 'entryModule', message: error.message });
  }
  if (!modules || typeof modules !== 'object' || Array.isArray(modules))
    errors.push({ field: 'modules', message: 'must be an object' });
  else {
    const entries = Object.entries(modules);
    if (entries.length === 0 || entries.length > MAX_MODULES)
      errors.push({ field: 'modules', message: `must contain 1-${MAX_MODULES} modules` });
    for (const [name, source] of entries) {
      try {
        validateModuleName(name);
      } catch (error) {
        errors.push({ field: `modules.${name}`, message: error.message });
      }
      if (typeof source !== 'string' || Buffer.byteLength(source) > MAX_MODULE_BYTES)
        errors.push({
          field: `modules.${name}`,
          message: `must be a JavaScript string under ${MAX_MODULE_BYTES} bytes`,
        });
      else {
        try {
          new vm.Script(source, { filename: name });
        } catch (error) {
          errors.push({
            field: `modules.${name}`,
            message: `JavaScript syntax error: ${error.message}`,
          });
        }
      }
    }
    if (entryModule && !Object.hasOwn(modules, entryModule))
      errors.push({ field: 'entryModule', message: 'is not present in modules' });
    const actualHash = hashModules(modules);
    if (sourceHash && sourceHash !== actualHash)
      errors.push({
        field: 'sourceHash',
        message: 'does not match module contents',
        expected: actualHash,
      });
  }
  return {
    valid: errors.length === 0,
    errors,
    sourceHash:
      modules && typeof modules === 'object' && !Array.isArray(modules)
        ? hashModules(modules)
        : undefined,
  };
}

export async function listBranches() {
  const response = await transport.get('/api/user/branches');
  return ok({
    branches: response.data.list || response.data.branches || response.data,
    rawServerData: response.data,
  });
}
export async function listCodeModules(branch = SCREEPS_BRANCH) {
  validateBranch(branch);
  const response = await transport.get(`/api/user/code?branch=${encodeURIComponent(branch)}`);
  const modules = response.data.modules || response.data;
  return ok({ branch, modules: Object.keys(modules || {}), rawServerData: response.data });
}
export async function getCodeModules(branch = SCREEPS_BRANCH) {
  validateBranch(branch);
  const response = await transport.get(`/api/user/code?branch=${encodeURIComponent(branch)}`);
  return ok({
    branch,
    modules: response.data.modules || response.data,
    rawServerData: response.data,
  });
}
export async function uploadModules(manifest, branch = SCREEPS_BRANCH) {
  validateBranch(branch);
  const validation = validateManifest(manifest);
  if (!validation.valid)
    throw new HarnessError(
      'validation_failed',
      'Module manifest failed validation; nothing was uploaded.',
      validation.errors
    );
  const response = await transport.post('/api/user/code', { branch, modules: manifest.modules });
  return ok(
    { branch, sourceHash: validation.sourceHash, rawServerData: response.data },
    response.data?.ok === false ? 'Screeps rejected the upload.' : 'Modules uploaded.'
  );
}
export async function activateBranch(branch) {
  validateBranch(branch);
  const response = await transport.post('/api/user/set-active-branch', { branch });
  return ok({ branch, rawServerData: response.data }, 'Branch activated.');
}
