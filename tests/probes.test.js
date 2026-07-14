import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProbeExpression } from '../src/probes.js';

describe('probe expressions', () => {
  it('returns the correlated probe payload as the console result', () => {
    const expression = createProbeExpression('performance', {}, 'probe-id');

    assert.doesNotMatch(expression, /console\.log\(/);
    assert.match(expression, /return JSON\.stringify\(/);
    assert.match(expression, /probe-id/);
    assert.ok(expression.length < 1000, `probe expression is ${expression.length} characters`);
  });
});
