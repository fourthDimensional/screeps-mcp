import { randomUUID } from 'node:crypto';
import { SCREEPS_DEPLOYMENTS_PATH } from './config.js';
import { JsonStore } from './store/json-store.js';

export class DeploymentStore {
  constructor(store = new JsonStore(SCREEPS_DEPLOYMENTS_PATH, [])) {
    this.store = store;
  }
  async create(fields) {
    const records = await this.store.read();
    const record = {
      id: randomUUID(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
      ...fields,
    };
    records.push(record);
    await this.store.write(records);
    return record;
  }
  async update(id, fields) {
    const records = await this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return null;
    records[index] = { ...records[index], ...fields, updatedAt: new Date().toISOString() };
    await this.store.write(records);
    return records[index];
  }
  async get(id) {
    return (await this.store.read()).find((record) => record.id === id) || null;
  }
  async list({ limit = 50 } = {}) {
    return (await this.store.read()).slice(-Math.min(limit, 500)).reverse();
  }
  async latestKnownGood({ branch, shard }) {
    return (
      (await this.store.read())
        .filter(
          (record) =>
            record.branch === branch && record.shard === shard && record.status === 'healthy'
        )
        .at(-1) || null
    );
  }
}

export const deploymentStore = new DeploymentStore();
