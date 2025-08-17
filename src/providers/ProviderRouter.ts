import { ModelRegistry } from './ModelRegistry';
import { ModelProvider, ModelRequest, ModelResponse, ModelInfo, ProviderHealthStatus } from './ModelProvider';
import { ModelOptimizer, OptimizationConfig, OptimizationResult } from './ModelOptimizer';

// Traditional ML Providers
import { ScikitLearnProvider } from './ScikitLearnProvider';
import { XGBoostProvider } from './XGBoostProvider';
import { LightGBMProvider } from './LightGBMProvider';
import { TensorFlowProvider } from './TensorFlowProvider';

// Computer Vision Providers
import { YOLOProvider } from './YOLOProvider';
import { ImageClassificationProvider } from './ImageClassificationProvider';
import { ImageSegmentationOCRProvider } from './ImageSegmentationOCRProvider';
import { VisionTransformerProvider } from './VisionTransformerProvider';

// Audio Processing Providers
import { WhisperProvider } from './WhisperProvider';
import { SpeakerEmotionProvider } from './SpeakerEmotionProvider';
import { AudioEnhancementProvider } from './AudioEnhancementProvider';
import { RealTimeAudioProvider } from './RealTimeAudioProvider';

// Audio Provider Utilities
import { 
  registerAudioProviders, 
  unregisterAudioProviders,
  AudioProcessingPipeline,
} from './AudioProviders';

/**
 * Provider Categories for Organization
 */
export type ProviderCategory = 
  | 'traditional-ml' 
  | 'computer-vision' 
  | 'audio-processing' 
  | 'language-models'
  | 'multimodal'
  | 'specialized';

/**
 * Provider Configuration Interface
 */
export interface ProviderConfig {
  // Traditional ML
  scikitLearn?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  xgboost?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  lightgbm?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  tensorflow?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };

  // Computer Vision
  yolo?: {
    enabled?: boolean;
    priority?: number;
    version?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  imageClassification?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  imageSegmentationOCR?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  visionTransformer?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };

  // Audio Processing - Use proper types from AudioProviders
  whisper?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
    [key: string]: any;
  };
  speakerEmotion?: {
    enabled?: boolean;
    priority?: number;
    backend?: 'pyannote' | 'speechbrain' | 'wav2vec2';
    enableGPU?: boolean;
    speakerEmbeddingModel?: string;
    emotionModel?: string;
    minSpeechDuration?: number;
    speakerThreshold?: number;
    emotionThreshold?: number;
    enableVoiceActivityDetection?: boolean;
  };
  audioEnhancement?: {
    enabled?: boolean;
    priority?: number;
    backend?: 'rnnoise' | 'facebook-denoiser' | 'nvidia-noisered';
    enableGPU?: boolean;
    sampleRate?: number;
    frameSize?: number;
    hopSize?: number;
    enableRealTime?: boolean;
    noiseReductionLevel?: number;
    enhancementLevel?: number;
    preserveSpeech?: boolean;
  };
  realTimeAudio?: {
    enabled?: boolean;
    priority?: number;
    backend?: 'webrtc' | 'websocket' | 'grpc';
    enableGPU?: boolean;
    sampleRate?: number;
    frameSize?: number;
    bufferSize?: number;
    maxLatency?: number;
    enableEchoCancellation?: boolean;
    enableNoiseReduction?: boolean;
    enableVAD?: boolean;
    compressionCodec?: string;
  };
}

/**
 * Default Provider Configuration
 */
export const DEFAULT_PROVIDER_CONFIG: Required<ProviderConfig> = {
  // Traditional ML
  scikitLearn: {
    enabled: true,
    priority: 5,
    backend: 'sklearn',
    enableGPU: false
  },
  xgboost: {
    enabled: true,
    priority: 10,
    backend: 'xgboost',
    enableGPU: false
  },
  lightgbm: {
    enabled: true,
    priority: 10,
    backend: 'lightgbm',
    enableGPU: false
  },
  tensorflow: {
    enabled: true,
    priority: 15,
    backend: 'tensorflow',
    enableGPU: false
  },

  // Computer Vision
  yolo: {
    enabled: true,
    priority: 20,
    version: 'v8',
    enableGPU: false
  },
  imageClassification: {
    enabled: true,
    priority: 15,
    backend: 'tensorflow',
    enableGPU: false
  },
  imageSegmentationOCR: {
    enabled: true,
    priority: 15,
    backend: 'opencv',
    enableGPU: false
  },
  visionTransformer: {
    enabled: true,
    priority: 18,
    backend: 'transformers',
    enableGPU: false
  },

  // Audio Processing
  whisper: {
    enabled: true,
    priority: 20,
    backend: 'openai',
    enableGPU: false
  },
  speakerEmotion: {
    enabled: true,
    priority: 10,
    backend: 'pyannote',
    enableGPU: false,
    speakerEmbeddingModel: 'ecapa-tdnn',
    emotionModel: 'wav2vec2-emotion',
    minSpeechDuration: 0.5,
    speakerThreshold: 0.7,
    emotionThreshold: 0.6,
    enableVoiceActivityDetection: true
  },
  audioEnhancement: {
    enabled: true,
    priority: 15,
    backend: 'rnnoise',
    enableGPU: false,
    sampleRate: 16000,
    frameSize: 480,
    hopSize: 160,
    enableRealTime: true,
    noiseReductionLevel: 0.8,
    enhancementLevel: 0.6,
    preserveSpeech: true
  },
  realTimeAudio: {
    enabled: true,
    priority: 20,
    backend: 'webrtc',
    enableGPU: false,
    sampleRate: 16000,
    frameSize: 160,
    bufferSize: 4800,
    maxLatency: 50,
    enableEchoCancellation: true,
    enableNoiseReduction: true,
    enableVAD: true,
    compressionCodec: 'opus'
  }
};

/**
 * Provider Registration Result
 */
export interface ProviderRegistrationResult {
  [providerName: string]: {
    registered: boolean;
    provider?: ModelProvider;
    error?: string;
    category: ProviderCategory;
  };
}

/**
 * Provider Router Class
 * Central router for managing all model providers
 */
export class ProviderRouter {
  private registry: ModelRegistry;
  private config: ProviderConfig;
  private registeredProviders: Map<string, ModelProvider> = new Map();
  private audioPipeline: AudioProcessingPipeline | undefined;
  private modelOptimizer: ModelOptimizer | undefined;

  constructor(config: ProviderConfig = {}) {
    this.registry = new ModelRegistry();
    this.config = this.mergeConfig(DEFAULT_PROVIDER_CONFIG, config);
  }

  /**
   * Initialize and register all providers
   */
  async initializeAllProviders(): Promise<ProviderRegistrationResult> {
    console.log('🚀 Initializing Provider Router...');
    
    const result: ProviderRegistrationResult = {};

    // Register Traditional ML Providers
    await this.registerTraditionalMLProviders(result);

    // Register Computer Vision Providers
    await this.registerComputerVisionProviders(result);

    // Register Audio Processing Providers
    await this.registerAudioProcessingProviders(result);

    // Initialize Audio Processing Pipeline
    if (this.hasAudioProviders()) {
      const audioPipelineConfig: any = {
        ...(this.config.speakerEmotion ? { speakerEmotion: this.config.speakerEmotion } : {}),
        ...(this.config.audioEnhancement ? { audioEnhancement: this.config.audioEnhancement } : {}),
        ...(this.config.realTimeAudio ? { realTimeAudio: this.config.realTimeAudio } : {})
      };
      this.audioPipeline = new AudioProcessingPipeline(this.registry, audioPipelineConfig);
    }

    // Initialize Model Optimizer
    const optimizationConfig: OptimizationConfig = {
      strategies: ['quantization', 'caching', 'batching', 'gpu-acceleration'],
      quantization: {
        type: 'int8',
        calibrationSamples: 100,
        preserveAccuracy: true,
        targetAccuracyLoss: 0.05
      },
      caching: {
        enabled: true,
        maxCacheSize: 500, // 500MB
        ttl: 1800, // 30 minutes
        strategy: 'lru'
      },
      batching: {
        enabled: true,
        maxBatchSize: 16,
        batchTimeout: 100,
        dynamicBatching: true
      },
      gpuAcceleration: {
        enabled: false, // Disabled by default
        deviceId: 0,
        memoryFraction: 0.8,
        allowGrowth: true
      }
    };

    this.modelOptimizer = new ModelOptimizer(this.registry, optimizationConfig);

    // Log summary
    const registeredCount = Object.values(result).filter(r => r.registered).length;
    const totalCount = Object.keys(result).length;
    console.log(`🎉 Provider Router initialized: ${registeredCount}/${totalCount} providers registered`);

    return result;
  }

  /**
   * Get the model registry
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Get a specific provider by name
   */
  getProvider(providerName: string): ModelProvider | null {
    return this.registry.getProvider(providerName);
  }

  /**
   * Execute a model request through the appropriate provider
   */
  async executeRequest(request: ModelRequest): Promise<ModelResponse> {
    // Use optimized execution if optimizer is available
    if (this.modelOptimizer) {
      return await this.modelOptimizer.executeOptimized(request);
    }

    // Fallback to direct execution
    const models = await this.registry.listModels();
    const targetModel = models.find(m => m.id === request.model);
    
    if (!targetModel) {
      throw new Error(`Model '${request.model}' not found in any registered provider`);
    }

    const provider = this.registry.getProvider(targetModel.provider);
    if (!provider) {
      throw new Error(`Provider '${targetModel.provider}' not found or not enabled`);
    }

    return await provider.execute(request);
  }

  /**
   * Optimize a model with specified strategies
   */
  async optimizeModel(modelId: string, config?: Partial<OptimizationConfig>): Promise<OptimizationResult> {
    if (!this.modelOptimizer) {
      throw new Error('Model optimizer not initialized');
    }
    return await this.modelOptimizer.optimizeModel(modelId, config);
  }

  /**
   * Get optimization recommendations for a model
   */
  async getOptimizationRecommendations(modelId: string): Promise<any> {
    if (!this.modelOptimizer) {
      throw new Error('Model optimizer not initialized');
    }
    return await this.modelOptimizer.getOptimizationRecommendations(modelId);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): any {
    if (!this.modelOptimizer) {
      return { optimizerEnabled: false };
    }
    return {
      optimizerEnabled: true,
      ...this.modelOptimizer.getOptimizationStats()
    };
  }

  /**
   * Clear optimization cache
   */
  clearOptimizationCache(): void {
    if (this.modelOptimizer) {
      this.modelOptimizer.clearCache();
    }
  }

  /**
   * Get all available models across all providers
   */
  async getAllModels(): Promise<ModelInfo[]> {
    return await this.registry.listModels();
  }

  /**
   * Get models by category
   */
  async getModelsByCategory(category: ProviderCategory): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(model => this.getProviderCategory(model.provider) === category);
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<ProviderHealthStatus[]> {
    return await this.registry.getHealthStatus();
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): any {
    const stats = this.registry.getStats();
    return {
      ...stats,
      categories: this.getProviderCategoryStats(),
      audioPipelineEnabled: !!this.audioPipeline,
      modelOptimizerEnabled: !!this.modelOptimizer
    };
  }

  /**
   * Process audio through the audio pipeline
   */
  async processAudioPipeline(audioInput: any, pipeline: string[]): Promise<any> {
    if (!this.audioPipeline) {
      throw new Error('Audio pipeline not initialized. Ensure audio providers are enabled.');
    }
    return await this.audioPipeline.processAudio(audioInput, pipeline);
  }

  /**
   * Get recommended audio pipeline for a task
   */
  getRecommendedAudioPipeline(task: 'transcription' | 'analysis' | 'enhancement' | 'full'): string[] {
    if (!this.audioPipeline) {
      throw new Error('Audio pipeline not initialized');
    }
    return this.audioPipeline.getRecommendedPipeline(task);
  }

  /**
   * Test all providers
   */
  async testAllProviders(): Promise<any> {
    console.log('🧪 Testing all providers...');
    
    const results: any = {
      timestamp: new Date(),
      tests: {}
    };

    // Test each category
    const categories: ProviderCategory[] = ['traditional-ml', 'computer-vision', 'audio-processing'];
    
    for (const category of categories) {
      try {
        results.tests[category] = await this.testProviderCategory(category);
      } catch (error) {
        results.tests[category] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Provider Router...');
    
    // Cleanup audio pipeline
    if (this.audioPipeline) {
      this.audioPipeline = undefined;
    }

    // Cleanup model optimizer
    if (this.modelOptimizer) {
      await this.modelOptimizer.cleanup();
      this.modelOptimizer = undefined;
    }

    // Shutdown registry (which will cleanup all providers)
    await this.registry.shutdown();
    
    // Clear registered providers
    this.registeredProviders.clear();
    
    console.log('✅ Provider Router shutdown complete');
  }

  // Private helper methods

  private async registerTraditionalMLProviders(result: ProviderRegistrationResult): Promise<void> {
    console.log('📊 Registering Traditional ML providers...');

    // Scikit-Learn
    if (this.config.scikitLearn?.enabled) {
      try {
        const provider = new ScikitLearnProvider(this.config.scikitLearn);
        this.registry.register(provider, this.config.scikitLearn.priority, true);
        this.registeredProviders.set('scikit-learn', provider);
        result['scikit-learn'] = { registered: true, provider, category: 'traditional-ml' };
        console.log('✅ Scikit-Learn provider registered');
      } catch (error) {
        result['scikit-learn'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'traditional-ml'
        };
        console.error('❌ Failed to register Scikit-Learn provider:', error);
      }
    }

    // XGBoost
    if (this.config.xgboost?.enabled) {
      try {
        const provider = new XGBoostProvider(this.config.xgboost);
        this.registry.register(provider, this.config.xgboost.priority, true);
        this.registeredProviders.set('xgboost', provider);
        result['xgboost'] = { registered: true, provider, category: 'traditional-ml' };
        console.log('✅ XGBoost provider registered');
      } catch (error) {
        result['xgboost'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'traditional-ml'
        };
        console.error('❌ Failed to register XGBoost provider:', error);
      }
    }

    // LightGBM
    if (this.config.lightgbm?.enabled) {
      try {
        const provider = new LightGBMProvider(this.config.lightgbm);
        this.registry.register(provider, this.config.lightgbm.priority, true);
        this.registeredProviders.set('lightgbm', provider);
        result['lightgbm'] = { registered: true, provider, category: 'traditional-ml' };
        console.log('✅ LightGBM provider registered');
      } catch (error) {
        result['lightgbm'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'traditional-ml'
        };
        console.error('❌ Failed to register LightGBM provider:', error);
      }
    }

    // TensorFlow
    if (this.config.tensorflow?.enabled) {
      try {
        const provider = new TensorFlowProvider(this.config.tensorflow);
        this.registry.register(provider, this.config.tensorflow.priority, true);
        this.registeredProviders.set('tensorflow', provider);
        result['tensorflow'] = { registered: true, provider, category: 'traditional-ml' };
        console.log('✅ TensorFlow provider registered');
      } catch (error) {
        result['tensorflow'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'traditional-ml'
        };
        console.error('❌ Failed to register TensorFlow provider:', error);
      }
    }
  }

  private async registerComputerVisionProviders(result: ProviderRegistrationResult): Promise<void> {
    console.log('👁️ Registering Computer Vision providers...');

    // YOLO
    if (this.config.yolo?.enabled) {
      try {
        const provider = new YOLOProvider(this.config.yolo);
        this.registry.register(provider, this.config.yolo.priority, true);
        this.registeredProviders.set('yolo', provider);
        result['yolo'] = { registered: true, provider, category: 'computer-vision' };
        console.log('✅ YOLO provider registered');
      } catch (error) {
        result['yolo'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'computer-vision'
        };
        console.error('❌ Failed to register YOLO provider:', error);
      }
    }

    // Image Classification
    if (this.config.imageClassification?.enabled) {
      try {
        const provider = new ImageClassificationProvider(this.config.imageClassification);
        this.registry.register(provider, this.config.imageClassification.priority, true);
        this.registeredProviders.set('image-classification', provider);
        result['image-classification'] = { registered: true, provider, category: 'computer-vision' };
        console.log('✅ Image Classification provider registered');
      } catch (error) {
        result['image-classification'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'computer-vision'
        };
        console.error('❌ Failed to register Image Classification provider:', error);
      }
    }

    // Image Segmentation & OCR
    if (this.config.imageSegmentationOCR?.enabled) {
      try {
        const provider = new ImageSegmentationOCRProvider(this.config.imageSegmentationOCR);
        this.registry.register(provider, this.config.imageSegmentationOCR.priority, true);
        this.registeredProviders.set('image-segmentation-ocr', provider);
        result['image-segmentation-ocr'] = { registered: true, provider, category: 'computer-vision' };
        console.log('✅ Image Segmentation & OCR provider registered');
      } catch (error) {
        result['image-segmentation-ocr'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'computer-vision'
        };
        console.error('❌ Failed to register Image Segmentation & OCR provider:', error);
      }
    }

    // Vision Transformer
    if (this.config.visionTransformer?.enabled) {
      try {
        const provider = new VisionTransformerProvider(this.config.visionTransformer);
        this.registry.register(provider, this.config.visionTransformer.priority, true);
        this.registeredProviders.set('vision-transformer', provider);
        result['vision-transformer'] = { registered: true, provider, category: 'computer-vision' };
        console.log('✅ Vision Transformer provider registered');
      } catch (error) {
        result['vision-transformer'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'computer-vision'
        };
        console.error('❌ Failed to register Vision Transformer provider:', error);
      }
    }
  }

  private async registerAudioProcessingProviders(result: ProviderRegistrationResult): Promise<void> {
    console.log('🎵 Registering Audio Processing providers...');

    // Whisper
    if (this.config.whisper?.enabled) {
      try {
        const provider = new WhisperProvider(this.config.whisper);
        this.registry.register(provider, this.config.whisper.priority, true);
        this.registeredProviders.set('whisper', provider);
        result['whisper'] = { registered: true, provider, category: 'audio-processing' };
        console.log('✅ Whisper provider registered');
      } catch (error) {
        result['whisper'] = { 
          registered: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'audio-processing'
        };
        console.error('❌ Failed to register Whisper provider:', error);
      }
    }

    // Register advanced audio providers using the audio provider utility
    try {
      const audioConfig: any = {
        ...(this.config.speakerEmotion ? { speakerEmotion: this.config.speakerEmotion } : {}),
        ...(this.config.audioEnhancement ? { audioEnhancement: this.config.audioEnhancement } : {}),
        ...(this.config.realTimeAudio ? { realTimeAudio: this.config.realTimeAudio } : {})
      };

      const audioResult = await registerAudioProviders(this.registry, audioConfig);
      
      // Add to main result
      if (audioResult.speakerEmotion.registered) {
        this.registeredProviders.set('speaker-emotion', audioResult.speakerEmotion.provider!);
        result['speaker-emotion'] = { 
          registered: true, 
          provider: audioResult.speakerEmotion.provider!, 
          category: 'audio-processing' 
        };
      } else {
        result['speaker-emotion'] = { 
          registered: false, 
          error: audioResult.speakerEmotion.error || 'Unknown error',
          category: 'audio-processing'
        };
      }

      if (audioResult.audioEnhancement.registered) {
        this.registeredProviders.set('audio-enhancement', audioResult.audioEnhancement.provider!);
        result['audio-enhancement'] = { 
          registered: true, 
          provider: audioResult.audioEnhancement.provider!, 
          category: 'audio-processing' 
        };
      } else {
        result['audio-enhancement'] = { 
          registered: false, 
          error: audioResult.audioEnhancement.error || 'Unknown error',
          category: 'audio-processing'
        };
      }

      if (audioResult.realTimeAudio.registered) {
        this.registeredProviders.set('real-time-audio', audioResult.realTimeAudio.provider!);
        result['real-time-audio'] = { 
          registered: true, 
          provider: audioResult.realTimeAudio.provider!, 
          category: 'audio-processing' 
        };
      } else {
        result['real-time-audio'] = { 
          registered: false, 
          error: audioResult.realTimeAudio.error || 'Unknown error',
          category: 'audio-processing'
        };
      }

    } catch (error) {
      console.error('❌ Failed to register advanced audio providers:', error);
    }
  }

  private hasAudioProviders(): boolean {
    return this.registeredProviders.has('speaker-emotion') || 
           this.registeredProviders.has('audio-enhancement') || 
           this.registeredProviders.has('real-time-audio') ||
           this.registeredProviders.has('whisper');
  }

  private getProviderCategory(providerName: string): ProviderCategory {
    const categoryMap: Record<string, ProviderCategory> = {
      'scikit-learn': 'traditional-ml',
      'xgboost': 'traditional-ml',
      'lightgbm': 'traditional-ml',
      'tensorflow': 'traditional-ml',
      'yolo': 'computer-vision',
      'image-classification': 'computer-vision',
      'image-segmentation-ocr': 'computer-vision',
      'vision-transformer': 'computer-vision',
      'whisper': 'audio-processing',
      'speaker-emotion': 'audio-processing',
      'audio-enhancement': 'audio-processing',
      'real-time-audio': 'audio-processing'
    };

    return categoryMap[providerName] || 'specialized';
  }

  private getProviderCategoryStats(): Record<ProviderCategory, number> {
    const stats: Record<ProviderCategory, number> = {
      'traditional-ml': 0,
      'computer-vision': 0,
      'audio-processing': 0,
      'language-models': 0,
      'multimodal': 0,
      'specialized': 0
    };

    for (const [providerName] of this.registeredProviders) {
      const category = this.getProviderCategory(providerName);
      stats[category]++;
    }

    return stats;
  }

  private async testProviderCategory(category: ProviderCategory): Promise<any> {
    const categoryProviders = Array.from(this.registeredProviders.entries())
      .filter(([name]) => this.getProviderCategory(name) === category);

    const results: any = {};

    for (const [name, provider] of categoryProviders) {
      try {
        // Create a simple test request based on provider type
        const testRequest = await this.createTestRequest(name, provider);
        if (testRequest) {
          results[name] = await provider.execute(testRequest);
        } else {
          results[name] = { status: 'no_test_available' };
        }
      } catch (error) {
        results[name] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  private async createTestRequest(providerName: string, provider: ModelProvider): Promise<ModelRequest | null> {
    try {
      const models = await provider.listModels();
      if (models.length === 0) return null;

      const firstModel = models[0];
      if (!firstModel) return null;
      
      // Create appropriate test input based on provider type
      let testInput: any;
      
      if (providerName.includes('audio') || providerName === 'whisper') {
        testInput = Buffer.from('mock audio data');
      } else if (providerName.includes('image') || providerName.includes('vision') || providerName === 'yolo') {
        testInput = Buffer.from('mock image data');
      } else {
        // Traditional ML - use numeric array
        testInput = [[1, 2, 3, 4, 5]];
      }

      return {
        model: firstModel.id,
        input: testInput,
        parameters: {}
      };
    } catch (error) {
      return null;
    }
  }

  private mergeConfig(defaultConfig: Required<ProviderConfig>, userConfig: ProviderConfig): ProviderConfig {
    const merged: any = {};
    
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
      merged[key] = { ...defaultValue, ...userConfig[key as keyof ProviderConfig] };
    }
    
    return merged;
  }
}

/**
 * Create and initialize a Provider Router with all providers
 */
export async function createProviderRouter(config: ProviderConfig = {}): Promise<ProviderRouter> {
  const router = new ProviderRouter(config);
  await router.initializeAllProviders();
  return router;
}

/**
 * Export all provider classes for direct use
 */
export {
  // Core
  ModelRegistry,
  ModelProvider,
  ModelOptimizer,
  
  // Traditional ML
  ScikitLearnProvider,
  XGBoostProvider,
  LightGBMProvider,
  TensorFlowProvider,
  
  // Computer Vision
  YOLOProvider,
  ImageClassificationProvider,
  ImageSegmentationOCRProvider,
  VisionTransformerProvider,
  
  // Audio Processing
  WhisperProvider,
  SpeakerEmotionProvider,
  AudioEnhancementProvider,
  RealTimeAudioProvider,
  
  // Audio Utilities
  AudioProcessingPipeline,
  registerAudioProviders,
  unregisterAudioProviders
};

/**
 * Export types
 */
export type {
  ModelRequest,
  ModelResponse,
  ModelInfo,
  ProviderHealthStatus
} from './ModelProvider';

export type {
  OptimizationConfig,
  OptimizationResult,
  OptimizationStrategy,
  QuantizationType
} from './ModelOptimizer';