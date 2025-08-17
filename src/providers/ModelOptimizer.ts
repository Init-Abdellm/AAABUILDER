import { ModelInfo, ModelRequest, ModelResponse } from './ModelProvider';
import { ModelRegistry } from './ModelRegistry';

/**
 * Model Optimization Strategies
 */
export type OptimizationStrategy = 
  | 'quantization' 
  | 'pruning' 
  | 'distillation' 
  | 'caching' 
  | 'batching'
  | 'gpu-acceleration';

/**
 * Quantization Types
 */
export type QuantizationType = 
  | 'int8' 
  | 'int16' 
  | 'fp16' 
  | 'dynamic';

/**
 * Optimization Configuration
 */
export interface OptimizationConfig {
  strategies: OptimizationStrategy[];
  quantization?: {
    type: QuantizationType;
    calibrationSamples?: number;
    preserveAccuracy?: boolean;
    targetAccuracyLoss?: number; // Maximum acceptable accuracy loss (0-1)
  };
  pruning?: {
    sparsityLevel: number; // 0-1, percentage of weights to prune
    structuredPruning?: boolean;
    gradualPruning?: boolean;
  };
  distillation?: {
    teacherModel: string;
    temperature: number;
    alpha: number; // Balance between hard and soft targets
  };
  caching?: {
    enabled: boolean;
    maxCacheSize: number; // MB
    ttl: number; // Time to live in seconds
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  batching?: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeout: number; // ms
    dynamicBatching?: boolean;
  };
  gpuAcceleration?: {
    enabled: boolean;
    deviceId?: number;
    memoryFraction?: number; // 0-1
    allowGrowth?: boolean;
  };
}

/**
 * Optimization Result
 */
export interface OptimizationResult {
  originalModel: ModelInfo;
  optimizedModel: ModelInfo;
  appliedStrategies: OptimizationStrategy[];
  metrics: {
    sizeReduction: number; // Percentage
    speedImprovement: number; // Multiplier (e.g., 2.5x faster)
    accuracyLoss: number; // Percentage
    memoryReduction: number; // Percentage
  };
  benchmarks: {
    originalLatency: number; // ms
    optimizedLatency: number; // ms
    originalThroughput: number; // requests/sec
    optimizedThroughput: number; // requests/sec
    originalMemoryUsage: number; // MB
    optimizedMemoryUsage: number; // MB
  };
}

/**
 * Model Cache Entry
 */
interface CacheEntry {
  key: string;
  response: ModelResponse;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Batch Request Entry
 */
interface BatchEntry {
  request: ModelRequest;
  resolve: (response: ModelResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Model Optimization Framework
 */
export class ModelOptimizer {
  private registry: ModelRegistry;
  private optimizedModels: Map<string, any> = new Map();
  private modelCache: Map<string, CacheEntry> = new Map();
  private batchQueues: Map<string, BatchEntry[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: OptimizationConfig;

  constructor(registry: ModelRegistry, config: OptimizationConfig) {
    this.registry = registry;
    this.config = config;
    
    // Initialize cache cleanup if caching is enabled
    if (this.config.caching?.enabled) {
      this.startCacheCleanup();
    }
  }

  /**
   * Optimize a model with specified strategies
   */
  async optimizeModel(modelId: string, config?: Partial<OptimizationConfig>): Promise<OptimizationResult> {
    const finalConfig = { ...this.config, ...config };
    const originalModel = await this.getModelInfo(modelId);
    
    if (!originalModel) {
      throw new Error(`Model ${modelId} not found`);
    }

    console.log(`🔧 Optimizing model: ${originalModel.name}`);
    
    let optimizedModel = { ...originalModel };
    const appliedStrategies: OptimizationStrategy[] = [];
    const metrics = {
      sizeReduction: 0,
      speedImprovement: 1,
      accuracyLoss: 0,
      memoryReduction: 0
    };

    // Apply optimization strategies
    for (const strategy of finalConfig.strategies) {
      try {
        const result = await this.applyOptimizationStrategy(
          optimizedModel, 
          strategy, 
          finalConfig
        );
        
        optimizedModel = result.model;
        appliedStrategies.push(strategy);
        
        // Accumulate metrics
        metrics.sizeReduction += result.metrics.sizeReduction;
        metrics.speedImprovement *= result.metrics.speedImprovement;
        metrics.accuracyLoss += result.metrics.accuracyLoss;
        metrics.memoryReduction += result.metrics.memoryReduction;
        
        console.log(`✅ Applied ${strategy} optimization`);
      } catch (error) {
        console.warn(`⚠️ Failed to apply ${strategy} optimization:`, error);
      }
    }

    // Run benchmarks
    const benchmarks = await this.benchmarkModel(originalModel, optimizedModel);

    // Store optimized model
    this.optimizedModels.set(modelId, optimizedModel);

    const result: OptimizationResult = {
      originalModel,
      optimizedModel,
      appliedStrategies,
      metrics,
      benchmarks
    };

    console.log(`🎉 Model optimization complete: ${appliedStrategies.length} strategies applied`);
    return result;
  }

  /**
   * Execute request with optimizations
   */
  async executeOptimized(request: ModelRequest): Promise<ModelResponse> {
    // Check cache first
    if (this.config.caching?.enabled) {
      const cached = this.getCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    // Use batching if enabled
    if (this.config.batching?.enabled) {
      return this.executeBatched(request);
    }

    // Execute normally with optimizations
    return this.executeWithOptimizations(request);
  }

  /**
   * Get optimization recommendations for a model
   */
  async getOptimizationRecommendations(modelId: string): Promise<{
    recommended: OptimizationStrategy[];
    reasons: Record<OptimizationStrategy, string>;
    estimatedImprovements: Record<OptimizationStrategy, any>;
  }> {
    const model = await this.getModelInfo(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const recommended: OptimizationStrategy[] = [];
    const reasons: Record<OptimizationStrategy, string> = {
      quantization: '',
      pruning: '',
      distillation: '',
      caching: '',
      batching: '',
      'gpu-acceleration': ''
    };
    const estimatedImprovements: Record<OptimizationStrategy, any> = {
      quantization: undefined,
      pruning: undefined,
      distillation: undefined,
      caching: undefined,
      batching: undefined,
      'gpu-acceleration': undefined
    };

    // Analyze model characteristics
    const modelSize = this.parseModelSize(model.metadata['model_size']);
    const complexity = model.metadata['complexity'];
    const modelType = model.type;

    // Quantization recommendations
    if (modelSize > 50 || complexity === 'high' || complexity === 'very-high') {
      recommended.push('quantization');
      reasons['quantization'] = 'Large model size or high complexity benefits from quantization';
      estimatedImprovements['quantization'] = {
        sizeReduction: '25-50%',
        speedImprovement: '1.5-3x',
        accuracyLoss: '1-5%'
      };
    }

    // GPU acceleration recommendations
    if (['CNN', 'Transformer', 'GAN'].includes(modelType)) {
      recommended.push('gpu-acceleration');
      reasons['gpu-acceleration'] = 'Model type benefits significantly from GPU acceleration';
      estimatedImprovements['gpu-acceleration'] = {
        speedImprovement: '5-20x',
        memoryEfficiency: 'Better for large batches'
      };
    }

    // Caching recommendations
    if (model.capabilities['streaming'] || model.capabilities['realTime']) {
      recommended.push('caching');
      reasons['caching'] = 'Real-time models benefit from response caching';
      estimatedImprovements['caching'] = {
        latencyReduction: '90-99%',
        throughputIncrease: '10-100x'
      };
    }

    // Batching recommendations
    if (model.capabilities['batchProcessing']) {
      recommended.push('batching');
      reasons['batching'] = 'Model supports batch processing for improved throughput';
      estimatedImprovements['batching'] = {
        throughputIncrease: '2-10x',
        costReduction: '30-70%'
      };
    }

    // Pruning recommendations for large models
    if (modelSize > 100) {
      recommended.push('pruning');
      reasons['pruning'] = 'Very large model can benefit from weight pruning';
      estimatedImprovements['pruning'] = {
        sizeReduction: '30-80%',
        speedImprovement: '1.2-2x',
        accuracyLoss: '2-10%'
      };
    }

    return { recommended, reasons, estimatedImprovements };
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    optimizedModels: number;
    cacheHitRate: number;
    averageBatchSize: number;
    totalSpeedImprovement: number;
  } {
    const cacheStats = this.getCacheStats();
    
    return {
      optimizedModels: this.optimizedModels.size,
      cacheHitRate: cacheStats.hitRate,
      averageBatchSize: this.getAverageBatchSize(),
      totalSpeedImprovement: this.calculateTotalSpeedImprovement()
    };
  }

  /**
   * Clear optimization cache
   */
  clearCache(): void {
    this.modelCache.clear();
    console.log('🧹 Optimization cache cleared');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Clear caches
    this.modelCache.clear();
    this.optimizedModels.clear();
    this.batchQueues.clear();

    console.log('✅ Model optimizer cleanup complete');
  }

  // Private helper methods

  private async applyOptimizationStrategy(
    model: ModelInfo, 
    strategy: OptimizationStrategy, 
    config: OptimizationConfig
  ): Promise<{ model: ModelInfo; metrics: any }> {
    switch (strategy) {
      case 'quantization':
        return this.applyQuantization(model, config.quantization!);
      case 'pruning':
        return this.applyPruning(model, config.pruning!);
      case 'distillation':
        return this.applyDistillation(model, config.distillation!);
      case 'caching':
        return this.applyCaching(model, config.caching!);
      case 'batching':
        return this.applyBatching(model, config.batching!);
      case 'gpu-acceleration':
        return this.applyGPUAcceleration(model, config.gpuAcceleration!);
      default:
        throw new Error(`Unknown optimization strategy: ${strategy}`);
    }
  }

  private async applyQuantization(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // Mock quantization implementation
    const quantizedModel = { ...model };
    quantizedModel.metadata = { 
      ...model.metadata, 
      quantized: true,
      quantization_type: config.type,
      model_size: this.reduceModelSize(model.metadata['model_size'], 0.4) // 40% reduction
    };

    return {
      model: quantizedModel,
      metrics: {
        sizeReduction: 40,
        speedImprovement: 2.1,
        accuracyLoss: 2.5,
        memoryReduction: 35
      }
    };
  }

  private async applyPruning(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // Mock pruning implementation
    const prunedModel = { ...model };
    const reductionFactor = config.sparsityLevel;
    
    prunedModel.metadata = { 
      ...model.metadata, 
      pruned: true,
      sparsity_level: config.sparsityLevel,
      model_size: this.reduceModelSize(model.metadata['model_size'], reductionFactor)
    };

    return {
      model: prunedModel,
      metrics: {
        sizeReduction: reductionFactor * 100,
        speedImprovement: 1 + (reductionFactor * 0.8),
        accuracyLoss: reductionFactor * 8, // Pruning can have higher accuracy loss
        memoryReduction: reductionFactor * 90
      }
    };
  }

  private async applyDistillation(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // Mock distillation implementation
    const distilledModel = { ...model };
    distilledModel.metadata = { 
      ...model.metadata, 
      distilled: true,
      teacher_model: config.teacherModel,
      model_size: this.reduceModelSize(model.metadata['model_size'], 0.6) // 60% reduction
    };

    return {
      model: distilledModel,
      metrics: {
        sizeReduction: 60,
        speedImprovement: 3.2,
        accuracyLoss: 3.8,
        memoryReduction: 55
      }
    };
  }

  private async applyCaching(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // Caching doesn't change the model itself, just enables caching
    const cachedModel = { ...model };
    cachedModel.metadata = { 
      ...model.metadata, 
      caching_enabled: true,
      cache_strategy: config.strategy
    };

    return {
      model: cachedModel,
      metrics: {
        sizeReduction: 0,
        speedImprovement: 10, // Huge improvement for cache hits
        accuracyLoss: 0,
        memoryReduction: 0
      }
    };
  }

  private async applyBatching(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // Batching doesn't change the model, just enables batch processing
    const batchedModel = { ...model };
    batchedModel.metadata = { 
      ...model.metadata, 
      batching_enabled: true,
      max_batch_size: config.maxBatchSize
    };

    return {
      model: batchedModel,
      metrics: {
        sizeReduction: 0,
        speedImprovement: config.maxBatchSize * 0.7, // Throughput improvement
        accuracyLoss: 0,
        memoryReduction: 0
      }
    };
  }

  private async applyGPUAcceleration(model: ModelInfo, config: any): Promise<{ model: ModelInfo; metrics: any }> {
    // GPU acceleration doesn't change the model, just enables GPU usage
    const gpuModel = { ...model };
    gpuModel.metadata = { 
      ...model.metadata, 
      gpu_accelerated: true,
      device_id: config.deviceId || 0
    };

    return {
      model: gpuModel,
      metrics: {
        sizeReduction: 0,
        speedImprovement: 8.5, // Significant GPU speedup
        accuracyLoss: 0,
        memoryReduction: 0
      }
    };
  }

  private async benchmarkModel(_original: ModelInfo, _optimized: ModelInfo): Promise<any> {
    // Mock benchmarking - in real implementation, this would run actual performance tests
    const baseLatency = 100; // ms
    const baseThroughput = 10; // requests/sec
    const baseMemory = 500; // MB

    return {
      originalLatency: baseLatency,
      optimizedLatency: baseLatency * 0.4, // 60% faster
      originalThroughput: baseThroughput,
      optimizedThroughput: baseThroughput * 2.5,
      originalMemoryUsage: baseMemory,
      optimizedMemoryUsage: baseMemory * 0.7 // 30% less memory
    };
  }

  private getCachedResponse(request: ModelRequest): ModelResponse | null {
    const caching = this.config.caching;
    if (!caching?.enabled) return null;

    const cacheKey = this.generateCacheKey(request);
    const entry = this.modelCache.get(cacheKey);

    if (!entry) return null;

    // Check TTL
    const now = Date.now();
    const ttlMs = (caching?.ttl ?? 0) * 1000;
    if (ttlMs > 0 && now - entry.timestamp > ttlMs) {
      this.modelCache.delete(cacheKey);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.response;
  }

  private async executeBatched(request: ModelRequest): Promise<ModelResponse> {
    return new Promise((resolve, reject) => {
      const modelId = request.model;
      if (!modelId) {
        reject(new Error("Missing request.model for batching"));
        return;
      }

      if (!this.batchQueues.has(modelId)) {
        this.batchQueues.set(modelId, []);
      }

      const queue = this.batchQueues.get(modelId)!;
      queue.push({ request, resolve, reject, timestamp: Date.now() });

      // Process batch if it's full or set timer
      if (queue.length >= (this.config.batching?.maxBatchSize || 10)) {
        this.processBatch(modelId);
      } else if (!this.batchTimers.has(modelId)) {
        const timer = setTimeout(() => {
          this.processBatch(modelId);
        }, this.config.batching?.batchTimeout || 100);

        this.batchTimers.set(modelId, timer);
      }
    });
  }

  private async processBatch(modelId: string): Promise<void> {
    const queue = this.batchQueues.get(modelId);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(modelId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(modelId);
    }

    // Process all requests in batch
    const batch = queue.splice(0);

    try {
      const responses = await Promise.all(
        batch.map((entry) => this.executeWithOptimizations(entry.request))
      );

      // Resolve all promises
      batch.forEach((entry, index) => {
        entry.resolve(responses[index]!);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach((entry) => {
        entry.reject(error instanceof Error ? error : new Error('Batch processing failed'));
      });
    }
  }

  private async executeWithOptimizations(request: ModelRequest): Promise<ModelResponse> {
    // Get the appropriate provider and execute
    const models = await this.registry.listModels();
    const targetModel = models.find((m) => m.id === request.model);

    if (!targetModel) {
      throw new Error(`Model '${request.model}' not found`);
    }

    const provider = this.registry.getProvider(targetModel.provider);
    if (!provider) {
      throw new Error(`Provider '${targetModel.provider}' not found`);
    }

    const response = await provider.execute(request);

    // Cache the response if caching is enabled
    if (this.config.caching?.enabled) {
      this.cacheResponse(request, response);
    }

    return response;
  }

  private cacheResponse(request: ModelRequest, response: ModelResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const entry: CacheEntry = {
      key: cacheKey,
      response,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.modelCache.set(cacheKey, entry);

    // Enforce cache size limit
    this.enforceCacheLimit();
  }

  private generateCacheKey(request: ModelRequest): string {
    // Create a hash of the request for caching
    const keyData = {
      model: request.model,
      input: typeof request.input === 'string' ? request.input : JSON.stringify(request.input),
      parameters: JSON.stringify(request.parameters || {}),
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private enforceCacheLimit(): void {
    const caching = this.config.caching;
    const maxSize = caching?.maxCacheSize || 100; // MB
    const currentSize = this.modelCache.size * 0.1; // Rough estimate

    if (currentSize > maxSize) {
      // Remove entries based on strategy
      const strategy = caching?.strategy || 'lru';
      const entries = Array.from(this.modelCache.entries());

      if (strategy === 'lru') {
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      } else if (strategy === 'lfu') {
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      } else if (strategy === 'fifo') {
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      }

      // Remove oldest 25% of entries
      const toRemove = Math.floor(entries.length * 0.25);
      entries.slice(0, toRemove).forEach(([key]) => {
        this.modelCache.delete(key);
      });
    }
  }

  private getCacheStats(): { hitRate: number; size: number } {
    // This would track actual cache hits/misses in a real implementation
    return {
      hitRate: Math.random() * 0.4 + 0.3, // Mock 30-70% hit rate
      size: this.modelCache.size,
    };
  }

  private getAverageBatchSize(): number {
    // Mock average batch size calculation
    return Math.random() * 5 + 3; // 3-8 average batch size
  }

  private calculateTotalSpeedImprovement(): number {
    // Calculate overall speed improvement from all optimizations
    let totalImprovement = 1;
    for (const model of this.optimizedModels.values()) {
      if (model.metadata['quantized']) totalImprovement *= 2.1;
      if (model.metadata['pruned']) totalImprovement *= 1.5;
      if (model.metadata['gpu_accelerated']) totalImprovement *= 8.5;
      if (model.metadata['caching_enabled']) totalImprovement *= 5;
    }
    return totalImprovement;
  }

  private async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.registry.listModels();
    return models.find((m) => m.id === modelId) || null;
  }

  private parseModelSize(sizeStr?: string): number {
    // Parse model size strings like "25MB", "1.2 GB", "900KB", "0.5TB" to MB
    if (!sizeStr) return 0;
    const match = String(sizeStr).trim().match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)/i);
    if (!match) return 0;

    const [, valueStr, unitRaw] = match;
    if (!valueStr) return 0;
    const value = parseFloat(valueStr);
    const unit = (unitRaw || 'MB').toUpperCase();
    if (Number.isNaN(value)) return 0;

    switch (unit) {
      case 'B':
        return value / (1024 * 1024);
      case 'KB':
        return value / 1024;
      case 'MB':
        return value;
      case 'GB':
        return value * 1024;
      case 'TB':
        return value * 1024 * 1024;
      default:
        return value;
    }
  }

  private reduceModelSize(originalSize: string | undefined, reductionFactor: number): string {
    // Ensure reductionFactor is between 0 and <1
    const safeReduction = Math.max(0, Math.min(0.99, reductionFactor ?? 0));

    const sizeInMB = this.parseModelSize(originalSize);
    if (sizeInMB <= 0) {
      // Fallback: cannot parse, return original as-is
      return originalSize ?? '0MB';
    }

    const newSizeInMB = sizeInMB * (1 - safeReduction);
    // Guard against underflow and ensure a sensible minimum
    const clampedMB = Math.max(newSizeInMB, 0.1 / 1024); // minimum 0.1KB in MB

    return this.formatSizeFromMB(clampedMB);
  }

  private formatSizeFromMB(sizeInMB: number): string {
    // Formats a size in MB to the most suitable unit (MB, GB, TB) with 1 decimal precision
    if (!Number.isFinite(sizeInMB) || sizeInMB <= 0) return '0MB';
    if (sizeInMB >= 1024 * 1024) {
      return `${(sizeInMB / (1024 * 1024)).toFixed(1)}TB`;
    }
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)}GB`;
    }
    if (sizeInMB < 1) {
      // show in KB if less than 1MB
      return `${(sizeInMB * 1024).toFixed(1)}KB`;
    }
    return `${sizeInMB.toFixed(1)}MB`;
  }

  private startCacheCleanup(): void {
    // Periodic cache cleanup every 5 minutes
    setInterval(() => {
      this.enforceCacheLimit();
    }, 5 * 60 * 1000);
  }
}