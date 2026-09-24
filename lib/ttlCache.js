// Tiny in-memory cache with a size cap and per-entry expiry.
// Used for VIN decodes: a VIN's specs never change, so repeat lookups
// shouldn't hit NHTSA. Lives in process memory — resets on each deploy,
// which is fine for a cache.

function createTtlCache({ maxEntries = 1000, ttlMs = 24 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
  const map = new Map(); // insertion order doubles as LRU order

  function get(key) {
    const hit = map.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now()) {
      map.delete(key);
      return undefined;
    }
    // Refresh recency.
    map.delete(key);
    map.set(key, hit);
    return hit.value;
  }

  function set(key, value) {
    map.delete(key);
    map.set(key, { value, expires: now() + ttlMs });
    while (map.size > maxEntries) {
      map.delete(map.keys().next().value); // evict least recently used
    }
  }

  return { get, set, get size() { return map.size; } };
}

module.exports = { createTtlCache };
