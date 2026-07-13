import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPolicy, policyForEnvironment } from '../src/policy.js';

describe('operation policy', () => {
  it('denies production mutations unless explicitly approved', () => {
    const config = { environment: 'production', approvedOperations: new Set() };
    const result = checkPolicy('code_upload', { branch: 'default' }, config);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'approval_required');
    assert.equal(policyForEnvironment(config).operations.code_upload.allowed, false);
  });

  it('permits an explicitly approved operation', () => {
    const result = checkPolicy(
      'code_upload',
      {},
      { environment: 'production', approvedOperations: new Set(['code_upload']) }
    );
    assert.equal(result.ok, true);
  });
});
