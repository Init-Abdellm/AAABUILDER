/**
 * Model Registry (JavaScript Implementation)
 * Central registry for managing all model providers
 */

const { ModelProvider, ModelTypes, ModelCapabilities, TaskTypes } = require('./ModelProvider');

/**
 * Model Category Constants
 */
const ModelCategories = {
  LANGUAGE: 'language',
  VISION: 'vision',
  AUDIO: 'audio',
  MULTIMODAL: 'multimodal',
  TRADITIONAL_ML: 'traditional-ml',
  GENERATIVE: 'generative',
  SPECIALIZED: 'specialized'
};

/**
 * Model Registry Class
 * Central registry for managing all model providers
 */
class ModelRegistry {
  constructor(config = {}) {
    this.providers = new Map();
    this.modelCache = new Map();
    this.healthCache = new Map();
    
    this.config = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      maxConcurrentHealthChecks: 5,
      fallbackEnabled: true,
      ...config
    };

    this.healthCheckTimer = null;

    // Start health check timer if interval is set
    if (this.config.healthCheckInterval > 0) {
      this.startHealthChecks();
    }
  }

  /**
   * Register a model provider
   */
  register(provider, priority = 0, enabled = true) {
    if (!(provider instanceof ModelProvider)) {
      throw new Error('Provider must be an instance of ModelProvider');
    }

    const name = provider.getName();
    
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }

    const registration = {
      provider,
      priority,
      enabled,
      registeredAt: new Date()
    };

    this.providers.set(name, registration);
    
    // Clear cache for this provider
    this.clearProviderCache(name);
    
    // Initialize provider
    provider.initialize().catch(error => {
      console.warn(`Failed to initialize provider '${name}':`, error);
    });
  }

  /**
   * Unregister a model provider
   */
  unregister(providerName) {
    const registration = this.providers.get(providerName);
    if (!registration) {
      return false;
    }

    // Cleanup provider
    registration.provider.cleanup().catch(error => {
      console.warn(`Failed to cleanup provider '${providerName}':`, error);
    });

    this.providers.delete(providerName);
    this.clearProviderCache(providerName);
    
    return true;
  }

  /**
   * Get a specific provider by name
   */
  getProvider(providerName) {
    const registration = this.providers.get(providerName);
    return registration?.enabled ? registration.provider : null;
  }

  /**
   * Get provider for a specific model type
   */
  getProviderForType(modelType) {
    const providers = this.getEnabledProviders();
    
    // Sort by priority (higher priority first)
    providers.sort((a, b) => b.priority - a.priority);
    
    for (const registration of providers) {
      if (registration.provider.supports(modelType)) {
        return registration.provider;
      }
    }
    
    return null;
  }

  /**
   * Get all providers that support a specific model type
   */
  getProvidersForType(modelType) {
    const providers = this.getEnabledProviders();
    
    return providers
      .filter(registration => registration.provider.supports(modelType))
      .sort((a, b) => b.priority - a.priority)
      .map(registration => registration.provider);
  }

  /**
   * List all available models
   */
  async listModels(category = null) {
    const cacheKey = `models_${category || 'all'}`;
    
    // Check cache first
    if (this.config.enableCaching && this.modelCache.has(cacheKey)) {
      const cached = this.modelCache.get(cacheKey);
      return cached;
    }

    const allModels = [];
    const providers = this.getEnabledProviders();

    // Collect models from all providers
    const modelPromises = providers.map(async (registration) => {
      try {
        const models = await registration.provider.listModels();
        return models;
      } catch (error) {
        console.warn(`Failed to list models from provider '${registration.provider.getName()}':`, error);
        return [];
      }
    });

    const modelResults = await Promise.allSettled(modelPromises);
    
    modelResults.forEach(result => {
      if (result.status === 'fulfilled') {
        allModels.push(...result.value);
      }
    });

    // Filter by category if specified
    let filteredModels = allModels;
    if (category) {
      filteredModels = allModels.filter(model => this.getModelCategory(model.type) === category);
    }

    // Remove duplicates and sort
    const uniqueModels = this.deduplicateModels(filteredModels);
    uniqueModels.sort((a, b) => a.name.localeCompare(b.name));

    // Cache results
    if (this.config.enableCaching) {
      this.modelCache.set(cacheKey, uniqueModels);
      setTimeout(() => this.modelCache.delete(cacheKey), this.config.cacheTimeout);
    }

    return uniqueModels;
  }

  /**
   * Get model recommendations for a specific task
   */
  async recommendModel(task, constraints = {}) {
    const allModels = await this.listModels();
    const recommendations = [];

    for (const model of allModels) {
      const score = this.calculateRecommendationScore(model, task, constraints);
      if (score > 0) {
        recommendations.push({
          model,
          score,
          reason: this.getRecommendationReason(model, task, score),
          alternatives: []
        });
      }
    }

    // Sort by score (highest first) and limit results
    recommendations.sort((a, b) => b.score - a.score);
    
    // Add alternatives for top recommendations
    for (let i = 0; i < Math.min(3, recommendations.length); i++) {
      const main = recommendations[i];
      main.alternatives = recommendations
        .slice(i + 1, i + 4)
        .map(rec => rec.model);
    }

    return recommendations.slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const providers = Array.from(this.providers.values());
    const enabledProviders = providers.filter(p => p.enabled);
    
    return {
      totalProviders: providers.length,
      enabledProviders: enabledProviders.length,
      disabledProviders: providers.length - enabledProviders.length,
      cacheSize: this.modelCache.size,
      healthCacheSize: this.healthCache.size,
      lastHealthCheck: this.getLastHealthCheckTime()
    };
  }

  /**
   * Get health status of all providers
   */
  async getHealthStatus() {
    const providers = this.getEnabledProviders();
    const healthStatuses = [];

    // Limit concurrent health checks
    const chunks = this.chunkArray(providers, this.config.maxConcurrentHealthChecks);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(registration => 
        registration.provider.getHealthStatus()
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          healthStatuses.push(result.value);
          this.healthCache.set(chunk[index].provider.getName(), result.value);
        } else {
          const providerName = chunk[index].provider.getName();
          const errorStatus = {
            provider: providerName,
            status: 'error',
            timestamp: new Date(),
            details: 'Health check failed',
            error: result.reason
          };
          healthStatuses.push(errorStatus);
          this.healthCache.set(providerName, errorStatus);
        }
      });
    }

    return healthStatuses;
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(providerName, enabled) {
    const registration = this.providers.get(providerName);
    if (!registration) {
      return false;
    }

    registration.enabled = enabled;
    this.clearProviderCache(providerName);
    
    return true;
  }

  /**
   * Set provider priority
   */
  setProviderPriority(providerName, priority) {
    const registration = this.providers.get(providerName);
    if (!registration) {
      return false;
    }

    registration.priority = priority;
    return true;
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.modelCache.clear();
    this.healthCache.clear();
  }

  /**
   * Shutdown registry and cleanup resources
   */
  async shutdown() {
    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Cleanup all providers
    const cleanupPromises = Array.from(this.providers.values()).map(
      registration => registration.provider.cleanup()
    );

    await Promise.allSettled(cleanupPromises);
    
    // Clear all data
    this.providers.clear();
    this.clearCache();
  }

  // Private helper methods

  getEnabledProviders() {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  clearProviderCache(providerName) {
    // Clear model cache entries that might contain models from this provider
    this.modelCache.clear();
    this.healthCache.delete(providerName);
  }

  getModelCategory(modelType) {
    const categoryMap = {
      'LLM': ModelCategories.LANGUAGE,
      'SLM': ModelCategories.LANGUAGE,
      'MLM': ModelCategories.LANGUAGE,
      'Vision': ModelCategories.VISION,
      'ASR': ModelCategories.AUDIO,
      'TTS': ModelCategories.AUDIO,
      'RL': ModelCategories.SPECIALIZED,
      'GNN': ModelCategories.SPECIALIZED,
      'RNN': ModelCategories.TRADITIONAL_ML,
      'CNN': ModelCategories.TRADITIONAL_ML,
      'GAN': ModelCategories.GENERATIVE,
      'Diffusion': ModelCategories.GENERATIVE,
      'Transformer': ModelCategories.LANGUAGE,
      'MLP': ModelCategories.TRADITIONAL_ML,
      'Autoencoder': ModelCategories.TRADITIONAL_ML,
      'BERT': ModelCategories.LANGUAGE,
      'RAG': ModelCategories.SPECIALIZED,
      'Hybrid': ModelCategories.MULTIMODAL,
      'Foundation': ModelCategories.MULTIMODAL
    };

    return categoryMap[modelType] || ModelCategories.SPECIALIZED;
  }

  deduplicateModels(models) {
    const seen = new Set();
    return models.filter(model => {
      const key = `${model.provider}:${model.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  calculateRecommendationScore(model, task, constraints = {}) {
    let score = 0;

    // Base score for capability match
    if (model.capabilities.capabilities.includes(task)) {
      score += 50;
    }

    // Bonus for exact task match
    const taskCapabilityMap = {
      'text-generation': ['text-generation'],
      'text-completion': ['text-completion', 'text-generation'],
      'text-embedding': ['text-embedding'],
      'image-generation': ['image-generation'],
      'image-classification': ['image-classification'],
      'image-analysis': ['image-classification', 'object-detection', 'ocr'],
      'speech-to-text': ['speech-to-text'],
      'text-to-speech': ['text-to-speech'],
      'audio-analysis': ['speech-to-text', 'speaker-identification'],
      'code-generation': ['code-generation'],
      'code-completion': ['code-completion', 'code-generation'],
      'code-analysis': ['code-analysis'],
      'mathematical-reasoning': ['mathematical-reasoning'],
      'logical-reasoning': ['logical-reasoning'],
      'question-answering': ['text-generation', 'logical-reasoning'],
      'summarization': ['text-generation'],
      'translation': ['text-generation'],
      'sentiment-analysis': ['text-classification'],
      'classification': ['text-classification', 'image-classification'],
      'clustering': ['clustering'],
      'anomaly-detection': ['anomaly-detection'],
      'recommendation': ['recommendation'],
      'forecasting': ['time-series']
    };

    const relevantCapabilities = taskCapabilityMap[task] || [];
    const matchingCapabilities = model.capabilities.capabilities.filter(cap => 
      relevantCapabilities.includes(cap)
    );
    score += matchingCapabilities.length * 10;

    // Apply constraints
    if (constraints.maxCost && model.metadata.cost && model.metadata.cost > constraints.maxCost) {
      score *= 0.5;
    }
    if (constraints.minAccuracy && model.metadata.accuracy && model.metadata.accuracy < constraints.minAccuracy) {
      score *= 0.3;
    }
    if (constraints.maxLatency && model.metadata.latency && model.metadata.latency > constraints.maxLatency) {
      score *= 0.7;
    }

    // Bonus for availability
    if (model.available) {
      score += 10;
    }

    // Penalty for deprecated models
    if (model.deprecated) {
      score *= 0.2;
    }

    return Math.max(0, score);
  }

  getRecommendationReason(model, task, score) {
    if (score >= 60) {
      return `Excellent match for ${task} with strong capabilities`;
    } else if (score >= 40) {
      return `Good match for ${task} with relevant capabilities`;
    } else if (score >= 20) {
      return `Moderate match for ${task} with some relevant capabilities`;
    } else {
      return `Basic compatibility with ${task}`;
    }
  }

  startHealthChecks() {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        console.warn('Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  getLastHealthCheckTime() {
    let lastCheck = null;
    for (const status of this.healthCache.values()) {
      if (!lastCheck || status.timestamp > lastCheck) {
        lastCheck = status.timestamp;
      }
    }
    return lastCheck;
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = {
  ModelRegistry,
  ModelCategories
};