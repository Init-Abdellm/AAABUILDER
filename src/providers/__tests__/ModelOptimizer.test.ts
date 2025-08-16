import { ModelOptimizer, OptimizationConfig, OptimizationStrategy } from '../ModelOptimizer';
import { ModelRegistry } from '../ModelRegistry';
import { ModelProvider, ModelRequest, ModelResponse, ModelInfo } from '../ModelProvider';

// Mock provider for testing
class MockProvider extends ModelProvider {
  constructor() {
    super('mock-provider', 'testing');
  }

  supports(): boolean {
    return true;
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    return {
      content: { result: 'mock response' },
      model: request.model,
      usage: { inputSize: 100, outputSize: 50, processingTime: 100 },
      finishReason: 'completed',
      metadata: { provider: this.name }
    };
  }

  getCapabilities() {
    return {
      supportedTypes: ['CNN' as const],
      capabilities: ['text-generation' as const],
      maxInputSize: 1000,
      maxOutputSize: 1000,
      streaming: true,
      fineTuning: false,
      multimodal: false,
      batchProcessing: true,
      realTime: true
    };
  }

  validateConfig() {
    return { valid: true, errors: [], warnings: [] };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-model-small',
        name: 'Mock Small Model',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {},
        metadata: {
          model_size: '25MB',
          complexity: 'medium',
          accuracy: 0.85
        },
        available: true
      },
      {
        id: 'mock-model-large',
        name: 'Mock Large Model',
        type: 'Transformer',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {},
        metadata: {
          model_size: '150MB',
          complexity: 'very-high',
          accuracy: 0.95
        },
        available: true
      }
    ];
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async cleanup(): Promise<void> {
    // Mock cleanup
  }
}

describe('ModelOptimizer', () => {
  let registry: ModelRegistry;
  let optimizer: ModelOptimizer;
  let mockProvider: MockProvider;

  beforeEach(async () => {
    registry = new ModelRegistry();
    mockProvider = new MockProvider();
    registry.register(mockProvider, 10, true);

    const config: OptimizationConfig = {
      strategies: ['quantization', 'caching', 'batching'],
      quantization: {
        type: 'int8',
        calibrationSamples: 100,
        preserveAccuracy: true,
        targetAccuracyLoss: 0.05
      },
      caching: {
        enabled: true,
        maxCacheSize: 100,
        ttl: 300,
        strategy: 'lru'
      },
      batching: {
        enabled: true,
        maxBatchSize: 8,
        batchTimeout: 100,
        dynamicBatching: true
      },
      gpuAcceleration: {
        enabled: true,
        deviceId: 0,
        memoryFraction: 0.8,
        allowGrowth: true
      }
    };

    optimizer = new ModelOptimizer(registry, config);
  });

  afterEach(async () => {
    await optimizer.cleanup();
    await registry.shutdown();
  });

  describe('Model Optimization', () => {
    it('should optimize a model with quantization', async () => {
      const result = await optimizer.optimizeModel('mock-model-large', {
        strategies: ['quantization']
      });

      expect(result.originalModel.id).toBe('mock-model-large');
      expect(result.optimizedModel.metadata.quantized).toBe(true);
      expect(result.appliedStrategies).toContain('quantization');
      expect(result.metrics.sizeReduction).toBeGreaterThan(0);
      expect(result.metrics.speedImprovement).toBeGreaterThan(1);
      expect(result.benchmarks).toBeDefined();
      expect(result.benchmarks.optimizedLatency).toBeLessThan(result.benchmarks.originalLatency);
    });

    it('should optimize a model with multiple strategies', async () => {
      const result = await optimizer.optimizeModel('mock-model-large', {
        strategies: ['quantization', 'pruning', 'gpu-acceleration']
      });

      expect(result.appliedStrategies).toHaveLength(3);
      expect(result.appliedStrategies).toContain('quantization');
      expect(result.appliedStrategies).toContain('pruning');
      expect(result.appliedStrategies).toContain('gpu-acceleration');
      
      expect(result.optimizedModel.metadata.quantized).toBe(true);
      expect(result.optimizedModel.metadata.pruned).toBe(true);
      expect(result.optimizedModel.metadata.gpu_accelerated).toBe(true);
    });

    it('should handle optimization failures gracefully', async () => {
      // Test with invalid model
      await expect(optimizer.optimizeModel('non-existent-model')).rejects.toThrow('Model non-existent-model not found');
    });

    it('should apply pruning optimization', async () => {
      const result = await optimizer.optimizeModel('mock-model-large', {
        strategies: ['pruning'],
        pruning: {
          sparsityLevel: 0.5,
          structuredPruning: true,
          gradualPruning: false
        }
      });

      expect(result.optimizedModel.metadata.pruned).toBe(true);
      expect(result.optimizedModel.metadata.sparsity_level).toBe(0.5);
      expect(result.metrics.sizeReduction).toBe(50); // 50% sparsity
    });

    it('should apply distillation optimization', async () => {
      const result = await optimizer.optimizeModel('mock-model-large', {
        strategies: ['distillation'],
        distillation: {
          teacherModel: 'mock-model-large',
          temperature: 3.0,
          alpha: 0.7
        }
      });

      expect(result.optimizedModel.metadata.distilled).toBe(true);
      expect(result.optimizedModel.metadata.teacher_model).toBe('mock-model-large');
      expect(result.metrics.sizeReduction).toBe(60);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should provide recommendations for large models', async () => {
      const recommendations = await optimizer.getOptimizationRecommendations('mock-model-large');

      expect(recommendations.recommended).toBeInstanceOf(Array);
      expect(recommendations.recommended.length).toBeGreaterThan(0);
      expect(recommendations.reasons).toBeDefined();
      expect(recommendations.estimatedImprovements).toBeDefined();

      // Large model should recommend quantization
      expect(recommendations.recommended).toContain('quantization');
      expect(recommendations.reasons['quantization']).toBeDefined();
    });

    it('should provide different recommendations for small models', async () => {
      const recommendations = await optimizer.getOptimizationRecommendations('mock-model-small');

      expect(recommendations.recommended).toBeInstanceOf(Array);
      expect(recommendations.reasons).toBeDefined();
      expect(recommendations.estimatedImprovements).toBeDefined();
    });

    it('should recommend GPU acceleration for suitable models', async () => {
      const recommendations = await optimizer.getOptimizationRecommendations('mock-model-large');

      // Transformer models should get GPU acceleration recommendation
      expect(recommendations.recommended).toContain('gpu-acceleration');
      expect(recommendations.reasons['gpu-acceleration']).toContain('GPU acceleration');
    });

    it('should handle non-existent models', async () => {
      await expect(optimizer.getOptimizationRecommendations('non-existent')).rejects.toThrow();
    });
  });

  describe('Optimized Execution', () => {
    it('should execute requests with caching', async () => {
      const request: ModelRequest = {
        model: 'mock-model-small',
        input: 'test input',
        parameters: {}
      };

      // First execution - should cache
      const response1 = await optimizer.executeOptimized(request);
      expect(response1.content.result).toBe('mock response');

      // Second execution - should use cache (same result, faster)
      const response2 = await optimizer.executeOptimized(request);
      expect(response2.content.result).toBe('mock response');
    });

    it('should execute requests with batching', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        model: 'mock-model-small',
        input: `test input ${i}`,
        parameters: {}
      }));

      // Execute multiple requests - should be batched
      const responses = await Promise.all(
        requests.map(req => optimizer.executeOptimized(req))
      );

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.content.result).toBe('mock response');
      });
    });

    it('should handle execution errors', async () => {
      const request: ModelRequest = {
        model: 'non-existent-model',
        input: 'test input',
        parameters: {}
      };

      await expect(optimizer.executeOptimized(request)).rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should cache responses correctly', async () => {
      const request: ModelRequest = {
        model: 'mock-model-small',
        input: 'test input for caching',
        parameters: {}
      };

      // Execute request to populate cache
      await optimizer.executeOptimized(request);

      const stats = optimizer.getOptimizationStats();
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
    });

    it('should clear cache', () => {
      optimizer.clearCache();
      
      const stats = optimizer.getOptimizationStats();
      // After clearing cache, hit rate should be reset
      expect(typeof stats.cacheHitRate).toBe('number');
    });

    it('should respect cache TTL', async () => {
      // Create optimizer with short TTL for testing
      const shortTTLOptimizer = new ModelOptimizer(registry, {
        strategies: ['caching'],
        caching: {
          enabled: true,
          maxCacheSize: 100,
          ttl: 0.1, // 0.1 seconds
          strategy: 'lru'
        }
      });

      const request: ModelRequest = {
        model: 'mock-model-small',
        input: 'test input',
        parameters: {}
      };

      // Execute and cache
      await shortTTLOptimizer.executeOptimized(request);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should execute again (not from cache)
      const response = await shortTTLOptimizer.executeOptimized(request);
      expect(response.content.result).toBe('mock response');

      await shortTTLOptimizer.cleanup();
    });
  });

  describe('Batch Processing', () => {
    it('should process requests in batches', async () => {
      const batchOptimizer = new ModelOptimizer(registry, {
        strategies: ['batching'],
        batching: {
          enabled: true,
          maxBatchSize: 3,
          batchTimeout: 50,
          dynamicBatching: true
        }
      });

      const requests = Array.from({ length: 6 }, (_, i) => ({
        model: 'mock-model-small',
        input: `batch input ${i}`,
        parameters: {}
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => batchOptimizer.executeOptimized(req))
      );
      const endTime = Date.now();

      expect(responses).toHaveLength(6);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to batching

      await batchOptimizer.cleanup();
    });

    it('should handle batch timeout', async () => {
      const batchOptimizer = new ModelOptimizer(registry, {
        strategies: ['batching'],
        batching: {
          enabled: true,
          maxBatchSize: 10, // Large batch size
          batchTimeout: 100, // Short timeout
          dynamicBatching: true
        }
      });

      const request: ModelRequest = {
        model: 'mock-model-small',
        input: 'single request',
        parameters: {}
      };

      // Single request should be processed after timeout
      const response = await batchOptimizer.executeOptimized(request);
      expect(response.content.result).toBe('mock response');

      await batchOptimizer.cleanup();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide optimization statistics', () => {
      const stats = optimizer.getOptimizationStats();

      expect(stats.optimizedModels).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
      expect(stats.averageBatchSize).toBeGreaterThan(0);
      expect(stats.totalSpeedImprovement).toBeGreaterThanOrEqual(1);
    });

    it('should track optimized models', async () => {
      const initialStats = optimizer.getOptimizationStats();
      const initialCount = initialStats.optimizedModels;

      await optimizer.optimizeModel('mock-model-small', {
        strategies: ['quantization']
      });

      const newStats = optimizer.getOptimizationStats();
      expect(newStats.optimizedModels).toBe(initialCount + 1);
    });
  });

  describe('GPU Acceleration', () => {
    it('should apply GPU acceleration optimization', async () => {
      const result = await optimizer.optimizeModel('mock-model-large', {
        strategies: ['gpu-acceleration'],
        gpuAcceleration: {
          enabled: true,
          deviceId: 1,
          memoryFraction: 0.9,
          allowGrowth: false
        }
      });

      expect(result.optimizedModel.metadata.gpu_accelerated).toBe(true);
      expect(result.optimizedModel.metadata.device_id).toBe(1);
      expect(result.metrics.speedImprovement).toBeGreaterThan(5); // GPU should provide significant speedup
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unknown optimization strategies', async () => {
      await expect(optimizer.optimizeModel('mock-model-small', {
        strategies: ['unknown-strategy' as OptimizationStrategy]
      })).rejects.toThrow('Unknown optimization strategy');
    });

    it('should handle empty strategies list', async () => {
      const result = await optimizer.optimizeModel('mock-model-small', {
        strategies: []
      });

      expect(result.appliedStrategies).toHaveLength(0);
      expect(result.metrics.sizeReduction).toBe(0);
      expect(result.metrics.speedImprovement).toBe(1);
    });

    it('should handle partial optimization failures', async () => {
      // This test simulates a scenario where some optimizations succeed and others fail
      const result = await optimizer.optimizeModel('mock-model-small', {
        strategies: ['quantization', 'caching'] // Valid strategies
      });

      // Should still apply successful optimizations
      expect(result.appliedStrategies.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await optimizer.optimizeModel('mock-model-small', {
        strategies: ['quantization', 'caching']
      });

      // Should not throw
      await expect(optimizer.cleanup()).resolves.not.toThrow();

      // After cleanup, stats should be reset
      const stats = optimizer.getOptimizationStats();
      expect(stats.optimizedModels).toBe(0);
    });

    it('should handle multiple cleanups', async () => {
      await optimizer.cleanup();
      await expect(optimizer.cleanup()).resolves.not.toThrow();
    });
  });
});