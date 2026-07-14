import { ConsoleTransport } from './transport/console-transport.js';
import { HarnessError, ok } from './core/result.js';
import { validateRoomName } from './core/validation.js';

const consoleTransport = new ConsoleTransport();

export function createProbeExpression(name, parameters, correlationId) {
  const id = JSON.stringify(correlationId);
  if (name === 'performance') {
    return `(()=>{return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,cpu:{bucket:Game.cpu.bucket,limit:Game.cpu.limit,tickLimit:Game.cpu.tickLimit,used:Game.cpu.getUsed()},rooms:Object.keys(Game.rooms).length,creeps:Object.keys(Game.creeps).length}})})()`;
  }
  if (name === 'room_objects') {
    const roomName = JSON.stringify(parameters.roomName);
    return `(()=>{const r=Game.rooms[${roomName}];return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,roomName:${roomName},structures:r?r.find(FIND_STRUCTURES).length:0,creeps:r?r.find(FIND_MY_CREEPS).length:0,hostiles:r?r.find(FIND_HOSTILE_CREEPS).length:0,energy:r&&r.energyAvailable,controller:r&&r.controller&&{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal}}})})()`;
  }
  return `(()=>{const rooms=Object.values(Game.rooms).filter(r=>r.controller&&r.controller.my).map(r=>({name:r.name,controller:{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal},energy:{available:r.energyAvailable,capacity:r.energyCapacityAvailable},creeps:r.find(FIND_MY_CREEPS).length,hostiles:r.find(FIND_HOSTILE_CREEPS).length,structures:r.find(FIND_STRUCTURES).length}));return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,shard:Game.shard&&Game.shard.name,cpu:{bucket:Game.cpu.bucket,limit:Game.cpu.limit,used:Game.cpu.getUsed()},rooms}})})()`;
}

export async function runProbe({ name, parameters = {}, timeoutTicks = 5 }) {
  if (!['performance', 'room_objects', 'empire_snapshot'].includes(name)) {
    throw new HarnessError('invalid_request', 'Unknown probe name.', {
      name,
      supported: ['performance', 'room_objects', 'empire_snapshot'],
    });
  }
  if (name === 'room_objects') validateRoomName(parameters.roomName);
  if (!Number.isInteger(timeoutTicks) || timeoutTicks < 1 || timeoutTicks > 30)
    throw new HarnessError('invalid_request', 'timeoutTicks must be an integer from 1 to 30.');
  const issuedAt = new Date().toISOString();
  const { correlationId, result } = await consoleTransport.issueCorrelated(
    (id) => createProbeExpression(name, parameters, id),
    { timeoutTicks }
  );
  if (!result.ok || !result.data || typeof result.data !== 'object')
    throw new HarnessError('malformed_probe_result', 'Probe returned an invalid result.', {
      correlationId,
      result,
    });
  return ok({
    requestId: correlationId,
    name,
    issuedAt,
    issueTick: result.data.tick,
    completionTick: result.data.tick,
    freshness: 'current',
    result: result.data,
  });
}

async function withTelemetry(snapshot) {
  const { getTelemetry } = await import('./telemetry.js');
  const telemetry = await getTelemetry();
  return ok({ ...snapshot.data, telemetry: telemetry.data });
}

export async function getEmpireSnapshot() {
  return withTelemetry(await runProbe({ name: 'empire_snapshot' }));
}
export async function getRoomSnapshot({ roomName, detail = 'summary' }) {
  validateRoomName(roomName);
  if (!['summary', 'economy', 'structures', 'creeps', 'threats', 'planning'].includes(detail))
    throw new HarnessError('invalid_request', 'Invalid room snapshot detail.');
  const result = await runProbe({ name: 'room_objects', parameters: { roomName } });
  return withTelemetry(
    ok({
      ...result.data,
      detail,
      visibility: result.data.result.energy === undefined ? 'unavailable' : 'current',
    })
  );
}
