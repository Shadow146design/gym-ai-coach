// Cache memoire simple a TTL pour les routes GET couteuses/peu volatiles
// (stats publiques, leaderboard). Pas de dependance externe : un seul
// process Node (Render), pas besoin de Redis pour ce volume.
const store = new Map();

async function cached(key, ttlMs, compute) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value;
  const value = await compute();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

module.exports = { cached };
