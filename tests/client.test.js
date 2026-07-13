import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function loadClient(env) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "import('./src/client.js').then(({ client }) => console.log(JSON.stringify({ headers: client.defaults.headers, auth: client.defaults.auth, baseURL: client.defaults.baseURL })))",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe('client', () => {
  it('creates a client with X-Token header when token auth is used', () => {
    const client = loadClient({
      SCREEPS_TOKEN: 'test-token',
      SCREEPS_EMAIL: '',
      SCREEPS_PASSWORD: '',
      SCREEPS_SERVER: '',
    });

    assert.equal(client.headers['X-Token'], 'test-token');
    assert.equal(client.baseURL, 'http://localhost:21025');
  });

  it('creates a client with basic auth when email/password is used', () => {
    const client = loadClient({
      SCREEPS_TOKEN: '',
      SCREEPS_EMAIL: 'test@example.com',
      SCREEPS_PASSWORD: 'secret',
    });

    assert.equal(client.auth.username, 'test@example.com');
    assert.equal(client.auth.password, 'secret');
    assert.equal(client.headers['X-Token'], undefined);
  });
});
