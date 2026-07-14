import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deployManifestAndVerify } from '../../src/deployment-service.js';

describe('verified deployment contract', () => {
  it('rejects an invalid manifest before the upload callback can run', async () => {
    let uploadCalled = false;
    const result = await deployManifestAndVerify({
      manifest: { entryModule: 'missing', modules: {} },
      upload: async () => {
        uploadCalled = true;
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'validation_failed');
    assert.equal(uploadCalled, false);
  });
});
