import { SCREEPS_METRICS_PATH } from './config.js';
import { JsonStore } from './store/json-store.js';
import { ok } from './core/result.js';

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.ceil((percentileValue / 100) * values.length) - 1);
  return [...values].sort((a, b) => a - b)[index];
}
function summary(records) {
  const cpu = records.map((r) => r.cpuUsed).filter(Number.isFinite);
  const buckets = records.map((r) => r.cpuBucket).filter(Number.isFinite);
  return {
    samples: records.length,
    cpu: cpu.length
      ? {
          mean: cpu.reduce((sum, value) => sum + value, 0) / cpu.length,
          p50: percentile(cpu, 50),
          p95: percentile(cpu, 95),
          max: Math.max(...cpu),
        }
      : null,
    cpuBucket: buckets.length
      ? { first: buckets[0], last: buckets.at(-1), delta: buckets.at(-1) - buckets[0] }
      : null,
    errorCount: records.reduce((sum, record) => sum + (record.errorCount || 0), 0),
    rooms: records.at(-1)?.rooms ?? null,
    creeps: records.at(-1)?.creeps ?? null,
  };
}

export class MetricsStore {
  constructor(store = new JsonStore(SCREEPS_METRICS_PATH, [])) {
    this.store = store;
  }
  async record(snapshot) {
    const records = await this.store.read();
    const data = snapshot.result || snapshot;
    const rooms = Array.isArray(data.rooms) ? data.rooms.length : data.rooms;
    const creeps = Array.isArray(data.rooms)
      ? data.rooms.reduce((count, room) => count + (Number(room.creeps) || 0), 0)
      : data.creeps;
    const record = {
      recordedAt: new Date().toISOString(),
      deploymentId: snapshot.deploymentId,
      shard: data.shard,
      tick: data.tick,
      room: snapshot.room,
      cpuUsed: data.cpu?.used,
      cpuBucket: data.cpu?.bucket,
      rooms,
      creeps,
      telemetry: snapshot.telemetry,
      errorCount: snapshot.errorCount || 0,
    };
    records.push(record);
    await this.store.write(records);
    return record;
  }
  async list({ deploymentId, limit = 100 } = {}) {
    return (await this.store.read())
      .filter((record) => !deploymentId || record.deploymentId === deploymentId)
      .slice(-Math.min(limit, 1000));
  }
  async compare(deploymentId, baselineDeploymentId) {
    const records = await this.store.read();
    return {
      deployment: summary(records.filter((record) => record.deploymentId === deploymentId)),
      baseline: summary(records.filter((record) => record.deploymentId === baselineDeploymentId)),
    };
  }
}
export const metricsStore = new MetricsStore();

export async function getMetrics(args) {
  return ok({ records: await metricsStore.list(args) });
}
export async function compareDeployments({ deploymentId, baselineDeploymentId }) {
  return ok(await metricsStore.compare(deploymentId, baselineDeploymentId));
}
