const { BasePlugin } = require('../lib/plugins/plugin-manager');

class AnalyticsPlugin extends BasePlugin {
  constructor() {
    super();
    this.metrics = {
      executions: 0,
      successRate: 0,
      avgDuration: 0,
      agentUsage: new Map(),
      errors: []
    };
  }

  getInfo() {
    return {
      name: 'analytics',
      version: '1.0.0',
      description: 'Execution analytics and performance monitoring',
      author: 'INIT-ABDELLM'
    };
  }

  async initialize(pluginManager) {
    await super.initialize(pluginManager);
    
    // Register hooks for analytics
    pluginManager.registerHook('before_execution', this.beforeExecution.bind(this));
    pluginManager.registerHook('after_execution', this.afterExecution.bind(this));
    pluginManager.registerHook('execution_error', this.onExecutionError.bind(this));
  }

  async beforeExecution(context) {
    context.startTime = Date.now();
    context.analytics = {
      sessionId: this.generateSessionId(),
      agentId: context.ast.id,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.executions++;
    
    // Update agent usage
    const agentId = context.ast.id;
    const usage = this.metrics.agentUsage.get(agentId) || { count: 0, totalTime: 0 };
    usage.count++;
    this.metrics.agentUsage.set(agentId, usage);
    
    return context;
  }

  async afterExecution(context) {
    const duration = Date.now() - context.startTime;
    
    // Update metrics
    const agentId = context.ast.id;
    const usage = this.metrics.agentUsage.get(agentId);
    usage.totalTime += duration;
    usage.avgTime = usage.totalTime / usage.count;
    
    // Update global average
    this.updateAverageDuration(duration);
    
    // Update success rate
    this.updateSuccessRate(true);
    
    return context;
  }

  async onExecutionError(context) {
    const duration = Date.now() - context.startTime;
    
    this.metrics.errors.push({
      agentId: context.ast.id,
      error: context.error.message,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
    
    this.updateSuccessRate(false);
    
    return context;
  }

  updateAverageDuration(newDuration) {
    const total = this.metrics.avgDuration * (this.metrics.executions - 1) + newDuration;
    this.metrics.avgDuration = total / this.metrics.executions;
  }

  updateSuccessRate(success) {
    const successful = Math.round(this.metrics.successRate * (this.metrics.executions - 1) / 100);
    const newSuccessful = successful + (success ? 1 : 0);
    this.metrics.successRate = (newSuccessful / this.metrics.executions) * 100;
  }

  getMetrics() {
    return {
      ...this.metrics,
      topAgents: Array.from(this.metrics.agentUsage.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, usage]) => ({ id, ...usage })),
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  getAgentMetrics(agentId) {
    return this.metrics.agentUsage.get(agentId) || null;
  }

  generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
  }

  resetMetrics() {
    this.metrics = {
      executions: 0,
      successRate: 0,
      avgDuration: 0,
      agentUsage: new Map(),
      errors: []
    };
  }
}

module.exports = AnalyticsPlugin;