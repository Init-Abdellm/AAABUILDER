import { ScikitLearnProvider } from '../ScikitLearnProvider';
import { XGBoostProvider } from '../XGBoostProvider';
import { LightGBMProvider } from '../LightGBMProvider';
import { TensorFlowProvider } from '../TensorFlowProvider';
import { ModelRequest, ModelConfig } from '../ModelProvider';
import { ModelType } from '../../types/global';

describe('Traditional ML Providers', () => {
  describe('ScikitLearnProvider', () => {
    let provider: ScikitLearnProvider;

    beforeEach(() => {
      provider = new ScikitLearnProvider();
    });

    test('should support correct model types', () => {
      expect(provider.supports('MLP' as ModelType)).toBe(true);
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('RNN' as ModelType)).toBe(true);
      expect(provider.supports('Autoencoder' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(false);
    });

    test('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportedTypes).toContain('MLP');
      expect(capabilities.capabilities).toContain('classification');
      expect(capabilities.capabilities).toContain('regression');
      expect(capabilities.capabilities).toContain('clustering');
      expect(capabilities.fineTuning).toBe(true);
      expect(capabilities.streaming).toBe(false);
    });

    test('should validate configuration correctly', () => {
      const validConfig: ModelConfig = {
        model: 'RandomForestClassifier',
        provider: 'scikit-learn',
        parameters: { n_estimators: 100 }
      };

      const result = provider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing model name', () => {
      const invalidConfig: ModelConfig = {
        model: '',
        provider: 'scikit-learn'
      };

      const result = provider.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('model');
    });

    test('should list available models', async () => {
      const models = await provider.listModels();
      
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('type');
      expect(models[0]).toHaveProperty('provider', 'scikit-learn');
    });

    test('should execute classification request', async () => {
      const request: ModelRequest = {
        model: 'sklearn-random-forest-classifier',
        input: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        parameters: { n_estimators: 50 }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('probabilities');
      expect(response.content).toHaveProperty('feature_importance');
      expect(response.model).toBe(request.model);
      expect(response.usage?.duration).toBeGreaterThan(0);
    });

    test('should execute regression request', async () => {
      const request: ModelRequest = {
        model: 'sklearn-linear-regression',
        input: [[1, 2], [3, 4], [5, 6]]
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content.probabilities).toBeNull();
      expect(response.finishReason).toBe('completed');
    });

    test('should handle invalid input', async () => {
      const request: ModelRequest = {
        model: 'sklearn-svc',
        input: null
      };

      await expect(provider.execute(request)).rejects.toThrow('Invalid request');
    });

    test('should check availability', async () => {
      const available = await provider.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('XGBoostProvider', () => {
    let provider: XGBoostProvider;

    beforeEach(() => {
      provider = new XGBoostProvider();
    });

    test('should support correct model types', () => {
      expect(provider.supports('MLP' as ModelType)).toBe(true);
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(false);
    });

    test('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportedTypes).toContain('MLP');
      expect(capabilities.capabilities).toContain('classification');
      expect(capabilities.capabilities).toContain('regression');
      expect(capabilities.capabilities).toContain('ranking');
      expect(capabilities.batchProcessing).toBe(true);
    });

    test('should validate XGBoost parameters', () => {
      const config: ModelConfig = {
        model: 'xgboost-classifier',
        provider: 'xgboost',
        parameters: {
          learning_rate: 0.1,
          max_depth: 6,
          n_estimators: 100
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid learning rate', () => {
      const config: ModelConfig = {
        model: 'xgboost-classifier',
        provider: 'xgboost',
        parameters: {
          learning_rate: 1.5 // Invalid: > 1
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.learning_rate')).toBe(true);
    });

    test('should execute classification with probabilities', async () => {
      const request: ModelRequest = {
        model: 'xgboost-classifier',
        input: [[1, 2, 3, 4], [5, 6, 7, 8]]
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('probabilities');
      expect(response.content).toHaveProperty('feature_importance');
      expect(response.content).toHaveProperty('metrics');
      expect(response.metadata?.task_type).toBe('classification');
    });

    test('should execute regression', async () => {
      const request: ModelRequest = {
        model: 'xgboost-regressor',
        input: [[1, 2], [3, 4]]
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content.probabilities).toBeNull();
      expect(response.metadata?.task_type).toBe('regression');
    });

    test('should require numerical input', async () => {
      const request: ModelRequest = {
        model: 'xgboost-classifier',
        input: ['text', 'data'] // Invalid: non-numerical
      };

      await expect(provider.execute(request)).rejects.toThrow('numerical input data');
    });

    test('should list GPU models when enabled', async () => {
      const gpuProvider = new XGBoostProvider({ enableGPU: true });
      const models = await gpuProvider.listModels();
      
      const gpuModel = models.find(m => m.id.includes('gpu'));
      expect(gpuModel).toBeDefined();
      expect(gpuModel?.metadata.acceleration).toBe('gpu');
    });
  });

  describe('LightGBMProvider', () => {
    let provider: LightGBMProvider;

    beforeEach(() => {
      provider = new LightGBMProvider();
    });

    test('should support correct model types', () => {
      expect(provider.supports('MLP' as ModelType)).toBe(true);
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('ASR' as ModelType)).toBe(false);
    });

    test('should return memory efficient capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.maxInputSize).toBe(50000000); // Very large
      expect(capabilities.memoryEfficient).toBe(true);
      expect(capabilities.capabilities).toContain('early-stopping');
    });

    test('should validate LightGBM parameters', () => {
      const config: ModelConfig = {
        model: 'lightgbm-classifier',
        provider: 'lightgbm',
        parameters: {
          objective: 'multiclass',
          boosting_type: 'gbdt',
          num_leaves: 31,
          learning_rate: 0.1
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should validate boosting type', () => {
      const config: ModelConfig = {
        model: 'lightgbm-classifier',
        provider: 'lightgbm',
        parameters: {
          boosting_type: 'invalid_type'
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.boosting_type')).toBe(true);
    });

    test('should execute with training log', async () => {
      const request: ModelRequest = {
        model: 'lightgbm-classifier',
        input: [[1, 2, 3], [4, 5, 6]]
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('training_log');
      expect(response.content).toHaveProperty('metrics');
      expect(response.content.training_log).toBeInstanceOf(Array);
      expect(response.usage?.memoryUsage).toBeGreaterThan(0);
    });

    test('should support DART boosting', async () => {
      const models = await provider.listModels();
      const dartModel = models.find(m => m.id.includes('dart'));
      
      expect(dartModel).toBeDefined();
      expect(dartModel?.parameters.boosting_type).toBe('dart');
      expect(dartModel?.metadata.regularization).toBe('high');
    });

    test('should handle ranking task', async () => {
      const request: ModelRequest = {
        model: 'lightgbm-ranker',
        input: [[1, 2], [3, 4], [5, 6]]
      };

      const response = await provider.execute(request);
      
      expect(response.metadata?.task_type).toBe('ranking');
      expect(response.content.metrics).toHaveProperty('ndcg');
    });
  });

  describe('TensorFlowProvider', () => {
    let provider: TensorFlowProvider;

    beforeEach(() => {
      provider = new TensorFlowProvider();
    });

    test('should support neural network model types', () => {
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('RNN' as ModelType)).toBe(true);
      expect(provider.supports('MLP' as ModelType)).toBe(true);
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('Autoencoder' as ModelType)).toBe(true);
      expect(provider.supports('GAN' as ModelType)).toBe(true);
      expect(provider.supports('ASR' as ModelType)).toBe(false);
    });

    test('should return multimodal capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.multimodal).toBe(true);
      expect(capabilities.capabilities).toContain('image-classification');
      expect(capabilities.capabilities).toContain('text-generation');
      expect(capabilities.capabilities).toContain('image-generation');
      expect(capabilities.capabilities).toContain('sequence-processing');
    });

    test('should list diverse model types', async () => {
      const models = await provider.listModels();
      
      const cnnModel = models.find(m => m.type === 'CNN');
      const rnnModel = models.find(m => m.type === 'RNN');
      const ganModel = models.find(m => m.type === 'GAN');
      const transformerModel = models.find(m => m.type === 'Transformer');
      
      expect(cnnModel).toBeDefined();
      expect(rnnModel).toBeDefined();
      expect(ganModel).toBeDefined();
      expect(transformerModel).toBeDefined();
    });

    test('should execute CNN image classification', async () => {
      const request: ModelRequest = {
        model: 'tf-mobilenet-v2',
        input: Array.from({ length: 224 * 224 * 3 }, () => Math.random())
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('probabilities');
      expect(response.content.model_info.model_type).toBe('CNN');
      expect(response.content.model_info.task_type).toBe('classification');
    });

    test('should execute RNN text generation', async () => {
      const request: ModelRequest = {
        model: 'tf-lstm-text-generator',
        input: [1, 2, 3, 4, 5] // Token sequence
      };

      const response = await provider.execute(request);
      
      expect(response.content.model_info.model_type).toBe('RNN');
      expect(response.content.model_info.task_type).toBe('text-generation');
    });

    test('should execute GAN image generation', async () => {
      const request: ModelRequest = {
        model: 'tf-dcgan',
        input: Array.from({ length: 100 }, () => Math.random()) // Latent vector
      };

      const response = await provider.execute(request);
      
      expect(response.content.model_info.model_type).toBe('GAN');
      expect(response.content.model_info.task_type).toBe('image-generation');
    });

    test('should execute autoencoder feature extraction', async () => {
      const request: ModelRequest = {
        model: 'tf-conv-autoencoder',
        input: Array.from({ length: 28 * 28 }, () => Math.random())
      };

      const response = await provider.execute(request);
      
      expect(response.content.model_info.model_type).toBe('Autoencoder');
      expect(response.content.model_info.task_type).toBe('feature-extraction');
    });

    test('should validate TensorFlow parameters', () => {
      const config: ModelConfig = {
        model: 'tf-mobilenet-v2',
        provider: 'tensorflow',
        parameters: {
          input_shape: [224, 224, 3],
          batch_size: 32,
          learning_rate: 0.001
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid input shape', () => {
      const config: ModelConfig = {
        model: 'tf-mobilenet-v2',
        provider: 'tensorflow',
        parameters: {
          input_shape: 'invalid' // Should be array
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.input_shape')).toBe(true);
    });

    test('should estimate memory usage', async () => {
      const request: ModelRequest = {
        model: 'tf-resnet50',
        input: Array.from({ length: 224 * 224 * 3 }, () => Math.random())
      };

      const response = await provider.execute(request);
      
      expect(response.usage?.memoryUsage).toBeGreaterThan(0);
    });

    test('should check TensorFlow.js availability', async () => {
      const available = await provider.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    test('should initialize and cleanup properly', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Provider Integration', () => {
    test('should all providers have consistent interface', async () => {
      const providers = [
        new ScikitLearnProvider(),
        new XGBoostProvider(),
        new LightGBMProvider(),
        new TensorFlowProvider()
      ];

      for (const provider of providers) {
        // Test basic interface
        expect(provider.getName()).toBeTruthy();
        expect(provider.getType()).toBeTruthy();
        expect(typeof provider.supports).toBe('function');
        expect(typeof provider.execute).toBe('function');
        expect(typeof provider.getCapabilities).toBe('function');
        expect(typeof provider.validateConfig).toBe('function');
        expect(typeof provider.listModels).toBe('function');
        expect(typeof provider.isAvailable).toBe('function');

        // Test capabilities structure
        const capabilities = provider.getCapabilities();
        expect(capabilities).toHaveProperty('supportedTypes');
        expect(capabilities).toHaveProperty('capabilities');
        expect(Array.isArray(capabilities.supportedTypes)).toBe(true);
        expect(Array.isArray(capabilities.capabilities)).toBe(true);

        // Test model listing
        const models = await provider.listModels();
        expect(Array.isArray(models)).toBe(true);
        if (models.length > 0) {
          expect(models[0]).toHaveProperty('id');
          expect(models[0]).toHaveProperty('name');
          expect(models[0]).toHaveProperty('type');
          expect(models[0]).toHaveProperty('provider');
        }
      }
    });

    test('should handle different input types appropriately', async () => {
      const providers = [
        new ScikitLearnProvider(),
        new XGBoostProvider(),
        new LightGBMProvider()
      ];

      const numericalInput = [[1, 2, 3], [4, 5, 6]];
      
      for (const provider of providers) {
        const models = await provider.listModels();
        if (models.length > 0) {
          const request: ModelRequest = {
            model: models[0].id,
            input: numericalInput
          };

          const response = await provider.execute(request);
          expect(response).toHaveProperty('content');
          expect(response).toHaveProperty('model');
          expect(response).toHaveProperty('usage');
        }
      }
    });
  });
});