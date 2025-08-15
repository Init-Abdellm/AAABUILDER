const fs = require('fs');
const path = require('path');
const console = require('../utils/console');

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.middlewares = [];
  }

  async loadPlugins(pluginsDir = './plugins') {
    console.section('Loading Plugins');
    
    if (!fs.existsSync(pluginsDir)) {
      console.warn(`Plugins directory not found: ${pluginsDir}`);
      return;
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.plugin.js'));

    for (const file of pluginFiles) {
      try {
        const pluginPath = path.join(pluginsDir, file);
        const PluginClass = require(path.resolve(pluginPath));
        
        const plugin = new PluginClass();
        const info = plugin.getInfo();
        
        // Validate plugin
        if (!info.name || !info.version) {
          console.error(`Invalid plugin: ${file} - missing name or version`);
          continue;
        }

        // Initialize plugin
        await plugin.initialize(this);
        
        this.plugins.set(info.name, {
          instance: plugin,
          info,
          file: pluginPath,
        });
        
        console.success(`Loaded plugin: ${info.name} v${info.version}`);
      } catch (error) {
        console.error(`Failed to load plugin ${file}: ${error.message}`);
      }
    }
    
    console.info(`Total plugins loaded: ${this.plugins.size}`);
    console.endSection();
  }

  registerHook(name, callback) {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name).push(callback);
  }

  async executeHook(name, data) {
    const callbacks = this.hooks.get(name) || [];
    let result = data;
    
    for (const callback of callbacks) {
      try {
        result = await callback(result);
      } catch (error) {
        console.error(`Hook '${name}' failed: ${error.message}`);
      }
    }
    
    return result;
  }

  registerMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  async executeMiddlewares(context) {
    let result = context;
    
    for (const middleware of this.middlewares) {
      try {
        result = await middleware(result);
      } catch (error) {
        console.error(`Middleware failed: ${error.message}`);
      }
    }
    
    return result;
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      ...plugin.info,
    }));
  }

  async unloadPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (plugin.instance.cleanup) {
      await plugin.instance.cleanup();
    }

    this.plugins.delete(name);
    console.success(`Unloaded plugin: ${name}`);
  }
}

// Base plugin class
class BasePlugin {
  getInfo() {
    return {
      name: 'base-plugin',
      version: '1.0.0',
      description: 'Base plugin class',
      author: 'AAAB Framework',
    };
  }

  async initialize(pluginManager) {
    this.pluginManager = pluginManager;
  }

  async cleanup() {
    // Override in subclasses
  }
}

module.exports = { PluginManager, BasePlugin };