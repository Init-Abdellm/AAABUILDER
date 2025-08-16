const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const crypto = require('crypto');
const enhancedParser = require('./enhanced-parser');
const logger = require('../diagnostics/logger');

/**
 * Hot-reload parser with caching and incremental parsing
 */
class HotReloadParser {
  constructor() {
    this.cache = new Map(); // File path -> { hash, ast, timestamp }
    this.watchers = new Map(); // File path -> watcher
    this.callbacks = new Map(); // File path -> Set of callbacks
    this.parseQueue = new Set(); // Files queued for parsing
    this.parsing = false;
    
    // Configuration
    this.config = {
      cacheSize: 100, // Maximum number of cached files
      debounceMs: 100, // Debounce file changes
      enableIncrementalParsing: true,
      enableCaching: true,
      watchOptions: {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: false,
        followSymlinks: false,
        cwd: process.cwd(),
        disableGlobbing: false,
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        alwaysStat: false,
        depth: 99,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 10,
        },
      },
    };
  }

  /**
   * Parse a file with caching and hot-reload support
   */
  async parseFile(filePath, options = {}) {
    const absolutePath = path.resolve(filePath);
    
    try {
      // Check cache first
      if (this.config.enableCaching && this.cache.has(absolutePath)) {
        const cached = this.cache.get(absolutePath);
        const stats = fs.statSync(absolutePath);
        
        // Check if file hasn't changed
        if (cached.timestamp >= stats.mtime.getTime()) {
          logger.debug(`Using cached AST for ${filePath}`);
          return {
            ast: cached.ast,
            validation: cached.validation,
            fromCache: true,
            filePath: absolutePath,
          };
        }
      }

      // Read and parse file
      const content = fs.readFileSync(absolutePath, 'utf8');
      const result = await this.parseContent(content, absolutePath, options);
      
      // Cache the result
      if (this.config.enableCaching) {
        this.cacheResult(absolutePath, result, content);
      }

      return {
        ...result,
        fromCache: false,
        filePath: absolutePath,
      };
    } catch (error) {
      logger.error(`Error parsing file ${filePath}:`, error.message);
      return {
        ast: null,
        validation: {
          valid: false,
          errors: [{
            message: `Failed to parse file: ${error.message}`,
            line: 1,
            column: 1,
            context: filePath,
          }],
          warnings: [],
        },
        fromCache: false,
        filePath: absolutePath,
      };
    }
  }

  /**
   * Parse content with incremental parsing support
   */
  async parseContent(content, filePath = null, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (this.config.enableIncrementalParsing && filePath) {
        result = await this.incrementalParse(content, filePath, options);
      } else {
        result = enhancedParser.parse(content);
      }

      const parseTime = Date.now() - startTime;
      logger.debug(`Parsed ${filePath || 'content'} in ${parseTime}ms`);

      return result;
    } catch (error) {
      logger.error('Parse error:', error.message);
      throw error;
    }
  }

  /**
   * Incremental parsing for large files
   */
  async incrementalParse(content, filePath, _options = {}) {
    // For now, use the enhanced parser directly
    // In a full implementation, this would analyze changes and parse only modified sections
    const result = enhancedParser.parse(content);
    
    // Add incremental parsing metadata
    result.parseMetadata = {
      incremental: false, // Would be true if we actually did incremental parsing
      sections: this.analyzeSections(content),
      parseTime: Date.now(),
    };

    return result;
  }

  /**
   * Analyze content sections for incremental parsing
   */
  analyzeSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    // const startLine = 0; // Not used in current implementation

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@agent')) {
        currentSection = { type: 'header', startLine: i, endLine: i };
        sections.push(currentSection);
      } else if (line.startsWith('description:')) {
        currentSection = { type: 'description', startLine: i, endLine: i };
        sections.push(currentSection);
      } else if (line.startsWith('trigger:')) {
        currentSection = { type: 'trigger', startLine: i };
      } else if (line.startsWith('secrets:')) {
        if (currentSection) currentSection.endLine = i - 1;
        currentSection = { type: 'secrets', startLine: i };
      } else if (line.startsWith('vars:')) {
        if (currentSection) currentSection.endLine = i - 1;
        currentSection = { type: 'vars', startLine: i };
      } else if (line.startsWith('steps:')) {
        if (currentSection) currentSection.endLine = i - 1;
        currentSection = { type: 'steps', startLine: i };
      } else if (line.startsWith('outputs:')) {
        if (currentSection) currentSection.endLine = i - 1;
        currentSection = { type: 'outputs', startLine: i };
      } else if (line === '@end') {
        if (currentSection) {
          currentSection.endLine = i;
          sections.push(currentSection);
        }
        break;
      }
    }

    return sections;
  }

  /**
   * Watch a file for changes and auto-reparse
   */
  watchFile(filePath, callback) {
    const absolutePath = path.resolve(filePath);
    
    if (!this.watchers.has(absolutePath)) {
      const watcher = chokidar.watch(absolutePath, this.config.watchOptions);
      
      watcher.on('change', (_path) => {
        this.handleFileChange(absolutePath);
      });
      
      watcher.on('error', (error) => {
        logger.error(`File watcher error for ${absolutePath}:`, error.message);
      });

      this.watchers.set(absolutePath, watcher);
      logger.debug(`Started watching ${absolutePath}`);
    }

    // Add callback
    if (!this.callbacks.has(absolutePath)) {
      this.callbacks.set(absolutePath, new Set());
    }
    this.callbacks.get(absolutePath).add(callback);

    return () => this.unwatchFile(absolutePath, callback);
  }

  /**
   * Stop watching a file
   */
  unwatchFile(filePath, callback = null) {
    const absolutePath = path.resolve(filePath);
    
    if (callback && this.callbacks.has(absolutePath)) {
      this.callbacks.get(absolutePath).delete(callback);
      
      // If no more callbacks, stop watching
      if (this.callbacks.get(absolutePath).size === 0) {
        this.callbacks.delete(absolutePath);
        
        if (this.watchers.has(absolutePath)) {
          this.watchers.get(absolutePath).close();
          this.watchers.delete(absolutePath);
          logger.debug(`Stopped watching ${absolutePath}`);
        }
      }
    } else {
      // Stop watching entirely
      if (this.watchers.has(absolutePath)) {
        this.watchers.get(absolutePath).close();
        this.watchers.delete(absolutePath);
      }
      this.callbacks.delete(absolutePath);
      logger.debug(`Stopped watching ${absolutePath}`);
    }
  }

  /**
   * Handle file change events
   */
  handleFileChange(filePath) {
    // Debounce rapid changes
    if (this.parseQueue.has(filePath)) {
      return;
    }

    this.parseQueue.add(filePath);
    
    setTimeout(async () => {
      this.parseQueue.delete(filePath);
      
      try {
        logger.debug(`File changed: ${filePath}`);
        
        // Invalidate cache
        this.cache.delete(filePath);
        
        // Re-parse file
        const result = await this.parseFile(filePath);
        
        // Notify callbacks
        if (this.callbacks.has(filePath)) {
          for (const callback of this.callbacks.get(filePath)) {
            try {
              callback(result, filePath);
            } catch (error) {
              logger.error(`Callback error for ${filePath}:`, error.message);
            }
          }
        }
      } catch (error) {
        logger.error(`Error handling file change for ${filePath}:`, error.message);
      }
    }, this.config.debounceMs);
  }

  /**
   * Cache parsing result
   */
  cacheResult(filePath, result, content) {
    // Implement LRU cache eviction
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    this.cache.set(filePath, {
      hash,
      ast: result.ast,
      validation: result.validation,
      timestamp: Date.now(),
      size: content.length,
    });

    logger.debug(`Cached result for ${filePath} (hash: ${hash.substring(0, 8)})`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0,
      files: [],
    };

    for (const [filePath, cached] of this.cache.entries()) {
      stats.files.push({
        path: filePath,
        hash: cached.hash.substring(0, 8),
        timestamp: new Date(cached.timestamp).toISOString(),
        size: cached.size,
      });
    }

    return stats;
  }

  /**
   * Clear cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Cleared cache (${size} entries)`);
  }

  /**
   * Watch a directory for agent files
   */
  watchDirectory(dirPath, callback, options = {}) {
    const absolutePath = path.resolve(dirPath);
    const pattern = options.pattern || '**/*.agent';
    const watchPath = path.join(absolutePath, pattern);
    
    const watcher = chokidar.watch(watchPath, {
      ...this.config.watchOptions,
      ...options,
    });

    watcher.on('add', async (filePath) => {
      logger.debug(`Agent file added: ${filePath}`);
      try {
        const result = await this.parseFile(filePath);
        callback('add', result, filePath);
      } catch (error) {
        logger.error(`Error parsing new file ${filePath}:`, error.message);
      }
    });

    watcher.on('change', async (filePath) => {
      logger.debug(`Agent file changed: ${filePath}`);
      try {
        const result = await this.parseFile(filePath);
        callback('change', result, filePath);
      } catch (error) {
        logger.error(`Error parsing changed file ${filePath}:`, error.message);
      }
    });

    watcher.on('unlink', (filePath) => {
      logger.debug(`Agent file removed: ${filePath}`);
      this.cache.delete(path.resolve(filePath));
      callback('remove', null, filePath);
    });

    watcher.on('error', (error) => {
      logger.error(`Directory watcher error for ${absolutePath}:`, error.message);
    });

    return () => watcher.close();
  }

  /**
   * Batch parse multiple files
   */
  async parseFiles(filePaths, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 5;
    
    // Process files in batches
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(filePath => this.parseFile(filePath, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        logger.error('Batch parsing error:', error.message);
        // Continue with remaining batches
      }
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Close all watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    
    this.watchers.clear();
    this.callbacks.clear();
    this.cache.clear();
    this.parseQueue.clear();
    
    logger.debug('Hot-reload parser destroyed');
  }

  /**
   * Configure parser options
   */
  configure(options) {
    this.config = { ...this.config, ...options };
    logger.debug('Hot-reload parser configured:', options);
  }
}

module.exports = new HotReloadParser();