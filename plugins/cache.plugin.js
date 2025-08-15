const { BasePlugin } = require('../lib/plugins/plugin-manager');

class CachePlugin extends BasePlugin {
  constructor() {
    super();
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = null;
  }

  getInfo() {
    return {
      name: 'cache',
      version: '1.0.0',
      description: 'In-memory caching for agent executions',
      author: 'INIT-ABDELLM'
    };
  }

  async initialize(pluginManager) {
    await super.initialize(pluginManager);
    
    pluginManager.registerHook('before_execution', this.checkCache.bind(this));
    pluginManager.registerHook('after_execution', this.storeCache.bind(this));
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean every minute
  }

  async checkCache(context) {
    if (!this.shouldCache(context)) {
      return context;
    }

    const cacheKey = this.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cacheKey)) {
      context.cacheHit = true;
      context.cachedResult = cached;
      context.skipExecution = true;
    }
    
    return context;
  }

  async storeCache(context) {
    if (!this.shouldCache(context) || context.cacheHit) {
      return context;
    }

    const cacheKey = this.generateCacheKey(context);
    const ttl = this.getCacheTTL(context);
    
    this.cache.set(cacheKey, context.result);
    this.ttl.set(cacheKey, Date.now() + ttl);
    
    return context;
  }

  shouldCache(context) {
    // Don't cache if agent explicitly disables caching
    if (context.ast.cache === false) {
      return false;
    }
    
    // Only cache deterministic operations
    const hasRandomElements = this.hasRandomElements(context);
    return !hasRandomElements;
  }

  hasRandomElements(context) {
    // Check if input contains timestamps or random data
    const inputStr = JSON.stringify(context.input);
    return /timestamp|random|uuid|now\(\)/i.test(inputStr);
  }

  generateCacheKey(context) {
    const keyData = {
      agentId: context.ast.id,
      agentVersion: context.ast.version,
      input: context.input
    };
    
    return this.hash(JSON.stringify(keyData));
  }

  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getCacheTTL(context) {
    // Check if agent specifies custom TTL
    if (context.ast.cache && typeof context.ast.cache === 'object') {
      return context.ast.cache.ttl || this.defaultTTL;
    }
    
    return this.defaultTTL;
  }

  isExpired(cacheKey) {
    const expiry = this.ttl.get(cacheKey);
    return !expiry || Date.now() > expiry;
  }

  cleanup() {
    const now = Date.now();
    
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }

  getStats() {
    return {
      entries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRatio: this.calculateHitRatio()
    };
  }

  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // Approximate character size
      totalSize += JSON.stringify(value).length * 2;
    }
    
    return Math.round(totalSize / 1024) + ' KB';
  }

  calculateHitRatio() {
    // This would need to be tracked separately in a real implementation
    return 'N/A';
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  async cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = CachePlugin;