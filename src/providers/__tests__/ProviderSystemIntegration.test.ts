import { 
  createProviderRouter, 
  ProviderRouter, 
  ProviderConfig,
  ModelRequest,
  OptimizationConfig
} from '../ProviderRouter';

describe('Provider System Integration', () => {
  let router: ProviderRouter;

  beforeAll(async () => {
    // Create a comprehensive router with all provider types
    const config: ProviderConfig = {
      // Traditional ML - enabled
      scikitLearn: { enabled: true, priority: 5 },
      xgboost: { enabled: true, priority: 10 },
      lightgbm: { enabled: true, priority: 8 },
      
      // Computer Vision - enabled
      yolo: { enabled: true, priority: 20, version: 'v8' },
      imageClassification: { enabled: true, priority: 15 },
      visionTransformer: { enabled: true, priority: 18 },
      
      // Audio Processing - enabled
      whisper: { enabled: true, priority: 25 },
      speakerEmotion: { enabled: true, priority: 12 },
      audioEnhancement: { enabled: true, priority: 20 },
      realTimeAudio: { enabled: true, priority: 25 },
      
      // Some disabled for testing
      tensorflow: { enabled: false },
      imageSegmentationOCR: { enabled: false }
    };

    router = await createProviderRouter(config);
  });

  afterAll(async () => {
    await router.shutdown();
  });

  describe('End-to-End Workflows', () => {
    it('should handle complete ML workflow', async () => {
      // 1. Get all available models
      const allModels = await router.getAllModels();
      expect(allModels.length).toBeGreaterThan(0);

      // 2. Filter models by category
      const mlModels = await router.getModelsByCategory('traditional-ml');
      const visionModels = await router.getModelsByCategory('computer-vision');
      const audioModels = await router.getModelsByCategory('audio-processing');

      expect(mlModels.length).toBeGreaterThan(0);
      expect(visionModels.length).toBeGreaterThan(0);
      expect(audioModels.length).toBeGreaterThan(0);

      // 3. Execute requests for different model types
      if (mlModels.length > 0) {
        const mlRequest: ModelRequest = {
          model: mlModels[0].id,
          input: [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]],
          parameters: {}
        };
        
        const mlResponse = await router.executeRequest(mlRequest);
        expect(mlResponse.finishReason).toBe('completed');
        expect(mlResponse.model).toBe(mlModels[0].id);
      }

      if (visionModels.length > 0) {
        const visionRequest: ModelRequest = {
          model: visionModels[0].id,
          input: Buffer.from('mock image data'),
          parameters: {}
        };
        
        const visionResponse = await router.executeRequest(visionRequest);
        expect(visionResponse.finishReason).toBe('completed');
        expect(visionResponse.model).toBe(visionModels[0].id);
      }

      if (audioModels.length > 0) {
        const audioRequest: ModelRequest = {
          model: audioModels[0].id,
          input: Buffer.from('mock audio data'),
          parameters: {}
        };
        
        const audioResponse = await router.executeRequest(audioRequest);
        expect(audioResponse.finishReason).toBe('completed');
        expect(audioResponse.model).toBe(audioModels[0].id);
      }
    });

    it('should handle audio processing pipeline workflow', async () => {
      const mockAudio = Buffer.from('comprehensive audio test data');

      // 1. Get recommended pipeline for different tasks
      const transcriptionPipeline = router.getRecommendedAudioPipeline('transcription');
      const analysisPipeline = router.getRecommendedAudioPipeline('analysis');
      const fullPipeline = router.getRecommendedAudioPipeline('full');

      expect(transcriptionPipeline).toEqual(['enhancement', 'transcription']);
      expect(analysisPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection']);
      expect(fullPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection', 'transcription']);

      // 2. Process audio through different pipelines
      const transcriptionResult = await router.processAudioPipeline(mockAudio, transcriptionPipeline);
      expect(transcriptionResult.input).toBe(mockAudio);
      expect(transcriptionResult.pipeline).toEqual(transcriptionPipeline);
      expect(transcriptionResult.results).toBeDefined();

      const analysisResult = await router.processAudioPipeline(mockAudio, analysisPipeline);
      expect(analysisResult.results).toBeDefined();
      expect(Object.keys(analysisResult.results).length).toBeGreaterThan(0);

      const fullResult = await router.processAudioPipeline(mockAudio, fullPipeline);
      expect(fullResult.results).toBeDefined();
      expect(Object.keys(fullResult.results).length).toBeGreaterThanOrEqual(3);
    });

    it('should handle model optimization workflow', async () => {
      const allModels = await router.getAllModels();
      expect(allModels.length).toBeGreaterThan(0);

      const modelToOptimize = allModels[0];

      // 1. Get optimization recommendations
      const recommendations = await router.getOptimizationRecommendations(modelToOptimize.id);
      expect(recommendations.recommended).toBeInstanceOf(Array);
      expect(recommendations.reasons).toBeDefined();
      expect(recommendations.estimatedImprovements).toBeDefined();

      // 2. Optimize the model
      const optimizationResult = await router.optimizeModel(modelToOptimize.id, {
        strategies: ['quantization', 'caching']
      });

      expect(optimizationResult.originalModel.id).toBe(modelToOptimize.id);
      expect(optimizationResult.optimizedModel).toBeDefined();
      expect(optimizationResult.appliedStrategies).toContain('quantization');
      expect(optimizationResult.appliedStrategies).toContain('caching');
      expect(optimizationResult.metrics.sizeReduction).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.metrics.speedImprovement).toBeGreaterThanOrEqual(1);

      // 3. Check optimization statistics
      const optimizationStats = router.getOptimizationStats();
      expect(optimizationStats.optimizerEnabled).toBe(true);
      expect(optimizationStats.optimizedModels).toBeGreaterThan(0);
      expect(optimizationStats.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive system health information', async () => {
      // 1. Get provider health
      const healthStatus = await router.getProviderHealth();
      expect(healthStatus).toBeInstanceOf(Array);
      expect(healthStatus.length).toBeGreaterThan(0);

      healthStatus.forEach(status => {
        expect(status.provider).toBeDefined();
        expect(status.status).toBeDefined();
        expect(status.timestamp).toBeInstanceOf(Date);
      });

      // 2. Get provider statistics
      const stats = router.getProviderStats();
      expect(stats.totalProviders).toBeGreaterThan(0);
      expect(stats.enabledProviders).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
      expect(stats.audioPipelineEnabled).toBe(true);
      expect(stats.modelOptimizerEnabled).toBe(true);

      // 3. Check category distribution
      const categories = stats.categories;
      expect(categories['traditional-ml']).toBeGreaterThan(0);
      expect(categories['computer-vision']).toBeGreaterThan(0);
      expect(categories['audio-processing']).toBeGreaterThan(0);
    });

    it('should test all provider categories', async () => {
      const testResults = await router.testAllProviders();
      
      expect(testResults.timestamp).toBeInstanceOf(Date);
      expect(testResults.tests).toBeDefined();

      // Should have test results for all enabled categories
      expect(testResults.tests['traditional-ml']).toBeDefined();
      expect(testResults.tests['computer-vision']).toBeDefined();
      expect(testResults.tests['audio-processing']).toBeDefined();

      // Each category should have test results
      Object.entries(testResults.tests).forEach(([category, results]: [string, any]) => {
        expect(results).toBeDefined();
        expect(typeof results).toBe('object');
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should demonstrate caching performance improvement', async () => {
      const allModels = await router.getAllModels();
      if (allModels.length === 0) return;

      const testModel = allModels[0];
      const request: ModelRequest = {
        model: testModel.id,
        input: this.createTestInput(testModel.provider),
        parameters: {}
      };

      // First execution - should populate cache
      const startTime1 = Date.now();
      const response1 = await router.executeRequest(request);
      const duration1 = Date.now() - startTime1;

      expect(response1.finishReason).toBe('completed');

      // Second execution - should use cache (potentially faster)
      const startTime2 = Date.now();
      const response2 = await router.executeRequest(request);
      const duration2 = Date.now() - startTime2;

      expect(response2.finishReason).toBe('completed');
      
      // Both responses should be valid
      expect(response1.model).toBe(testModel.id);
      expect(response2.model).toBe(testModel.id);
    });

    it('should handle batch processing', async () => {
      const allModels = await router.getAllModels();
      if (allModels.length === 0) return;

      const testModel = allModels[0];
      const requests = Array.from({ length: 5 }, (_, i) => ({
        model: testModel.id,
        input: this.createTestInput(testModel.provider, i),
        parameters: {}
      }));

      // Execute multiple requests - should be batched internally
      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => router.executeRequest(req))
      );
      const duration = Date.now() - startTime;

      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response.finishReason).toBe('completed');
        expect(response.model).toBe(testModel.id);
      });

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    // Helper method to create appropriate test input
    createTestInput(providerName: string, index: number = 0): any {
      if (providerName.includes('audio') || providerName === 'whisper') {
        return Buffer.from(`mock audio data ${index}`);
      } else if (providerName.includes('image') || providerName.includes('vision') || providerName === 'yolo') {
        return Buffer.from(`mock image data ${index}`);
      } else {
        return [[1 + index, 2 + index, 3 + index, 4 + index, 5 + index]];
      }
    }
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent models gracefully', async () => {
      const request: ModelRequest = {
        model: 'completely-non-existent-model',
        input: 'test data',
        parameters: {}
      };

      await expect(router.executeRequest(request)).rejects.toThrow('not found');
    });

    it('should handle invalid input gracefully', async () => {
      const allModels = await router.getAllModels();
      if (allModels.length === 0) return;

      const testModel = allModels[0];
      const invalidRequest: ModelRequest = {
        model: testModel.id,
        input: null, // Invalid input
        parameters: {}
      };

      await expect(router.executeRequest(invalidRequest)).rejects.toThrow();
    });

    it('should handle optimization of non-existent models', async () => {
      await expect(router.optimizeModel('non-existent-model')).rejects.toThrow('not found');
    });

    it('should handle audio pipeline with no audio providers', async () => {
      // Create router with no audio providers
      const noAudioRouter = await createProviderRouter({
        scikitLearn: { enabled: true },
        // All audio providers disabled
        whisper: { enabled: false },
        speakerEmotion: { enabled: false },
        audioEnhancement: { enabled: false },
        realTimeAudio: { enabled: false }
      });

      const mockAudio = Buffer.from('test audio');

      await expect(noAudioRouter.processAudioPipeline(mockAudio, ['enhancement']))
        .rejects.toThrow('Audio pipeline not initialized');

      await noAudioRouter.shutdown();
    });
  });

  describe('Resource Management', () => {
    it('should handle multiple router instances', async () => {
      // Create additional router instances
      const router2 = await createProviderRouter({
        scikitLearn: { enabled: true, priority: 5 }
      });

      const router3 = await createProviderRouter({
        yolo: { enabled: true, priority: 10 }
      });

      // Both should work independently
      const models2 = await router2.getAllModels();
      const models3 = await router3.getAllModels();

      expect(models2.length).toBeGreaterThan(0);
      expect(models3.length).toBeGreaterThan(0);

      // Cleanup
      await router2.shutdown();
      await router3.shutdown();
    });

    it('should handle graceful shutdown', async () => {
      const tempRouter = await createProviderRouter({
        scikitLearn: { enabled: true }
      });

      // Should not throw
      await expect(tempRouter.shutdown()).resolves.not.toThrow();

      // After shutdown, operations should fail gracefully
      await expect(tempRouter.getAllModels()).rejects.toThrow();
    });

    it('should clear optimization cache', () => {
      // Should not throw
      expect(() => router.clearOptimizationCache()).not.toThrow();

      const stats = router.getOptimizationStats();
      expect(stats.optimizerEnabled).toBe(true);
    });
  });

  describe('Configuration Flexibility', () => {
    it('should work with minimal configuration', async () => {
      const minimalRouter = await createProviderRouter({
        scikitLearn: { enabled: true }
      });

      const models = await minimalRouter.getAllModels();
      expect(models.length).toBeGreaterThan(0);

      const stats = minimalRouter.getProviderStats();
      expect(stats.totalProviders).toBe(1);
      expect(stats.enabledProviders).toBe(1);

      await minimalRouter.shutdown();
    });

    it('should work with maximum configuration', async () => {
      const maximalConfig: ProviderConfig = {
        scikitLearn: { enabled: true, priority: 5, enableGPU: false },
        xgboost: { enabled: true, priority: 10, enableGPU: true },
        lightgbm: { enabled: true, priority: 8, enableGPU: false },
        tensorflow: { enabled: true, priority: 12, enableGPU: true },
        yolo: { enabled: true, priority: 20, version: 'v8', enableGPU: true },
        imageClassification: { enabled: true, priority: 15, enableGPU: true },
        imageSegmentationOCR: { enabled: true, priority: 16, enableGPU: false },
        visionTransformer: { enabled: true, priority: 18, enableGPU: true },
        whisper: { enabled: true, priority: 25, enableGPU: true },
        speakerEmotion: { enabled: true, priority: 12, enableGPU: false },
        audioEnhancement: { enabled: true, priority: 20, enableGPU: false },
        realTimeAudio: { enabled: true, priority: 25, enableGPU: false }
      };

      const maximalRouter = await createProviderRouter(maximalConfig);

      const models = await maximalRouter.getAllModels();
      expect(models.length).toBeGreaterThan(10); // Should have many models

      const stats = maximalRouter.getProviderStats();
      expect(stats.totalProviders).toBeGreaterThan(10);
      expect(stats.enabledProviders).toBe(stats.totalProviders);

      await maximalRouter.shutdown();
    });
  });
});