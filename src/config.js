import dotenv from 'dotenv';

// Load .env from project root if it exists
dotenv.config();

const SCREEPS_TOKEN = process.env.SCREEPS_TOKEN || '';
const SCREEPS_EMAIL = process.env.SCREEPS_EMAIL || '';
const SCREEPS_PASSWORD = process.env.SCREEPS_PASSWORD || '';
const SCREEPS_SERVER = process.env.SCREEPS_SERVER || 'http://localhost:21025';
const SCREEPS_BRANCH = process.env.SCREEPS_BRANCH || 'default';
const SCREEPS_ENVIRONMENT = process.env.SCREEPS_ENVIRONMENT || 'development';
const SCREEPS_AUDIT_PATH = process.env.SCREEPS_AUDIT_PATH || '.screeps-mcp/audit.jsonl';
const SCREEPS_DEPLOYMENTS_PATH =
  process.env.SCREEPS_DEPLOYMENTS_PATH || '.screeps-mcp/deployments.json';
const SCREEPS_METRICS_PATH = process.env.SCREEPS_METRICS_PATH || '.screeps-mcp/metrics.json';
const SCREEPS_SESSION_LABEL = process.env.SCREEPS_SESSION_LABEL || 'mcp';

if (!['development', 'staging', 'production'].includes(SCREEPS_ENVIRONMENT)) {
  throw new Error('SCREEPS_ENVIRONMENT must be development, staging, or production.');
}

export function getPolicyConfig() {
  return {
    environment: SCREEPS_ENVIRONMENT,
    approvedOperations: new Set(
      (process.env.SCREEPS_APPROVED_OPERATIONS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  };
}

/**
 * Validate that authentication is configured.
 * Throws a clear error if neither token nor email/password is set.
 */
export function getAuth() {
  if (SCREEPS_TOKEN) {
    return {
      method: 'token',
      token: SCREEPS_TOKEN,
    };
  }

  if (SCREEPS_EMAIL && SCREEPS_PASSWORD) {
    return {
      method: 'basic',
      username: SCREEPS_EMAIL,
      password: SCREEPS_PASSWORD,
    };
  }

  throw new Error(
    'No authentication provided. Set SCREEPS_TOKEN or SCREEPS_EMAIL/SCREEPS_PASSWORD environment variables.'
  );
}

export {
  SCREEPS_TOKEN,
  SCREEPS_EMAIL,
  SCREEPS_PASSWORD,
  SCREEPS_SERVER,
  SCREEPS_BRANCH,
  SCREEPS_ENVIRONMENT,
  SCREEPS_AUDIT_PATH,
  SCREEPS_DEPLOYMENTS_PATH,
  SCREEPS_METRICS_PATH,
  SCREEPS_SESSION_LABEL,
};
