import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashModules,
  uploadModules,
  validateManifest,
  verifyRemoteModules,
} from '../src/modules.js';
import { transport } from '../src/transport/screeps-transport.js';

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

  it('reports whether the remote module set matches the uploaded manifest', () => {
    const manifest = {
      entryModule: 'main',
      modules: { main: 'module.exports = 1;', worker: 'module.exports = 2;' },
    };

    assert.deepEqual(verifyRemoteModules(manifest, manifest.modules), {
      state: 'verified',
      expectedSourceHash: hashModules(manifest.modules),
      actualSourceHash: hashModules(manifest.modules),
      expectedModuleCount: 2,
      actualModuleCount: 2,
    });
    assert.equal(
      verifyRemoteModules(manifest, { main: 'module.exports = 1;', worker: 'module.exports = 3;' })
        .state,
      'mismatch'
    );
  });

  it('returns a failed result when Screeps rejects an upload', async () => {
    const originalPost = transport.post;
    transport.post = async () => ({ data: { ok: false, error: 'rejected' } });
    try {
      const result = await uploadModules({
        entryModule: 'main',
        modules: { main: 'module.exports = 1;' },
      });
      assert.equal(result.ok, false);
      assert.equal(result.code, 'upload_rejected');
    } finally {
      transport.post = originalPost;
    }
  });
});
