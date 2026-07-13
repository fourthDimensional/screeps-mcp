import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

async function loadConfig() {
  return import(`../src/config.js?test=${Math.random()}`);
}

describe('config', () => {
  it('returns token auth when SCREEPS_TOKEN is set', async () => {
    process.env.SCREEPS_TOKEN = 'test-token';
    process.env.SCREEPS_EMAIL = '';
    process.env.SCREEPS_PASSWORD = '';

    const { getAuth } = await loadConfig();
    const auth = getAuth();
    assert.equal(auth.method, 'token');
    assert.equal(auth.token, 'test-token');
  });

  it('returns basic auth when email and password are set', async () => {
    process.env.SCREEPS_TOKEN = '';
    process.env.SCREEPS_EMAIL = 'test@example.com';
    process.env.SCREEPS_PASSWORD = 'secret';

    const { getAuth } = await loadConfig();
    const auth = getAuth();
    assert.equal(auth.method, 'basic');
    assert.equal(auth.username, 'test@example.com');
    assert.equal(auth.password, 'secret');
  });

  it('throws when no authentication is configured', async () => {
    process.env.SCREEPS_TOKEN = '';
    process.env.SCREEPS_EMAIL = '';
    process.env.SCREEPS_PASSWORD = '';

    const { getAuth } = await loadConfig();
    assert.throws(() => getAuth(), /No authentication provided/);
  });

  it('defaults to the local private server', async () => {
    process.env.SCREEPS_SERVER = '';

    const { SCREEPS_SERVER } = await loadConfig();
    assert.equal(SCREEPS_SERVER, 'http://localhost:21025');
  });
});
