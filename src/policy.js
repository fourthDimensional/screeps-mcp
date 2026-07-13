import { getPolicyConfig } from './config.js';
import { fail, ok } from './core/result.js';

export const MUTATING_OPERATIONS = new Set([
  'memory_write',
  'raw_console',
  'code_upload',
  'branch_activation',
  'automatic_rollback',
  'market_action',
]);

export function policyForEnvironment(config = getPolicyConfig()) {
  const operations = {};
  for (const operation of MUTATING_OPERATIONS) {
    const approved = config.approvedOperations.has(operation);
    operations[operation] = {
      allowed: config.environment !== 'production' || approved,
      approvalRequired: config.environment === 'production' && !approved,
    };
  }
  return { environment: config.environment, operations };
}

export function checkPolicy(operation, target, config = getPolicyConfig()) {
  if (!MUTATING_OPERATIONS.has(operation)) return ok({ operation, target, permitted: true });
  const policy = policyForEnvironment(config);
  if (policy.operations[operation].allowed) return ok({ operation, target, permitted: true });
  return fail('approval_required', `The ${operation} operation is blocked by production policy.`, {
    operation,
    target,
    environment: config.environment,
    approval: `Set SCREEPS_APPROVED_OPERATIONS=${operation}`,
  });
}
