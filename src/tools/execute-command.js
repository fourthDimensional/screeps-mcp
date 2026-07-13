import { transport } from '../transport/screeps-transport.js';
import { SCREEPS_SHARD } from '../config.js';

export async function executeConsoleCommand(command, shard = SCREEPS_SHARD) {
  try {
    const response = await transport.post('/api/user/console', {
      expression: command,
      shard,
    });

    return {
      success: response.status === 200 && !response.data?.error,
      result: response.data,
      command,
      shard,
      note: 'Command sent successfully. Results will appear in next game tick. Use get_console to retrieve results.',
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return {
        success: false,
        error: 'Console command endpoint not available. Your bot may need to be active in-game.',
        command,
      };
    }
    throw error;
  }
}
