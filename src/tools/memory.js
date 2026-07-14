import { gunzipSync } from 'node:zlib';
import { transport } from '../transport/screeps-transport.js';

function parseMemory(data) {
  const json = data.startsWith('gz:')
    ? gunzipSync(Buffer.from(data.slice(3), 'base64')).toString('utf8')
    : data;
  return JSON.parse(json);
}

export async function getMemory(path = '') {
  const url = path ? `/api/user/memory?path=${encodeURIComponent(path)}` : '/api/user/memory';
  const response = await transport.get(url);

  return {
    data: response.data.data ? parseMemory(response.data.data) : null,
    tick: response.data.tick,
  };
}

export async function setMemory(path, value) {
  const response = await transport.post('/api/user/memory', {
    path,
    value: JSON.stringify(value),
  });

  return {
    success: response.status === 200,
    result: response.data,
  };
}
