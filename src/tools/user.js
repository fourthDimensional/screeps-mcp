import { client } from '../client.js';

export async function getUserInfo() {
  const response = await client.get('/api/auth/me');
  const data = response.data;

  return {
    username: data.username,
    userId: data._id,
    gcl: data.gcl,
    gclLevel: data.gcl ? Math.floor(data.gcl / 1000000) + 1 : 1,
    cpu: data.cpu,
    cpuShard: data.cpuShard,
    credits: data.credits,
    money: data.money,
    power: data.power,
    pixels: data.resources?.pixel || 0,
    badge: data.badge,
    lastRespawnDate: data.lastRespawnDate,
    steam: data.steam ? { id: data.steam.id, displayName: data.steam.displayName } : null,
    github: data.github ? { username: data.github.username, repo: data.github.repo?.name } : null,
    raw: data,
  };
}
