import { ConsoleTransport } from './transport/console-transport.js';
import { HarnessError, ok } from './core/result.js';
import { validateRoomName } from './core/validation.js';
import { SCREEPS_SHARD } from './config.js';

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
  if (name === 'room_snapshot') {
    const roomName = JSON.stringify(parameters.roomName);
    const detail = JSON.stringify(parameters.detail || 'summary');
    return `(()=>{const r=Game.rooms[${roomName}],d=${detail},p=o=>o&&{x:o.pos.x,y:o.pos.y,roomName:o.pos.roomName},store=o=>o&&o.store?Object.fromEntries(Object.entries(o.store)):null;if(!r)return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,roomName:${roomName},detail:d,visibility:'unavailable'}});const summary={energy:{available:r.energyAvailable,capacity:r.energyCapacityAvailable},controller:r.controller&&{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal},structures:r.find(FIND_STRUCTURES).length,creeps:r.find(FIND_MY_CREEPS).length,hostiles:r.find(FIND_HOSTILE_CREEPS).length};let data=summary;if(d==='structures')data={structures:r.find(FIND_STRUCTURES).slice(0,200).map(s=>({id:s.id,type:s.structureType,pos:p(s),hits:s.hits,hitsMax:s.hitsMax,store:store(s)})),truncated:r.find(FIND_STRUCTURES).length>200};else if(d==='creeps')data={creeps:r.find(FIND_MY_CREEPS).slice(0,100).map(c=>({id:c.id,name:c.name,role:Memory.creeps&&Memory.creeps[c.name]&&Memory.creeps[c.name].role||null,pos:p(c),body:c.body.map(b=>b.type),hits:c.hits,hitsMax:c.hitsMax,ticksToLive:c.ticksToLive,store:store(c)})),hostiles:r.find(FIND_HOSTILE_CREEPS).slice(0,100).map(c=>({id:c.id,owner:c.owner&&c.owner.username,pos:p(c),body:c.body.map(b=>b.type),hits:c.hits,hitsMax:c.hitsMax,ticksToLive:c.ticksToLive}))};else if(d==='economy'){const sources=r.find(FIND_SOURCES);const storage=r.storage||r.terminal;data={sources:sources.map(s=>({id:s.id,pos:p(s),energy:s.energy,energyCapacity:s.energyCapacity,ticksToRegeneration:s.ticksToRegeneration})),storage:r.storage&&{id:r.storage.id,pos:p(r.storage),store:store(r.storage)},terminal:r.terminal&&{id:r.terminal.id,pos:p(r.terminal),store:store(r.terminal)},incomeEstimate:{energyPerTick:sources.reduce((n,s)=>n+s.energyCapacity,0)/(typeof ENERGY_REGEN_TIME==='number'?ENERGY_REGEN_TIME:300)}}}else if(d==='planning'){const terrain=r.getTerrain(),counts={plain:0,swamp:0,wall:0};for(let x=0;x<50;x++)for(let y=0;y<50;y++){const v=terrain.get(x,y);counts[v===TERRAIN_MASK_WALL?'wall':v===TERRAIN_MASK_SWAMP?'swamp':'plain']++}data={terrain:counts,anchors:{controller:p(r.controller),sources:r.find(FIND_SOURCES).map(p),storage:p(r.storage),terminal:p(r.terminal),spawns:r.find(FIND_MY_SPAWNS).map(p)},roomPlan:Memory.rooms&&Memory.rooms[${roomName}]&&Memory.rooms[${roomName}].plan||null}}else if(d==='threats')data={hostiles:r.find(FIND_HOSTILE_CREEPS).map(c=>({id:c.id,owner:c.owner&&c.owner.username,pos:p(c),body:c.body.map(b=>b.type),hits:c.hits,hitsMax:c.hitsMax})),hostileStructures:r.find(FIND_HOSTILE_STRUCTURES).map(s=>({id:s.id,type:s.structureType,pos:p(s),hits:s.hits,hitsMax:s.hitsMax}))};return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,roomName:${roomName},detail:d,visibility:'current',summary,data}})})()`;
  }
  return `(()=>{const rooms=Object.values(Game.rooms).filter(r=>r.controller&&r.controller.my).map(r=>({name:r.name,controller:{level:r.controller.level,progress:r.controller.progress,progressTotal:r.controller.progressTotal},energy:{available:r.energyAvailable,capacity:r.energyCapacityAvailable},creeps:r.find(FIND_MY_CREEPS).length,hostiles:r.find(FIND_HOSTILE_CREEPS).length,structures:r.find(FIND_STRUCTURES).length}));return JSON.stringify({id:${id},ok:true,data:{tick:Game.time,shard:Game.shard&&Game.shard.name,cpu:{bucket:Game.cpu.bucket,limit:Game.cpu.limit,used:Game.cpu.getUsed()},rooms}})})()`;
}

export async function runProbe({ name, parameters = {}, timeoutTicks = 5 }) {
  if (!['performance', 'room_objects', 'room_snapshot', 'empire_snapshot'].includes(name)) {
    throw new HarnessError('invalid_request', 'Unknown probe name.', {
      name,
      supported: ['performance', 'room_objects', 'room_snapshot', 'empire_snapshot'],
    });
  }
  if (name === 'room_objects' || name === 'room_snapshot') validateRoomName(parameters.roomName);
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
  const probeData = { ...result.data, shard: SCREEPS_SHARD };
  return ok({
    requestId: correlationId,
    name,
    issuedAt,
    shard: SCREEPS_SHARD,
    issueTick: probeData.tick,
    completionTick: probeData.tick,
    freshness: 'current',
    result: probeData,
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
  const result = await runProbe({ name: 'room_snapshot', parameters: { roomName, detail } });
  return withTelemetry(
    ok({
      ...result.data,
      detail,
      visibility: result.data.result.visibility,
    })
  );
}
