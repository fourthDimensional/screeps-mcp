import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { SCREEPS_BRANCH, SCREEPS_SOURCE_ROOT } from './config.js';
import { HarnessError, ok } from './core/result.js';
import { validateBranch, validateModuleName } from './core/validation.js';
import { transport } from './transport/screeps-transport.js';

const MAX_MODULES = 200;
const MAX_MODULE_BYTES = 500 * 1024;
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules']);

function moduleNameFromRelativePath(relativePath) {
  return relativePath
    .split(path.sep)
    .join('/')
    .replace(/\.(?:js|mjs|cjs)$/i, '');
}

async function collectSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name))
        files.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

/**
 * Build a complete Screeps manifest from one JS file or a directory tree.
 * This is the file-based interface; callers do not need to know module naming,
 * recursive traversal, or source hashing rules.
 */
export async function loadManifestFromFiles(
  sourcePath,
  { entryModule, sourceRoot = SCREEPS_SOURCE_ROOT } = {}
) {
  const root = await fs.realpath(sourceRoot).catch(() => {
    throw new HarnessError('invalid_request', 'Configured SCREEPS_SOURCE_ROOT does not exist.', {
      sourceRoot,
    });
  });
  const resolved = path.resolve(sourceRoot, sourcePath);
  const source = await fs.realpath(resolved).catch(() => {
    throw new HarnessError('invalid_request', 'sourcePath does not exist.', { sourcePath });
  });
  const relative = path.relative(root, source);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new HarnessError('invalid_request', 'sourcePath must be inside SCREEPS_SOURCE_ROOT.', {
      sourcePath,
      sourceRoot: root,
    });
  }

  const stat = await fs.stat(source);
  const files = stat.isDirectory() ? await collectSourceFiles(source) : [source];
  if (!files.length) {
    throw new HarnessError('validation_failed', 'sourcePath contains no JavaScript module files.', {
      sourcePath,
    });
  }

  const modules = {};
  for (const file of files.sort()) {
    if (!SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
      throw new HarnessError('validation_failed', 'sourcePath must be a JavaScript file.', {
        sourcePath,
      });
    }
    const name = stat.isDirectory()
      ? moduleNameFromRelativePath(path.relative(source, file))
      : moduleNameFromRelativePath(path.basename(file));
    if (Object.hasOwn(modules, name)) {
      throw new HarnessError(
        'validation_failed',
        'Two source files resolve to the same module name.',
        {
          name,
        }
      );
    }
    modules[name] = await fs.readFile(file, 'utf8');
  }
  const manifest = {
    entryModule:
      entryModule ||
      (stat.isDirectory() ? 'main' : moduleNameFromRelativePath(path.basename(source))),
    modules,
  };
  return {
    manifest: { ...manifest, sourceHash: hashModules(modules) },
    sourcePath: source,
    moduleCount: files.length,
  };
}

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

export async function validateFiles(sourcePath, options) {
  const loaded = await loadManifestFromFiles(sourcePath, options);
  return { ...loaded, validation: validateManifest(loaded.manifest) };
}

export async function uploadFiles(sourcePath, branch = SCREEPS_BRANCH, options) {
  const loaded = await loadManifestFromFiles(sourcePath, options);
  const uploaded = await uploadModules(loaded.manifest, branch);
  return ok({ ...uploaded.data, sourcePath: loaded.sourcePath, moduleCount: loaded.moduleCount });
}
export async function activateBranch(branch) {
  validateBranch(branch);
  const response = await transport.post('/api/user/set-active-branch', { branch });
  return ok({ branch, rawServerData: response.data }, 'Branch activated.');
}
