import { transport } from '../transport/screeps-transport.js';
import { SCREEPS_SHARD } from '../config.js';

export async function getGameTime(shard = SCREEPS_SHARD) {
  try {
    const response = await transport.get(`/api/game/time?shard=${encodeURIComponent(shard)}`);

    return {
      time: response.data.time,
      tick: response.data.time,
      shard,
    };
  } catch (error) {
    if (error.details?.cause?.includes('invalid shard')) {
      return {
        error: 'Game time requires a valid shard name. Try "shard0", "shard1", or "shard2".',
        note: 'You may need an active game session to get game time.',
        shard,
      };
    }
    throw error;
  }
}
