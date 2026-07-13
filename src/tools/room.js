import { transport } from '../transport/screeps-transport.js';
import { SCREEPS_SHARD } from '../config.js';

export async function getRoomTerrain(roomName, encoded = false, shard = SCREEPS_SHARD) {
  const params = new URLSearchParams({ room: roomName, shard });
  if (encoded) params.set('encoded', '1');
  const url = `/api/game/room-terrain?${params}`;
  const response = await transport.get(url);
  return response.data;
}

export async function getRoomStatus(roomName, shard = SCREEPS_SHARD) {
  const response = await transport.get(
    `/api/game/room-status?${new URLSearchParams({ room: roomName, shard })}`
  );
  return response.data;
}

export async function getRoomObjects(roomName) {
  const command = `JSON.stringify({
    structures: Object.keys(Game.rooms['${roomName}']?.find(FIND_STRUCTURES) || []).length,
    creeps: Object.keys(Game.rooms['${roomName}']?.find(FIND_MY_CREEPS) || []).length,
    hostiles: Object.keys(Game.rooms['${roomName}']?.find(FIND_HOSTILE_CREEPS) || []).length,
    energy: Game.rooms['${roomName}']?.energyAvailable,
    controller: {
      level: Game.rooms['${roomName}']?.controller?.level,
      progress: Game.rooms['${roomName}']?.controller?.progress,
      progressTotal: Game.rooms['${roomName}']?.controller?.progressTotal
    }
  })`;

  const { executeConsoleCommand } = await import('./execute-command.js');
  return executeConsoleCommand(command);
}
