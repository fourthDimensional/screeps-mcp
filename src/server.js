import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/schemas.js';
import { dispatchTool } from './tools/dispatch.js';

export const VERSION = '1.1.1';

export function createServer() {
  const server = new Server(
    {
      name: 'screeps-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await dispatchTool(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.message,
                stack: error.stack,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
