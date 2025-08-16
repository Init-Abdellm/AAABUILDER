# AAABuilder Provider System

The AAABuilder Provider System is a comprehensive, unified interface for managing all types of AI/ML model providers including traditional ML, computer vision, and audio processing models.

## Overview

The provider system consists of several key components:

- **ProviderRouter**: Central router that manages all providers
- **ModelRegistry**: Registry for discovering and managing model providers
- **ModelOptimizer**: Framework for optimizing model performance
- **AudioProcessingPipeline**: Specialized pipeline for audio processing workflows
- **Individual Providers**: Specific implementations for different model types

## Quick Start

```typescript
import { createProviderRouter, ProviderConfig } from './providers';

// Create router with configuration
const config: ProviderConfig = {
  // Traditional ML
  scikitLearn: { enabled: true, priority: 5 },
  xgboost: { enabled: true, priority: 10 },
  
  // Computer Vision
  yolo: { enabled: true, priority: 20 },
  imageClassification: { enabled: true, priority: 15 },
  
  // Audio Processing
  whisper: { enabled: true, priority: 25 },
  audioEnhancement: { enabled: true, priority: 20 },
  realTimeAudio: { enabled: true, priority: 25 }
};

const router = await createProviderRouter(config);

// Execute a model request
const response = await router.executeRequest({
  model: 'yolo-v8-detection',
  input: imageBuffer,
  parameters: {}
});

// Cleanup when done
await router.shutdown();
```

## Provider Categories

### Traditional ML Providers
- **ScikitLearnProvider**: Scikit-learn models (classification, regression, clustering)
- **XGBoostProvider**: XGBoost gradient boosting models
- **LightGBMProvider**: LightGBM gradient boosting models
- **TensorFlowProvider**: TensorFlow/Keras models

### Computer Vision Providers
- **YOLOProvider**: YOLO object detection models (v5, v8, v10)
- **ImageClassificationProvider**: ResNet, EfficientNet, MobileNet models
- **ImageSegmentationOCRProvider**: Segmentation and OCR capabilities
- **VisionTransformerProvider**: Vision Transformer (ViT) models

### Audio Processing Providers
- **WhisperProvider**: OpenAI Whisper speech-to-text
- **SpeakerEmotionProvider**: Speaker identification and emotion detection
- **AudioEnhancementProvider**: Noise reduction and audio enhancement
- **RealTimeAudioProvider**: Real-time audio streaming and processing

## Model Optimization

The system includes a comprehensive model optimization framework:

```typescript
// Get optimization recommendations
const recommendations = await router.getOptimizationRecommendations('my-model');

// Optimize a model
const result = await router.optimizeModel('my-model', {
  strategies: ['quantization', 'caching', 'batching'],
  quantization: {
    type: 'int8',
    targetAccuracyLoss: 0.05
  }
});

console.log(`Size reduction: ${result.metrics.sizeReduction}%`);
console.log(`Speed improvement: ${result.metrics.speedImprovement}x`);
```

### Optimization Strategies

1. **Quantization**: Reduce model precision (int8, fp16)
2. **Pruning**: Remove unnecessary model weights
3. **Distillation**: Create smaller student models
4. **Caching**: Cache responses for repeated requests
5. **Batching**: Process multiple requests together
6. **GPU Acceleration**: Utilize GPU for faster inference

## Audio Processing Pipeline

For audio processing tasks, use the specialized pipeline:

```typescript
// Process audio through multiple stages
const audioResult = await router.processAudioPipeline(audioBuffer, [
  'enhancement',      // Noise reduction
  'speaker-analysis', // Speaker identification
  'emotion-detection', // Emotion analysis
  'transcription'     // Speech-to-text
]);

// Get recommended pipeline for specific tasks
const pipeline = router.getRecommendedAudioPipeline('transcription');
// Returns: ['enhancement', 'transcription']
```

## Configuration

### Provider Configuration

```typescript
interface ProviderConfig {
  // Traditional ML
  scikitLearn?: {
    enabled?: boolean;
    priority?: number;
    backend?: string;
    enableGPU?: boolean;
  };
  
  // Computer Vision
  yolo?: {
    enabled?: boolean;
    priority?: number;
    version?: string; // 'v5', 'v8', 'v10'
    enableGPU?: boolean;
  };
  
  // Audio Processing
  audioEnhancement?: {
    enabled?: boolean;
    priority?: number;
    backend?: 'rnnoise' | 'facebook-denoiser' | 'nvidia-noisered';
    noiseReductionLevel?: number;
    enableRealTime?: boolean;
  };
}
```

### Optimization Configuration

```typescript
interface OptimizationConfig {
  strategies: OptimizationStrategy[];
  quantization?: {
    type: 'int8' | 'int16' | 'fp16' | 'dynamic';
    calibrationSamples?: number;
    targetAccuracyLoss?: number;
  };
  caching?: {
    enabled: boolean;
    maxCacheSize: number; // MB
    ttl: number; // seconds
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  batching?: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeout: number; // ms
  };
}
```

## Advanced Usage

### Direct Provider Access

```typescript
// Get specific provider
const yoloProvider = router.getProvider('yolo');
if (yoloProvider) {
  const models = await yoloProvider.listModels();
  const response = await yoloProvider.execute(request);
}

// Access registry directly
const registry = router.getRegistry();
const allModels = await registry.listModels();
```

### Health Monitoring

```typescript
// Check provider health
const healthStatus = await router.getProviderHealth();
healthStatus.forEach(status => {
  console.log(`${status.provider}: ${status.status}`);
});

// Get statistics
const stats = router.getProviderStats();
console.log(`Total providers: ${stats.totalProviders}`);
console.log(`Enabled providers: ${stats.enabledProviders}`);
```

### Testing Providers

```typescript
// Test all providers
const testResults = await router.testAllProviders();
Object.entries(testResults.tests).forEach(([category, results]) => {
  console.log(`${category}: ${Object.keys(results).length} providers tested`);
});
```

## Model Information

Each model provides comprehensive metadata:

```typescript
interface ModelInfo {
  id: string;                    // Unique model identifier
  name: string;                  // Human-readable name
  type: ModelType;               // CNN, RNN, Transformer, etc.
  provider: string;              // Provider name
  capabilities: ModelCapabilities;
  parameters: Record<string, any>; // Model-specific parameters
  metadata: {
    version: string;
    description: string;
    category: string;
    complexity: 'low' | 'medium' | 'high' | 'very-high';
    model_size: string;          // e.g., "25MB", "1.2GB"
    accuracy?: number;           // Model accuracy score
    latency?: string;            // e.g., "10ms", "200ms"
    [key: string]: any;          // Additional metadata
  };
  available: boolean;
  deprecated?: boolean;
}
```

## Error Handling

The provider system includes comprehensive error handling:

```typescript
try {
  const response = await router.executeRequest(request);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle model not found
  } else if (error.message.includes('Invalid request')) {
    // Handle validation errors
  } else {
    // Handle other errors
  }
}
```

## Performance Considerations

1. **Provider Priority**: Higher priority providers are tried first
2. **Caching**: Enable caching for frequently used models
3. **Batching**: Use batching for high-throughput scenarios
4. **GPU Acceleration**: Enable for compute-intensive models
5. **Model Optimization**: Apply quantization for faster inference

## Best Practices

1. **Configuration**: Start with default configuration and customize as needed
2. **Error Handling**: Always wrap provider calls in try-catch blocks
3. **Resource Management**: Call `router.shutdown()` when done
4. **Monitoring**: Regularly check provider health and statistics
5. **Optimization**: Use optimization recommendations for better performance

## Examples

See the `examples/provider-router-usage.ts` file for comprehensive usage examples including:

- Basic provider setup and configuration
- Model execution across different provider types
- Audio processing pipeline usage
- Model optimization workflows
- Health monitoring and testing
- Advanced provider management

## Testing

The provider system includes comprehensive tests:

```bash
# Run all provider tests
npm test src/providers/__tests__/

# Run specific test suites
npm test AudioProcessingProviders.test.ts
npm test ProviderRouter.test.ts
npm test ModelOptimizer.test.ts
```

## Contributing

When adding new providers:

1. Extend the `ModelProvider` base class
2. Implement all required methods
3. Add provider to `ProviderRouter`
4. Update configuration interfaces
5. Add comprehensive tests
6. Update documentation

## License

This provider system is part of the AAABuilder project and follows the same license terms.