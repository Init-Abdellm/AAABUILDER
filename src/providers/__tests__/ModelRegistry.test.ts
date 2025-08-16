import { ModelRegistry, ModelCategory } from '../ModelRegistry';
import { 
  ModelProvider, 
  ModelRequest, 
  ModelResponse, 
  ModelCapabilities, 
  ModelInfo, 
  ValidationResult,
  ModelConfig,
  TaskType
} from '../ModelProvider';
import { ModelType } from '../../types/global';

// Mock providers for testing
class MockLLMProvider extends ModelProvider {
  constructor(name: string = 'mock-llm') {
    super(name, 'llm', { apiKey: 'test-key' });
  }

  supports(modelType: ModelType): boolean {
    return modelType === 'LLM';
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    return {
      content: `LLM response: ${request.input}`,
      model: request.model,
      usage: { totalTokens: 100 }
    };
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['LLM'],
      capabilities: ['text-generation', 'code-generation'],
      streaming: true,
      fineTuning: true,
      multimodal: false,
      batchProcessing: true
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-gpt-4',
        name: 'Mock GPT-4',
        type: 'LLM',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: { maxTokens: 4096 },
        metadata: { version: '1.0.0', cost: 0.03 },
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
}

class MockVisionProvider extends ModelProvider {
  constructor(name: string = 'mock-vision') {
    super(name, 'vision', { apiKey: 'test-key' });
  }

  supports(modelType: ModelType): boolean {
    return modelType === 'Vision';
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    return {
      content: `Vision response: ${request.input}`,
      model: request.model,
      usage: { totalTokens: 50 }
    };
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['Vision'],
      capabilities: ['image-classification', 'object-detection'],
      streaming: false,
      fineTuning: false,
      multimodal: true,
      batchProcessing: true
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-vision-model',
        name: 'Mock Vision Model',
        type: 'Vision',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {},
        metadata: { version: '1.0.0', accuracy: 0.95 },
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
}

class UnavailableProvider extends ModelProvider {
  constructor() {
    super('unavailable-provider', 'test');
  }

  supports(modelType: ModelType): boolean {
    return false;
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    throw new Error('Provider unavailable');
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: [],
      capabilities: [],
      streaming: false,
      fineTuning: false,
      multimodal: false,
      batchProcessing: false
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    return {
      valid: false,
      errors: [{ field: 'provider', message: 'Provider unavailable', code: 'UNAVAILABLE' }],
      warnings: []
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    throw new Error('Provider unavailable');
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  let llmProvider: MockLLMProvider;
  let visionProvider: MockVisionProvider;

  beforeEach(() => {
    registry = new ModelRegistry({
      enableCaching: false, // Disable caching for tests
      healthCheckInterval: 0 // Disable automatic health checks
    });
    llmProvider = new MockLLMProvider();
    visionProvider = new MockVisionProvider();
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  describe('Provider Registration', () => {
    test('should register provider successfully', () => {
      expect(() => registry.register(llmProvider)).not.toThrow();
      
      const retrieved = registry.getProvider('mock-llm');
      expect(retrieved).toBe(llmProvider);
    });

    test('should not allow duplicate provider registration', () => {
      registry.register(llmProvider);
      
      expect(() => registry.register(llmProvider)).toThrow('already registered');
    });

    test('should register provider with priority', () => {
      registry.register(llmProvider, 10);
      registry.register(new MockLLMProvider('mock-llm-2'), 5);
      
      const provider = registry.getProviderForType('LLM');
      expect(provider?.getName()).toBe('mock-llm'); // Higher priority
    });

    test('should register disabled provider', () => {
      registry.register(llmProvider, 0, false);
      
      const retrieved = registry.getProvider('mock-llm');
      expect(retrieved).toBeNull(); // Disabled
    });
  });

  describe('Provider Unregistration', () => {
    test('should unregister provider successfully', () => {
      registry.register(llmProvider);
      
      const result = registry.unregister('mock-llm');
      expect(result).toBe(true);
      
      const retrieved = registry.getProvider('mock-llm');
      expect(retrieved).toBeNull();
    });

    test('should return false for non-existent provider', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Provider Retrieval', () => {
    beforeEach(() => {
      registry.register(llmProvider);
      registry.register(visionProvider);
    });

    test('should get provider by name', () => {
      const provider = registry.getProvider('mock-llm');
      expect(provider).toBe(llmProvider);
    });

    test('should return null for non-existent provider', () => {
      const provider = registry.getProvider('non-existent');
      expect(provider).toBeNull();
    });

    test('should get provider for model type', () => {
      const provider = registry.getProviderForType('LLM');
      expect(provider).toBe(llmProvider);
    });

    test('should return null for unsupported model type', () => {
      const provider = registry.getProviderForType('ASR');
      expect(provider).toBeNull();
    });

    test('should get all providers for model type', () => {
      registry.register(new MockLLMProvider('mock-llm-2'));
      
      const providers = registry.getProvidersForType('LLM');
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.getName())).toContain('mock-llm');
      expect(providers.map(p => p.getName())).toContain('mock-llm-2');
    });
  });

  describe('Model Listing', () => {
    beforeEach(() => {
      registry.register(llmProvider);
      registry.register(visionProvider);
    });

    test('should list all models', async () => {
      const models = await registry.listModels();
      
      expect(models).toHaveLength(2);
      expect(models.map(m => m.name)).toContain('Mock GPT-4');
      expect(models.map(m => m.name)).toContain('Mock Vision Model');
    });

    test('should list models by category', async () => {
      const languageModels = await registry.listModels('language');
      const visionModels = await registry.listModels('vision');
      
      expect(languageModels).toHaveLength(1);
      expect(languageModels[0].name).toBe('Mock GPT-4');
      
      expect(visionModels).toHaveLength(1);
      expect(visionModels[0].name).toBe('Mock Vision Model');
    });

    test('should handle provider errors gracefully', async () => {
      const unavailableProvider = new UnavailableProvider();
      registry.register(unavailableProvider);
      
      const models = await registry.listModels();
      
      // Should still return models from working providers
      expect(models).toHaveLength(2);
    });
  });

  describe('Model Recommendations', () => {
    beforeEach(() => {
      registry.register(llmProvider);
      registry.register(visionProvider);
    });

    test('should recommend models for text generation', async () => {
      const recommendations = await registry.recommendModel('text-generation');
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].model.name).toBe('Mock GPT-4');
      expect(recommendations[0].score).toBeGreaterThan(0);
    });

    test('should recommend models for image classification', async () => {
      const recommendations = await registry.recommendModel('image-classification');
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].model.name).toBe('Mock Vision Model');
    });

    test('should return empty recommendations for unsupported tasks', async () => {
      const recommendations = await registry.recommendModel('speech-to-text');
      
      expect(recommendations).toHaveLength(0);
    });

    test('should include alternatives in recommendations', async () => {
      registry.register(new MockLLMProvider('mock-llm-2'));
      
      const recommendations = await registry.recommendModel('text-generation');
      
      expect(recommendations.length).toBeGreaterThan(0);
      if (recommendations[0].alternatives) {
        expect(recommendations[0].alternatives.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Provider Management', () => {
    beforeEach(() => {
      registry.register(llmProvider);
    });

    test('should enable/disable provider', () => {
      let result = registry.setProviderEnabled('mock-llm', false);
      expect(result).toBe(true);
      
      let provider = registry.getProvider('mock-llm');
      expect(provider).toBeNull();
      
      result = registry.setProviderEnabled('mock-llm', true);
      expect(result).toBe(true);
      
      provider = registry.getProvider('mock-llm');
      expect(provider).toBe(llmProvider);
    });

    test('should set provider priority', () => {
      const result = registry.setProviderPriority('mock-llm', 100);
      expect(result).toBe(true);
    });

    test('should return false for non-existent provider operations', () => {
      expect(registry.setProviderEnabled('non-existent', true)).toBe(false);
      expect(registry.setProviderPriority('non-existent', 10)).toBe(false);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(() => {
      registry.register(llmProvider);
      registry.register(visionProvider);
    });

    test('should get health status of all providers', async () => {
      const healthStatuses = await registry.getHealthStatus();
      
      expect(healthStatuses).toHaveLength(2);
      expect(healthStatuses.every(h => h.status === 'healthy')).toBe(true);
    });

    test('should handle unhealthy providers', async () => {
      const unavailableProvider = new UnavailableProvider();
      registry.register(unavailableProvider);
      
      const healthStatuses = await registry.getHealthStatus();
      
      const unhealthyStatus = healthStatuses.find(h => h.provider === 'unavailable-provider');
      expect(unhealthyStatus?.status).toBe('unhealthy');
    });
  });

  describe('Registry Statistics', () => {
    test('should return correct statistics', () => {
      registry.register(llmProvider);
      registry.register(visionProvider, 0, false); // Disabled
      
      const stats = registry.getStats();
      
      expect(stats.totalProviders).toBe(2);
      expect(stats.enabledProviders).toBe(1);
      expect(stats.disabledProviders).toBe(1);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      registry.register(llmProvider);
      
      expect(() => registry.clearCache()).not.toThrow();
    });
  });

  describe('Registry Lifecycle', () => {
    test('should shutdown gracefully', async () => {
      registry.register(llmProvider);
      registry.register(visionProvider);
      
      await expect(registry.shutdown()).resolves.not.toThrow();
      
      // After shutdown, providers should be cleared
      expect(registry.getProvider('mock-llm')).toBeNull();
    });
  });
});

describe('ModelRegistry with Caching', () => {
  let registry: ModelRegistry;
  let llmProvider: MockLLMProvider;

  beforeEach(() => {
    registry = new ModelRegistry({
      enableCaching: true,
      cacheTimeout: 1000, // 1 second for testing
      healthCheckInterval: 0
    });
    llmProvider = new MockLLMProvider();
    registry.register(llmProvider);
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  test('should cache model listings', async () => {
    // First call
    const models1 = await registry.listModels();
    
    // Second call should use cache
    const models2 = await registry.listModels();
    
    expect(models1).toEqual(models2);
  });

  test('should cache expire after timeout', async () => {
    await registry.listModels();
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // This should trigger a fresh fetch
    const models = await registry.listModels();
    expect(models).toHaveLength(1);
  });
});