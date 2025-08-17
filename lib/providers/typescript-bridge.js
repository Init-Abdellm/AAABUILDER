/**
 * TypeScript Provider Bridge
 * Connects the TypeScript providers to the JavaScript runtime
 */

const path = require('path');

// Import built TypeScript providers
const { ProviderRouter } = require('../../dist/src/providers/ProviderRouter');
const { ModelRegistry } = require('../../dist/src/providers/ModelRegistry');
const { ModelOptimizer } = require('../../dist/src/providers/ModelOptimizer');

// Import individual providers
const { ScikitLearnProvider } = require('../../dist/src/providers/ScikitLearnProvider');
const { XGBoostProvider } = require('../../dist/src/providers/XGBoostProvider');
const { LightGBMProvider } = require('../../dist/src/providers/LightGBMProvider');
const { TensorFlowProvider } = require('../../dist/src/providers/TensorFlowProvider');

const { YOLOProvider } = require('../../dist/src/providers/YOLOProvider');
const { ImageClassificationProvider } = require('../../dist/src/providers/ImageClassificationProvider');
const { ImageSegmentationOCRProvider } = require('../../dist/src/providers/ImageSegmentationOCRProvider');
const { VisionTransformerProvider } = require('../../dist/src/providers/VisionTransformerProvider');

const { WhisperProvider } = require('../../dist/src/providers/WhisperProvider');
const { SpeakerEmotionProvider } = require('../../dist/src/providers/SpeakerEmotionProvider');
const { AudioEnhancementProvider } = require('../../dist/src/providers/AudioEnhancementProvider');
const { RealTimeAudioProvider } = require('../../dist/src/providers/RealTimeAudioProvider');

/**
 * Enhanced Provider Registry that uses TypeScript providers
 */
class EnhancedProviderRegistry {
  constructor() {
    this.providerRouter = null;
    this.modelRegistry = null;
    this.modelOptimizer = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Enhanced Provider Registry with TypeScript providers...');

      // Initialize core components
      this.modelRegistry = new ModelRegistry();
      
      // Create default optimization config
      const optimizationConfig = {
        strategies: ['caching', 'batching'],
        caching: {
          enabled: true,
          maxSize: 100,
          ttl: 300000 // 5 minutes
        },
        batching: {
          enabled: true,
          maxBatchSize: 10,
          batchTimeout: 100
        }
      };
      
      this.modelOptimizer = new ModelOptimizer(this.modelRegistry, optimizationConfig);
      this.providerRouter = new ProviderRouter();

      // Initialize traditional ML providers
      const scikitProvider = new ScikitLearnProvider();
      const xgboostProvider = new XGBoostProvider();
      const lightgbmProvider = new LightGBMProvider();
      const tensorflowProvider = new TensorFlowProvider();

      // Initialize computer vision providers
      const yoloProvider = new YOLOProvider();
      const imageClassificationProvider = new ImageClassificationProvider();
      const imageSegmentationProvider = new ImageSegmentationOCRProvider();
      const visionTransformerProvider = new VisionTransformerProvider();

      // Initialize audio providers
      const whisperProvider = new WhisperProvider();
      const speakerEmotionProvider = new SpeakerEmotionProvider();
      const audioEnhancementProvider = new AudioEnhancementProvider();
      const realTimeAudioProvider = new RealTimeAudioProvider();

      // Register all providers with the registry
      const providers = [
        scikitProvider,
        xgboostProvider,
        lightgbmProvider,
        tensorflowProvider,
        yoloProvider,
        imageClassificationProvider,
        imageSegmentationProvider,
        visionTransformerProvider,
        whisperProvider,
        speakerEmotionProvider,
        audioEnhancementProvider,
        realTimeAudioProvider,
      ];

      for (const provider of providers) {
        try {
          await provider.initialize();
          this.modelRegistry.register(provider);
          console.log(`✓ Registered ${provider.getName()} provider`);
        } catch (error) {
          console.warn(`⚠ Failed to initialize ${provider.getName()}: ${error.message}`);
        }
      }

      this.initialized = true;
      console.log(`✓ Enhanced Provider Registry initialized with ${providers.length} providers`);

    } catch (error) {
      console.error('Failed to initialize Enhanced Provider Registry:', error);
      throw error;
    }
  }

  /**
   * Get provider by name
   */
  getProvider(name) {
    if (!this.initialized) {
      throw new Error('Provider registry not initialized. Call initialize() first.');
    }
    return this.modelRegistry.getProvider(name);
  }

  /**
   * Get all available providers
   */
  getAllProviders() {
    if (!this.initialized) {
      throw new Error('Provider registry not initialized. Call initialize() first.');
    }
    return this.modelRegistry.getEnabledProviders();
  }

  /**
   * Get providers by category
   */
  getProvidersByCategory(category) {
    if (!this.initialized) {
      throw new Error('Provider registry not initialized. Call initialize() first.');
    }
    return this.modelRegistry.getEnabledProviders().filter(p => 
      p.provider.getType() === category
    );
  }

  /**
   * Get model registry
   */
  getModelRegistry() {
    return this.modelRegistry;
  }

  /**
   * Get model optimizer
   */
  getModelOptimizer() {
    return this.modelOptimizer;
  }

  /**
   * Get provider router
   */
  getProviderRouter() {
    return this.providerRouter;
  }

  /**
   * Execute a model request through the provider system
   */
  async executeRequest(request) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use the provider router to handle the request
      return await this.providerRouter.route(request);
    } catch (error) {
      console.error('Failed to execute provider request:', error);
      throw error;
    }
  }

  /**
   * Get provider health status
   */
  async getProviderHealth() {
    if (!this.initialized) {
      return { status: 'not_initialized', providers: [] };
    }

    const providers = this.getAllProviders();
    const healthChecks = await Promise.allSettled(
      providers.map(async (p) => {
        try {
          const health = await p.provider.getHealth();
          return {
            name: p.provider.getName(),
            status: health.status,
            details: health
          };
        } catch (error) {
          return {
            name: p.provider.getName(),
            status: 'error',
            error: error.message
          };
        }
      })
    );

    return {
      status: 'initialized',
      providers: healthChecks.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      )
    };
  }
}

// Create singleton instance
const enhancedRegistry = new EnhancedProviderRegistry();

module.exports = {
  EnhancedProviderRegistry,
  enhancedRegistry,
  
  // Export individual provider classes for backward compatibility
  ScikitLearnProvider,
  XGBoostProvider,
  LightGBMProvider,
  TensorFlowProvider,
  YOLOProvider,
  ImageClassificationProvider,
  ImageSegmentationOCRProvider,
  VisionTransformerProvider,
  WhisperProvider,
  SpeakerEmotionProvider,
  AudioEnhancementProvider,
  RealTimeAudioProvider,
  
  // Export core components
  ProviderRouter,
  ModelRegistry,
  ModelOptimizer,
};