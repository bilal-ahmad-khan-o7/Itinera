/**
 * Tiny in-memory TTL cache with LRU eviction. Good enough for a single Railway
 * instance; swap for Redis when running more than one replica.
 */
export class TtlCache {
  constructor(maxEntries = 500) {
    this.max = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used.
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key, value, ttlMs) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expires: Date.now() + ttlMs });
    while (this.store.size > this.max) {
      this.store.delete(this.store.keys().next().value);
    }
  }

  get size() {
    return this.store.size;
  }
}

export const cache = new TtlCache();
