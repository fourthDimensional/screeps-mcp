import { getMemory } from './tools/memory.js';
import { ok } from './core/result.js';

export async function getTelemetry() {
  let memory;
  try {
    memory = await getMemory('telemetry');
  } catch (error) {
    return ok({
      available: false,
      telemetry: null,
      reason: 'Telemetry Memory is unavailable.',
      code: error.code || 'unavailable',
    });
  }
  const telemetry = memory.data;
  if (!telemetry || typeof telemetry !== 'object' || !telemetry.version)
    return ok({
      available: false,
      telemetry: null,
      reason: 'Bot did not advertise versioned Memory.telemetry.',
    });
  return ok({ available: true, telemetry, tick: memory.tick });
}
