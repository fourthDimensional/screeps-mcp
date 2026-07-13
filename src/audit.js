import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SCREEPS_AUDIT_PATH, SCREEPS_SESSION_LABEL } from './config.js';

function safeSummary(request = {}) {
  const summary = { ...request };
  delete summary.modules;
  delete summary.manifest;
  delete summary.value;
  delete summary.command;
  return summary;
}

export class AuditStore {
  constructor(filePath = SCREEPS_AUDIT_PATH) {
    this.filePath = filePath;
  }

  async append({
    operation,
    request,
    target,
    deploymentId,
    result,
    tick,
    actor = SCREEPS_SESSION_LABEL,
  }) {
    const event = {
      id: randomUUID(),
      operation,
      actor,
      request: safeSummary(request),
      target,
      deploymentId,
      result: { ok: result.ok, code: result.code },
      wallClockTime: new Date().toISOString(),
      ...(tick === undefined ? {} : { tick }),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
    return event;
  }

  async list({ limit = 100 } = {}) {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .slice(-Math.min(limit, 500))
        .reverse();
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
}

export const auditStore = new AuditStore();
