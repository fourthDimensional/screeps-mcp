import { SCREEPS_BRANCH } from '../config.js';
import { client } from '../client.js';
import fs from 'fs/promises';

export async function uploadCode(mainJsPath, branch = SCREEPS_BRANCH) {
  const mainJsContent = await fs.readFile(mainJsPath, 'utf-8');

  const payload = {
    branch,
    modules: {
      main: mainJsContent,
    },
  };

  const response = await client.post('/api/user/code', payload);

  return {
    success: response.status === 200,
    statusCode: response.status,
    message: response.data.ok ? 'Code uploaded successfully' : 'Upload failed',
    data: response.data,
  };
}
