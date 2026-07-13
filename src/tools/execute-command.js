import { client } from '../client.js';

export async function executeConsoleCommand(command) {
  try {
    const response = await client.post('/api/user/console', {
      expression: command,
    });

    return {
      success: response.status === 200,
      result: response.data,
      command,
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
