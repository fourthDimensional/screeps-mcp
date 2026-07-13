import { ConsoleTransport } from './transport/console-transport.js';
import { HarnessError, ok } from './core/result.js';
import { validateRoomName } from './core/validation.js';

const consoleTransport = new ConsoleTransport();

function probeExpression(name, parameters, correlationId) {
  const payload = JSON.stringify({ id: correlationId, name, parameters });
  const source = `(()=>{const p=${payload};let d;switch(p.name){case 'performance':d={tick:Game.time,cpu:{bucket:Game.cpu.bucket,limit:Game.cpu.limit,tickLimit:Game.cpu.tickLimit,used:Game.cpu.getUsed()},rooms:Object.keys(Game.rooms).length,creeps:Object.keys(Game.creeps).length};break;case 'room_objects':{const r=Game.rooms[p.parameters.roomName];d={tick:Game.time,roomName:p.parameters.roomName,structures:r?r.find(FIND_STRUCTURES).length:0,creeps:r?r.find(FIND_MY_CREEPS).length:0,hostiles:r?r.find(FIND_HOSTILE_CREEPS).length:0,energy:r&&r.energyAvailable,controller:r&&r.controller&&{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal}};break;}case 'empire_snapshot':d={tick:Game.time,shard:Game.shard&&Game.shard.name,cpu:{bucket:Game.cpu.bucket,limit:Game.cpu.limit,used:Game.cpu.getUsed()},rooms:Object.values(Game.rooms).filter(r=>r.controller&&r.controller.my).map(r=>({name:r.name,controller:{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal},energy:{available:r.energyAvailable,capacity:r.energyCapacityAvailable},creeps:r.find(FIND_MY_CREEPS).length,hostiles:r.find(FIND_HOSTILE_CREEPS).length,structures:r.find(FIND_STRUCTURES).length}))};break;default:throw new Error('Unknown probe '+p.name)};console.log(JSON.stringify({id:p.id,ok:true,data:d}));return JSON.stringify({id:p.id,issuedAt:Game.time})})()`;
  return source;
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
    (id) => probeExpression(name, parameters, id),
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
