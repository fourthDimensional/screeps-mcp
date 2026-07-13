import { SCREEPS_BRANCH } from '../config.js';

export const tools = [
  {
    name: 'upload_code',
    description: 'Upload code to Screeps server. Uploads main.js to the specified branch.',
    inputSchema: {
      type: 'object',
      properties: {
        mainJsPath: {
          type: 'string',
          description: 'Path to main.js file to upload',
        },
        branch: {
          type: 'string',
          description: "Branch name (default: 'default')",
          default: SCREEPS_BRANCH,
        },
      },
      required: ['mainJsPath'],
    },
  },
  {
    name: 'get_console',
    description:
      'Get recent console logs from Screeps. Useful for monitoring bot output and debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        clearBuffer: {
          type: 'boolean',
          description: 'Clear the console buffer before returning (gets only new logs)',
          default: false,
        },
      },
    },
  },
  {
    name: 'execute_command',
    description:
      'Execute a JavaScript command in the Screeps console. Returns the result of the command.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            "JavaScript command to execute (e.g., 'Game.time' or 'Object.keys(Game.creeps)')",
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_memory',
    description:
      'Get bot memory from Screeps. Optionally specify a path to get specific memory section.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Memory path (e.g., 'rooms.W1N1' or leave empty for full memory)",
          default: '',
        },
      },
    },
  },
  {
    name: 'set_memory',
    description: 'Set bot memory in Screeps. Useful for configuring bot behavior.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Memory path (e.g., 'config.debug')",
        },
        value: {
          type: 'string',
          description: 'JSON value to set (will be parsed)',
        },
      },
      required: ['path', 'value'],
    },
  },
  {
    name: 'get_room_terrain',
    description: 'Get terrain data for a room. Returns wall, plain, and swamp positions.',
    inputSchema: {
      type: 'object',
      properties: {
        roomName: {
          type: 'string',
          description: "Room name (e.g., 'W1N1')",
        },
        encoded: {
          type: 'boolean',
          description: 'Return encoded terrain data (more compact)',
          default: false,
        },
        shard: {
          type: 'string',
          description: "Shard name (e.g., 'shard0', 'shard1', 'shard2')",
          default: 'shard0',
        },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'get_room_status',
    description: 'Get status information for a room (ownership, reservation, etc).',
    inputSchema: {
      type: 'object',
      properties: {
        roomName: {
          type: 'string',
          description: "Room name (e.g., 'W1N1')",
        },
        shard: {
          type: 'string',
          description: "Shard name (e.g., 'shard0', 'shard1', 'shard2')",
          default: 'shard0',
        },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'get_user_info',
    description: 'Get current user information (username, GCL, CPU, etc).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_game_time',
    description:
      "Get current game time/tick for a specific shard. Requires shard parameter (e.g., 'shard0', 'shard1', 'shard2').",
    inputSchema: {
      type: 'object',
      properties: {
        shard: {
          type: 'string',
          description: "Shard name (default: 'shard0')",
          default: 'shard0',
        },
      },
    },
  },
  {
    name: 'analyze_performance',
    description:
      'Analyze bot performance including CPU usage, bucket level, GCL, room count, and creep count.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'check_for_errors',
    description:
      'Check console logs for errors, exceptions, or undefined references. Returns error details if found.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'troubleshoot_bot',
    description:
      'Comprehensive bot health check. Analyzes performance, checks for errors, examines memory, and provides recommendations.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_room_objects',
    description:
      'Get information about objects in a room (structures, creeps, hostiles, energy, controller status).',
    inputSchema: {
      type: 'object',
      properties: {
        roomName: {
          type: 'string',
          description: "Room name (e.g., 'W1N1')",
        },
      },
      required: ['roomName'],
    },
  },
];
