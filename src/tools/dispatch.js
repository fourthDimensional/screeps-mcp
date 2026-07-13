import { uploadCode } from './upload-code.js';
import { clearConsoleBuffer, getConsole } from './console.js';
import { executeConsoleCommand } from './execute-command.js';
import { getMemory, setMemory } from './memory.js';
import { getRoomObjects, getRoomStatus, getRoomTerrain } from './room.js';
import { getUserInfo } from './user.js';
import { getGameTime } from './game-time.js';
import { analyzePerformance, checkForErrors, troubleshootBot } from './performance.js';

const handlers = {
  upload_code: async (args) => uploadCode(args.mainJsPath, args.branch),
  get_console: async (args) => {
    if (args.clearBuffer) {
      await clearConsoleBuffer();
    }
    return getConsole();
  },
  execute_command: async (args) => executeConsoleCommand(args.command),
  get_memory: async (args) => getMemory(args.path || ''),
  set_memory: async (args) => {
    const value = JSON.parse(args.value);
    return setMemory(args.path, value);
  },
  get_room_terrain: async (args) =>
    getRoomTerrain(args.roomName, args.encoded, args.shard || 'shard0'),
  get_room_status: async (args) => getRoomStatus(args.roomName, args.shard || 'shard0'),
  get_user_info: async () => getUserInfo(),
  get_game_time: async (args) => getGameTime(args.shard || 'shard0'),
  analyze_performance: async () => analyzePerformance(),
  check_for_errors: async () => checkForErrors(),
  troubleshoot_bot: async () => troubleshootBot(),
  get_room_objects: async (args) => getRoomObjects(args.roomName),
};

export async function dispatchTool(name, args) {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(args);
}

export function listToolNames() {
  return Object.keys(handlers);
}
