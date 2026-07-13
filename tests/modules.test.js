import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashModules, validateManifest } from '../src/modules.js';

describe('module manifests', () => {
  it('hashes modules independently of object insertion order', () => {
    assert.equal(
      hashModules({ main: 'module.exports = 1', worker: 'module.exports = 2' }),
      hashModules({ worker: 'module.exports = 2', main: 'module.exports = 1' })
    );
  });

  it('reports all manifest errors without a network write', () => {
    const result = validateManifest({
      entryModule: 'missing',
      modules: { 'bad name': 'const =' },
      sourceHash: 'sha256:nope',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });

  it('accepts a complete valid manifest and calculates its source hash', () => {
    const result = validateManifest({
      entryModule: 'main',
      modules: { main: 'module.exports.loop = () => {};' },
    });
    assert.equal(result.valid, true);
    assert.match(result.sourceHash, /^sha256:/);
  });
});
