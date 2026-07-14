import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadManifestFromFiles, validateFiles } from '../src/modules.js';

describe('file module manifest adapter', () => {
  let root;

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'screeps-source-'));
    await fs.mkdir(path.join(root, 'roles'));
    await fs.writeFile(
      path.join(root, 'main.js'),
      "module.exports.loop = () => require('roles/harvester');"
    );
    await fs.writeFile(path.join(root, 'roles', 'harvester.js'), 'module.exports.run = () => {};');
    await fs.writeFile(path.join(root, 'roles', 'ignored.txt'), 'not a module');
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('builds a complete manifest from a directory tree', async () => {
    const loaded = await loadManifestFromFiles('.', { sourceRoot: root });

    assert.equal(loaded.manifest.entryModule, 'main');
    assert.deepEqual(Object.keys(loaded.manifest.modules).sort(), ['main', 'roles/harvester']);
    assert.match(loaded.manifest.sourceHash, /^sha256:/);
    assert.equal(loaded.moduleCount, 2);
  });

  it('uses a single file name as its default entry module', async () => {
    const loaded = await loadManifestFromFiles('roles/harvester.js', { sourceRoot: root });

    assert.equal(loaded.manifest.entryModule, 'harvester');
    assert.deepEqual(Object.keys(loaded.manifest.modules), ['harvester']);
  });

  it('does not allow a source path outside the configured root', async () => {
    await assert.rejects(loadManifestFromFiles('..', { sourceRoot: root }), {
      code: 'invalid_request',
    });
  });

  it('returns JavaScript syntax errors without a network write', async () => {
    await fs.writeFile(path.join(root, 'bad.js'), 'const = broken;');
    const result = await validateFiles('bad.js', { sourceRoot: root });

    assert.equal(result.validation.valid, false);
    assert.match(result.validation.errors[0].message, /syntax error/);
  });
});
