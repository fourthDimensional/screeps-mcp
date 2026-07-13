import { client } from '../client.js';

export async function getMemory(path = '') {
  const url = path ? `/api/user/memory?path=${encodeURIComponent(path)}` : '/api/user/memory';
  const response = await client.get(url);

  return {
    data: response.data.data ? JSON.parse(response.data.data) : null,
    tick: response.data.tick,
  };
}

export async function setMemory(path, value) {
  const response = await client.post('/api/user/memory', {
    path,
    value: JSON.stringify(value),
  });

  return {
    success: response.status === 200,
    result: response.data,
  };
}
