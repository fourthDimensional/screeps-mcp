import { client } from '../client.js';

export async function getRoomTerrain(roomName, encoded = false, shard = 'shard0') {
  const url = `/api/game/room-terrain?room=${roomName}&shard=${shard}${encoded ? '&encoded=1' : ''}`;
  const response = await client.get(url);
  return response.data;
}

export async function getRoomStatus(roomName, shard = 'shard0') {
  const response = await client.get(`/api/game/room-status?room=${roomName}&shard=${shard}`);
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
