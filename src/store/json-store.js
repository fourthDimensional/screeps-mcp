import fs from 'node:fs/promises';
import path from 'node:path';

export class JsonStore {
  constructor(filePath, defaultValue = []) {
    this.filePath = filePath;
    this.defaultValue = defaultValue;
  }

  async read() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return structuredClone(this.defaultValue);
      throw error;
    }
  }

  async write(value) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, this.filePath);
  }
}
