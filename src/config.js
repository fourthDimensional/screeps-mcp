import dotenv from 'dotenv';

// Load .env from project root if it exists
dotenv.config();

const SCREEPS_TOKEN = process.env.SCREEPS_TOKEN || '';
const SCREEPS_EMAIL = process.env.SCREEPS_EMAIL || '';
const SCREEPS_PASSWORD = process.env.SCREEPS_PASSWORD || '';
const SCREEPS_SERVER = process.env.SCREEPS_SERVER || 'http://localhost:21025';
const SCREEPS_BRANCH = process.env.SCREEPS_BRANCH || 'default';

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

export { SCREEPS_TOKEN, SCREEPS_EMAIL, SCREEPS_PASSWORD, SCREEPS_SERVER, SCREEPS_BRANCH };
