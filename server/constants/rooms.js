const ROOMS = [
  { id: 'general', name: 'General', description: 'Everyone hangs out here.' },
  { id: 'dev', name: 'Dev', description: 'Code talk and product ideas.' },
  { id: 'random', name: 'Random', description: 'Memes, links, and side quests.' },
  { id: 'support', name: 'Support', description: 'Help each other out fast.' },
];

const ROOM_IDS = new Set(ROOMS.map((room) => room.id));

function normalizeRoom(room) {
  const normalized = String(room || 'general').trim().toLowerCase();
  return ROOM_IDS.has(normalized) ? normalized : 'general';
}

module.exports = { ROOMS, normalizeRoom };
