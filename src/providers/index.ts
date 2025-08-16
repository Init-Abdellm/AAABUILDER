// Main Provider Router - Central entry point for all providers
export { 
  ProviderRouter, 
  createProviderRouter,
  DEFAULT_PROVIDER_CONFIG
} from './ProviderRouter';

export type { 
  ProviderConfig,
  ProviderCategory,
  ProviderRegistrationResult
} from './ProviderRouter';

// Core Provider Infrastructure
export { ModelProvider, ModelRegistry, ModelOptimizer } from './ProviderRouter';
export type { 
  ModelRequest, 
  ModelResponse, 
  ModelCapabilities, 
  ModelInfo, 
  ValidationResult,
  ModelConfig,
  TaskType,
  ModelRecommendation,
  ProviderHealthStatus
} from './ModelProvider';

// Model Optimization
export type {
  OptimizationConfig,
  OptimizationResult,
  OptimizationStrategy,
  QuantizationType
} from './ProviderRouter';

// Audio Processing Utilities (most commonly used)
export { 
  AudioProcessingPipeline,
  registerAudioProviders,
  unregisterAudioProviders,
  DEFAULT_AUDIO_CONFIG
} from './AudioProviders';

export type { 
  AudioProviderConfig,
  AudioProviderRegistrationResult
} from './AudioProviders';

// Individual Provider Classes (for advanced use cases)
// Traditional ML
export { 
  ScikitLearnProvider,
  XGBoostProvider,
  LightGBMProvider,
  TensorFlowProvider
} from './ProviderRouter';

// Computer Vision
export { 
  YOLOProvider,
  ImageClassificationProvider,
  ImageSegmentationOCRProvider,
  VisionTransformerProvider
} from './ProviderRouter';

// Audio Processing
export { 
  WhisperProvider,
  SpeakerEmotionProvider,
  AudioEnhancementProvider,
  RealTimeAudioProvider
} from './ProviderRouter';

// Provider Validation
export { ProviderValidator } from './ProviderValidator';