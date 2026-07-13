import { randomUUID } from 'node:crypto';
import { executeConsoleCommand } from '../tools/execute-command.js';
import { getConsole } from '../tools/console.js';
import { HarnessError } from '../core/result.js';
import { SCREEPS_TICK_DURATION_MS } from '../config.js';

export class ConsoleTransport {
  constructor({
    issue = executeConsoleCommand,
    read = getConsole,
    waitMs = 250,
    tickDurationMs = SCREEPS_TICK_DURATION_MS,
  } = {}) {
    this.issue = issue;
    this.read = read;
    this.waitMs = waitMs;
    this.tickDurationMs = tickDurationMs;
  }

  async issueCorrelated(expression, { timeoutTicks = 5 } = {}) {
    const correlationId = randomUUID();
    await this.issue(expression(correlationId));
    const deadline = Date.now() + Math.max(1, timeoutTicks) * this.tickDurationMs;
    while (Date.now() < deadline) {
      const consoleData = await this.read({ afterCursor: 0, limit: 200 });
      for (const entry of [
        ...(consoleData.data?.results || consoleData.results || []),
        ...(consoleData.data?.logs || consoleData.logs || []),
      ]) {
        const text = typeof entry === 'string' ? entry : entry.message || JSON.stringify(entry);
        try {
          const parsed = JSON.parse(text);
          if (parsed?.id === correlationId)
            return { correlationId, result: parsed, console: consoleData };
        } catch {
          // Console output is not necessarily JSON; keep scanning.
        }
      }
      await new Promise((resolve) => setTimeout(resolve, this.waitMs));
    }
    throw new HarnessError(
      'probe_timeout',
      'Probe did not produce a correlated result before its timeout.',
      { correlationId, timeoutTicks, tickDurationMs: this.tickDurationMs }
    );
  }
}
