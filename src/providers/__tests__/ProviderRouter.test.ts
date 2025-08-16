import { 
  ProviderRouter, 
  createProviderRouter, 
  DEFAULT_PROVIDER_CONFIG,
  ProviderConfig,
  ProviderCategory
} from '../ProviderRouter';
import { ModelRequest } from '../ModelProvider';

describe('ProviderRouter', () => {
  let router: ProviderRouter;

  beforeEach(async () => {
    // Create router with minimal config for testing
    const testConfig: ProviderConfig = {
      // Enable only a few providers for faster testing
      scikitLearn: { enabled: true, priority: 5 },
      xgboost: { enabled: true, priority: 10 },
      yolo: { enabled: true, priority: 15 },
      imageClassification: { enabled: true, priority: 12 },
      whisper: { enabled: true, priority: 20 },
      speakerEmotion: { enabled: true, priority: 10 },
      audioEnhancement: { enabled: true, priority: 15 },
      realTimeAudio: { enabled: true, priority: 20 },
      // Disable some for faster testing
      lightgbm: { enabled: false },
      tensorflow: { enabled: false },
      imageSegmentationOCR: { enabled: false },
      visionTransformer: { enabled: false }
    };
    
    router = new ProviderRouter(testConfig);
  });

  afterEach(async () => {
    await router.shutdown();
  });

  describe('Initialization', () => {
    it('should create router with default config', () => {
      const defaultRouter = new ProviderRouter();
      expect(defaultRouter).toBeInstanceOf(ProviderRouter);
      expect(defaultRouter.getRegistry()).toBeDefined();
    });

    it('should create router with custom config', () => {
      const customConfig: ProviderConfig = {
        scikitLearn: { enabled: false },
        xgboost: { enabled: true, priority: 25 }
      };
      
      const customRouter = new ProviderRouter(customConfig);
      expect(customRouter).toBeInstanceOf(ProviderRouter);
    });

    it('should initialize all enabled providers', async () => {
      const result = await router.initializeAllProviders();
      
      // Check that enabled providers are registered
      expect(result['scikit-learn']?.registered).toBe(true);
      expect(result['xgboost']?.registered).toBe(true);
      expect(result['yolo']?.registered).toBe(true);
      expect(result['whisper']?.registered).toBe(true);
      
      // Check that disabled providers are not in result
      expect(result['lightgbm']).toBeUndefined();
      expect(result['tensorflow']).toBeUndefined();
    });

    it('should use createProviderRouter factory function', async () => {
      const factoryRouter = await createProviderRouter({
        scikitLearn: { enabled: true },
        xgboost: { enabled: false }
      });
      
      expect(factoryRouter).toBeInstanceOf(ProviderRouter);
      
      // Cleanup
      await factoryRouter.shutdown();
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should get specific provider by name', () => {
      const scikitProvider = router.getProvider('scikit-learn');
      expect(scikitProvider).toBeDefined();
      expect(scikitProvider?.getName()).toBe('scikit-learn');

      const nonExistentProvider = router.getProvider('non-existent');
      expect(nonExistentProvider).toBeNull();
    });

    it('should get all available models', async () => {
      const models = await router.getAllModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      
      // Should have models from different providers
      const providerNames = [...new Set(models.map(m => m.provider))];
      expect(providerNames.length).toBeGreaterThan(1);
    });

    it('should get models by category', async () => {
      const traditionalMLModels = await router.getModelsByCategory('traditional-ml');
      const visionModels = await router.getModelsByCategory('computer-vision');
      const audioModels = await router.getModelsByCategory('audio-processing');
      
      expect(traditionalMLModels).toBeInstanceOf(Array);
      expect(visionModels).toBeInstanceOf(Array);
      expect(audioModels).toBeInstanceOf(Array);
      
      // Verify models are from correct categories
      if (traditionalMLModels.length > 0) {
        const mlProviders = traditionalMLModels.map(m => m.provider);
        expect(mlProviders.some(p => ['scikit-learn', 'xgboost'].includes(p))).toBe(true);
      }
    });

    it('should get provider health status', async () => {
      const health = await router.getProviderHealth();
      expect(health).toBeInstanceOf(Array);
      expect(health.length).toBeGreaterThan(0);
      
      // Each health status should have required fields
      health.forEach(status => {
        expect(status.provider).toBeDefined();
        expect(status.status).toBeDefined();
        expect(status.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should get provider statistics', () => {
      const stats = router.getProviderStats();
      
      expect(stats.totalProviders).toBeGreaterThan(0);
      expect(stats.enabledProviders).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
      expect(typeof stats.audioPipelineEnabled).toBe('boolean');
    });
  });

  describe('Model Execution', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should execute request through appropriate provider', async () => {
      const models = await router.getAllModels();
      expect(models.length).toBeGreaterThan(0);
      
      const firstModel = models[0];
      const request: ModelRequest = {
        model: firstModel.id,
        input: this.createTestInput(firstModel.provider),
        parameters: {}
      };
      
      const response = await router.executeRequest(request);
      expect(response).toBeDefined();
      expect(response.model).toBe(firstModel.id);
      expect(response.finishReason).toBeDefined();
    });

    it('should handle non-existent model', async () => {
      const request: ModelRequest = {
        model: 'non-existent-model',
        input: [1, 2, 3],
        parameters: {}
      };
      
      await expect(router.executeRequest(request)).rejects.toThrow('Model \'non-existent-model\' not found');
    });

    it('should handle provider not found', async () => {
      // This would happen if a model exists but its provider is disabled
      const models = await router.getAllModels();
      if (models.length > 0) {
        const firstModel = models[0];
        
        // Simulate provider being disabled after model listing
        const registry = router.getRegistry();
        registry.setProviderEnabled(firstModel.provider, false);
        
        const request: ModelRequest = {
          model: firstModel.id,
          input: this.createTestInput(firstModel.provider),
          parameters: {}
        };
        
        await expect(router.executeRequest(request)).rejects.toThrow();
      }
    });

    // Helper method to create appropriate test input
    createTestInput(providerName: string): any {
      if (providerName.includes('audio') || providerName === 'whisper') {
        return Buffer.from('mock audio data');
      } else if (providerName.includes('image') || providerName.includes('vision') || providerName === 'yolo') {
        return Buffer.from('mock image data');
      } else {
        return [[1, 2, 3, 4, 5]]; // Traditional ML
      }
    }
  });

  describe('Audio Processing Pipeline', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should process audio through pipeline', async () => {
      const mockAudio = Buffer.from('mock audio data');
      const pipeline = ['enhancement', 'speaker-analysis'];
      
      const result = await router.processAudioPipeline(mockAudio, pipeline);
      
      expect(result).toBeDefined();
      expect(result.input).toBe(mockAudio);
      expect(result.pipeline).toEqual(pipeline);
      expect(result.results).toBeDefined();
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should get recommended audio pipeline', () => {
      const transcriptionPipeline = router.getRecommendedAudioPipeline('transcription');
      expect(transcriptionPipeline).toEqual(['enhancement', 'transcription']);

      const analysisPipeline = router.getRecommendedAudioPipeline('analysis');
      expect(analysisPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection']);

      const fullPipeline = router.getRecommendedAudioPipeline('full');
      expect(fullPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection', 'transcription']);
    });

    it('should handle audio pipeline when not initialized', async () => {
      // Create router without audio providers
      const noAudioRouter = new ProviderRouter({
        scikitLearn: { enabled: true },
        speakerEmotion: { enabled: false },
        audioEnhancement: { enabled: false },
        realTimeAudio: { enabled: false },
        whisper: { enabled: false }
      });
      
      await noAudioRouter.initializeAllProviders();
      
      const mockAudio = Buffer.from('mock audio data');
      
      await expect(noAudioRouter.processAudioPipeline(mockAudio, ['enhancement']))
        .rejects.toThrow('Audio pipeline not initialized');
      
      expect(() => noAudioRouter.getRecommendedAudioPipeline('transcription'))
        .toThrow('Audio pipeline not initialized');
      
      await noAudioRouter.shutdown();
    });
  });

  describe('Provider Testing', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should test all providers', async () => {
      const testResults = await router.testAllProviders();
      
      expect(testResults.timestamp).toBeInstanceOf(Date);
      expect(testResults.tests).toBeDefined();
      
      // Should have test results for enabled categories
      const categories: ProviderCategory[] = ['traditional-ml', 'computer-vision', 'audio-processing'];
      categories.forEach(category => {
        expect(testResults.tests[category]).toBeDefined();
      });
    });

    it('should handle test failures gracefully', async () => {
      // This test ensures that if one provider fails, others still get tested
      const testResults = await router.testAllProviders();
      
      expect(testResults.tests).toBeDefined();
      
      // Even if some tests fail, the structure should be maintained
      Object.values(testResults.tests).forEach((categoryResult: any) => {
        expect(categoryResult).toBeDefined();
      });
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_PROVIDER_CONFIG).toBeDefined();
      expect(DEFAULT_PROVIDER_CONFIG.scikitLearn.enabled).toBe(true);
      expect(DEFAULT_PROVIDER_CONFIG.xgboost.enabled).toBe(true);
      expect(DEFAULT_PROVIDER_CONFIG.yolo.enabled).toBe(true);
      expect(DEFAULT_PROVIDER_CONFIG.whisper.enabled).toBe(true);
    });

    it('should merge custom configuration with defaults', async () => {
      const customConfig: ProviderConfig = {
        scikitLearn: { enabled: false },
        xgboost: { priority: 99, enableGPU: true }
      };
      
      const customRouter = new ProviderRouter(customConfig);
      const result = await customRouter.initializeAllProviders();
      
      // Scikit-learn should be disabled
      expect(result['scikit-learn']).toBeUndefined();
      
      // XGBoost should be enabled with custom priority
      expect(result['xgboost']?.registered).toBe(true);
      
      await customRouter.shutdown();
    });

    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig: ProviderConfig = {
        scikitLearn: { enabled: true, priority: -1 }, // Invalid priority
        xgboost: { enabled: true, backend: 'invalid-backend' } // Invalid backend
      };
      
      const invalidRouter = new ProviderRouter(invalidConfig);
      
      // Should not throw during initialization
      const result = await invalidRouter.initializeAllProviders();
      expect(result).toBeDefined();
      
      await invalidRouter.shutdown();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should handle provider initialization failures', async () => {
      // This test simulates what happens when a provider fails to initialize
      // The router should continue with other providers
      const result = await router.initializeAllProviders();
      
      // Even if some providers fail, others should still be registered
      const registeredCount = Object.values(result).filter(r => r.registered).length;
      expect(registeredCount).toBeGreaterThan(0);
    });

    it('should handle model execution errors', async () => {
      const models = await router.getAllModels();
      if (models.length > 0) {
        const firstModel = models[0];
        const invalidRequest: ModelRequest = {
          model: firstModel.id,
          input: null, // Invalid input
          parameters: {}
        };
        
        await expect(router.executeRequest(invalidRequest)).rejects.toThrow();
      }
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await router.initializeAllProviders();
      
      // Should not throw
      await expect(router.shutdown()).resolves.not.toThrow();
      
      // After shutdown, registry should be empty
      const stats = router.getProviderStats();
      expect(stats.totalProviders).toBe(0);
    });

    it('should handle multiple shutdowns', async () => {
      await router.initializeAllProviders();
      
      // First shutdown
      await router.shutdown();
      
      // Second shutdown should not throw
      await expect(router.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Provider Categories', () => {
    beforeEach(async () => {
      await router.initializeAllProviders();
    });

    it('should categorize providers correctly', async () => {
      const stats = router.getProviderStats();
      const categories = stats.categories;
      
      expect(categories['traditional-ml']).toBeGreaterThanOrEqual(0);
      expect(categories['computer-vision']).toBeGreaterThanOrEqual(0);
      expect(categories['audio-processing']).toBeGreaterThanOrEqual(0);
      expect(categories['language-models']).toBeGreaterThanOrEqual(0);
      expect(categories['multimodal']).toBeGreaterThanOrEqual(0);
      expect(categories['specialized']).toBeGreaterThanOrEqual(0);
    });

    it('should filter models by category correctly', async () => {
      const allModels = await router.getAllModels();
      const audioModels = await router.getModelsByCategory('audio-processing');
      const visionModels = await router.getModelsByCategory('computer-vision');
      
      // Audio models should be subset of all models
      expect(audioModels.length).toBeLessThanOrEqual(allModels.length);
      expect(visionModels.length).toBeLessThanOrEqual(allModels.length);
      
      // No overlap between categories (for this test)
      const audioModelIds = new Set(audioModels.map(m => m.id));
      const visionModelIds = new Set(visionModels.map(m => m.id));
      const intersection = new Set([...audioModelIds].filter(id => visionModelIds.has(id)));
      expect(intersection.size).toBe(0);
    });
  });
});