import { 
  ModelProvider, 
  ModelRequest, 
  ModelResponse, 
  ModelCapabilities, 
  ModelInfo, 
  ValidationResult,
  ModelConfig
} from '../ModelProvider';
import { ModelType } from '../../types/global';

// Mock implementation for testing
class MockModelProvider extends ModelProvider {
  private mockModels: ModelInfo[] = [
    {
      id: 'mock-gpt-4',
      name: 'GPT-4 Mock',
      type: 'LLM' as ModelType,
      provider: 'mock',
      capabilities: {
        supportedTypes: ['LLM'],
        capabilities: ['text-generation', 'code-generation'],
        streaming: true,
        fineTuning: false,
        multimodal: false,
        batchProcessing: true
      },
      parameters: {
        maxTokens: 4096,
        temperature: 0.7
      },
      metadata: {
        version: '1.0.0',
        description: 'Mock GPT-4 model for testing',
        author: 'Test Suite'
      },
      available: true
    }
  ];

  constructor() {
    super('mock-provider', 'mock', { apiKey: 'test-key' });
  }

  supports(modelType: ModelType): boolean {
    return modelType === 'LLM';
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    if (request.model === 'error-model') {
      throw new Error('Mock error for testing');
    }

    return {
      content: `Mock response for: ${request.input}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        cost: 0.001,
        duration: 100
      },
      model: request.model,
      finishReason: 'stop',
      metadata: { mock: true }
    };
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['LLM'],
      capabilities: ['text-generation', 'code-generation', 'streaming'],
      maxInputSize: 8192,
      maxOutputSize: 4096,
      streaming: true,
      fineTuning: false,
      multimodal: false,
      batchProcessing: true
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    const errors = [];
    const warnings = [];

    if (!config.model) {
      errors.push({
        field: 'model',
        message: 'Model name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (config.parameters?.temperature && 
        (config.parameters.temperature < 0 || config.parameters.temperature > 2)) {
      warnings.push({
        field: 'parameters.temperature',
        message: 'Temperature should be between 0 and 2',
        suggestion: 'Use a value between 0.1 and 1.0 for best results'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [...this.mockModels];
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    return this.mockModels.find(m => m.id === modelId) || null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async estimateCost(request: ModelRequest): Promise<number | null> {
    // Mock cost estimation: $0.001 per 1000 tokens
    const inputLength = typeof request.input === 'string' ? request.input.length : 100;
    const estimatedTokens = Math.ceil(inputLength / 4); // Rough token estimation
    return (estimatedTokens / 1000) * 0.001;
  }
}

describe('ModelProvider', () => {
  let provider: MockModelProvider;

  beforeEach(() => {
    provider = new MockModelProvider();
  });

  describe('Basic Properties', () => {
    test('should return correct name', () => {
      expect(provider.getName()).toBe('mock-provider');
    });

    test('should return correct type', () => {
      expect(provider.getType()).toBe('mock');
    });

    test('should return configuration', () => {
      const config = provider.getConfig();
      expect(config).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('Model Support', () => {
    test('should support LLM models', () => {
      expect(provider.supports('LLM' as ModelType)).toBe(true);
    });

    test('should not support unsupported model types', () => {
      expect(provider.supports('Vision' as ModelType)).toBe(false);
    });
  });

  describe('Model Execution', () => {
    test('should execute model request successfully', async () => {
      const request: ModelRequest = {
        model: 'mock-gpt-4',
        input: 'Hello, world!',
        parameters: { temperature: 0.7 }
      };

      const response = await provider.execute(request);

      expect(response.content).toBe('Mock response for: Hello, world!');
      expect(response.model).toBe('mock-gpt-4');
      expect(response.usage?.totalTokens).toBe(30);
      expect(response.finishReason).toBe('stop');
    });

    test('should handle execution errors', async () => {
      const request: ModelRequest = {
        model: 'error-model',
        input: 'This should fail'
      };

      await expect(provider.execute(request)).rejects.toThrow('Mock error for testing');
    });
  });

  describe('Capabilities', () => {
    test('should return provider capabilities', () => {
      const capabilities = provider.getCapabilities();

      expect(capabilities.supportedTypes).toContain('LLM');
      expect(capabilities.capabilities).toContain('text-generation');
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.fineTuning).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const config: ModelConfig = {
        model: 'mock-gpt-4',
        provider: 'mock',
        parameters: { temperature: 0.7 }
      };

      const result = provider.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const config: ModelConfig = {
        model: '',
        provider: 'mock'
      };

      const result = provider.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('model');
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
    });

    test('should generate warnings for suboptimal values', () => {
      const config: ModelConfig = {
        model: 'mock-gpt-4',
        provider: 'mock',
        parameters: { temperature: 3.0 } // Too high
      };

      const result = provider.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('parameters.temperature');
    });
  });

  describe('Model Information', () => {
    test('should list available models', async () => {
      const models = await provider.listModels();

      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('mock-gpt-4');
      expect(models[0].name).toBe('GPT-4 Mock');
      expect(models[0].available).toBe(true);
    });

    test('should get specific model info', async () => {
      const modelInfo = await provider.getModelInfo('mock-gpt-4');

      expect(modelInfo).not.toBeNull();
      expect(modelInfo?.name).toBe('GPT-4 Mock');
      expect(modelInfo?.type).toBe('LLM');
    });

    test('should return null for non-existent model', async () => {
      const modelInfo = await provider.getModelInfo('non-existent');

      expect(modelInfo).toBeNull();
    });
  });

  describe('Availability', () => {
    test('should check provider availability', async () => {
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });
  });

  describe('Health Status', () => {
    test('should return healthy status when available', async () => {
      const health = await provider.getHealthStatus();

      expect(health.provider).toBe('mock-provider');
      expect(health.status).toBe('healthy');
      expect(health.details).toBe('Provider is operational');
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Cost Estimation', () => {
    test('should estimate request cost', async () => {
      const request: ModelRequest = {
        model: 'mock-gpt-4',
        input: 'This is a test prompt for cost estimation'
      };

      const cost = await provider.estimateCost(request);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });
  });

  describe('Lifecycle Management', () => {
    test('should initialize without errors', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    test('should cleanup without errors', async () => {
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });
});

// Test for error scenarios
describe('ModelProvider Error Handling', () => {
  class ErrorModelProvider extends ModelProvider {
    constructor() {
      super('error-provider', 'error');
    }

    supports(modelType: ModelType): boolean {
      return true;
    }

    async execute(request: ModelRequest): Promise<ModelResponse> {
      throw new Error('Provider execution failed');
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
        errors: [{ field: 'general', message: 'Provider error', code: 'PROVIDER_ERROR' }],
        warnings: []
      };
    }

    async listModels(): Promise<ModelInfo[]> {
      throw new Error('Failed to list models');
    }

    async getModelInfo(modelId: string): Promise<ModelInfo | null> {
      throw new Error('Failed to get model info');
    }

    async isAvailable(): Promise<boolean> {
      throw new Error('Availability check failed');
    }
  }

  let errorProvider: ErrorModelProvider;

  beforeEach(() => {
    errorProvider = new ErrorModelProvider();
  });

  test('should handle health check errors gracefully', async () => {
    const health = await errorProvider.getHealthStatus();

    expect(health.status).toBe('error');
    expect(health.details).toBe('Availability check failed');
    expect(health.error).toBeInstanceOf(Error);
  });

  test('should handle execution errors', async () => {
    const request: ModelRequest = {
      model: 'test-model',
      input: 'test input'
    };

    await expect(errorProvider.execute(request)).rejects.toThrow('Provider execution failed');
  });

  test('should handle model listing errors', async () => {
    await expect(errorProvider.listModels()).rejects.toThrow('Failed to list models');
  });
});