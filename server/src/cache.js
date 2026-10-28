// Ultra-fast in-memory cache for high throughput and sub-millisecond responses
class SimpleMemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // Clear by prefix, e.g. 'movies:' or 'shows:'
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export const memoryCache = new SimpleMemoryCache();

// Express middleware for fast caching of GET requests
export function cacheMiddleware(ttlSeconds = 30) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = req.originalUrl || req.url;
    const cachedData = memoryCache.get(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(cacheKey, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}
