import { client } from '../client.js';

export async function getGameTime(shard = 'shard0') {
  try {
    const response = await client.get(`/api/game/time?shard=${shard}`);

    return {
      time: response.data.time,
      tick: response.data.time,
      shard,
    };
  } catch (error) {
    if (error.response?.data?.error === 'invalid shard') {
      return {
        error: 'Game time requires a valid shard name. Try "shard0", "shard1", or "shard2".',
        note: 'You may need an active game session to get game time.',
        shard,
      };
    }
    throw error;
  }
}
