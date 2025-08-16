import { 
  createProviderRouter, 
  ProviderRouter, 
  ProviderConfig,
  ModelRequest,
  OptimizationConfig
} from '../src/providers';

/**
 * Example: Using the Provider Router to manage all AI/ML providers
 */
async function demonstrateProviderRouter() {
  console.log('🚀 Provider Router Demo');
  console.log('========================');

  // 1. Create router with custom configuration
  const config: ProviderConfig = {
    // Traditional ML
    scikitLearn: { enabled: true, priority: 5 },
    xgboost: { enabled: true, priority: 10, enableGPU: false },
    lightgbm: { enabled: true, priority: 10 },
    
    // Computer Vision
    yolo: { enabled: true, priority: 20, version: 'v8' },
    imageClassification: { enabled: true, priority: 15 },
    visionTransformer: { enabled: true, priority: 18 },
    
    // Audio Processing
    whisper: { enabled: true, priority: 25, backend: 'openai' },
    speakerEmotion: { enabled: true, priority: 15, backend: 'pyannote' },
    audioEnhancement: { enabled: true, priority: 20, backend: 'rnnoise' },
    realTimeAudio: { enabled: true, priority: 25, backend: 'webrtc' },
    
    // Disable some providers for this demo
    tensorflow: { enabled: false },
    imageSegmentationOCR: { enabled: false }
  };

  const router = await createProviderRouter(config);

  try {
    // 2. Get provider statistics
    console.log('\n📊 Provider Statistics:');
    const stats = router.getProviderStats();
    console.log(`Total Providers: ${stats.totalProviders}`);
    console.log(`Enabled Providers: ${stats.enabledProviders}`);
    console.log(`Audio Pipeline Enabled: ${stats.audioPipelineEnabled}`);
    console.log('Categories:', stats.categories);

    // 3. List all available models
    console.log('\n📋 Available Models:');
    const allModels = await router.getAllModels();
    console.log(`Total Models: ${allModels.length}`);
    
    // Group by provider
    const modelsByProvider = allModels.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model.name);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      console.log(`  ${provider}: ${models.length} models`);
    });

    // 4. Get models by category
    console.log('\n🎯 Models by Category:');
    const audioModels = await router.getModelsByCategory('audio-processing');
    const visionModels = await router.getModelsByCategory('computer-vision');
    const mlModels = await router.getModelsByCategory('traditional-ml');
    
    console.log(`Audio Processing: ${audioModels.length} models`);
    console.log(`Computer Vision: ${visionModels.length} models`);
    console.log(`Traditional ML: ${mlModels.length} models`);

    // 5. Execute different types of requests
    console.log('\n🔄 Executing Model Requests:');

    // Traditional ML request
    if (mlModels.length > 0) {
      const mlRequest: ModelRequest = {
        model: mlModels[0].id,
        input: [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]], // Tabular data
        parameters: {}
      };
      
      try {
        const mlResponse = await router.executeRequest(mlRequest);
        console.log(`✅ Traditional ML (${mlModels[0].name}): Success`);
        console.log(`   Finish Reason: ${mlResponse.finishReason}`);
      } catch (error) {
        console.log(`❌ Traditional ML: ${error instanceof Error ? error.message : 'Error'}`);
      }
    }

    // Computer Vision request
    if (visionModels.length > 0) {
      const visionRequest: ModelRequest = {
        model: visionModels[0].id,
        input: Buffer.from('mock image data'), // Image data
        parameters: {}
      };
      
      try {
        const visionResponse = await router.executeRequest(visionRequest);
        console.log(`✅ Computer Vision (${visionModels[0].name}): Success`);
        console.log(`   Finish Reason: ${visionResponse.finishReason}`);
      } catch (error) {
        console.log(`❌ Computer Vision: ${error instanceof Error ? error.message : 'Error'}`);
      }
    }

    // Audio Processing request
    if (audioModels.length > 0) {
      const audioRequest: ModelRequest = {
        model: audioModels[0].id,
        input: Buffer.from('mock audio data'), // Audio data
        parameters: {}
      };
      
      try {
        const audioResponse = await router.executeRequest(audioRequest);
        console.log(`✅ Audio Processing (${audioModels[0].name}): Success`);
        console.log(`   Finish Reason: ${audioResponse.finishReason}`);
      } catch (error) {
        console.log(`❌ Audio Processing: ${error instanceof Error ? error.message : 'Error'}`);
      }
    }

    // 6. Use Audio Processing Pipeline
    console.log('\n🎵 Audio Processing Pipeline:');
    try {
      const mockAudio = Buffer.from('mock audio data for pipeline');
      
      // Get recommended pipeline for transcription
      const transcriptionPipeline = router.getRecommendedAudioPipeline('transcription');
      console.log(`Transcription Pipeline: ${transcriptionPipeline.join(' → ')}`);
      
      // Process audio through pipeline
      const pipelineResult = await router.processAudioPipeline(mockAudio, transcriptionPipeline);
      console.log('✅ Audio pipeline processing completed');
      console.log(`   Stages completed: ${Object.keys(pipelineResult.results).length}`);
      
      // Try full analysis pipeline
      const analysisPipeline = router.getRecommendedAudioPipeline('full');
      console.log(`Full Analysis Pipeline: ${analysisPipeline.join(' → ')}`);
      
      const fullResult = await router.processAudioPipeline(mockAudio, analysisPipeline);
      console.log('✅ Full audio analysis completed');
      console.log(`   Analysis stages: ${Object.keys(fullResult.results).length}`);
      
    } catch (error) {
      console.log(`❌ Audio Pipeline: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // 7. Check provider health
    console.log('\n🏥 Provider Health Check:');
    try {
      const healthStatus = await router.getProviderHealth();
      const healthSummary = healthStatus.reduce((acc, status) => {
        acc[status.status] = (acc[status.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Health Summary:', healthSummary);
      
      // Show any unhealthy providers
      const unhealthyProviders = healthStatus.filter(s => s.status !== 'healthy');
      if (unhealthyProviders.length > 0) {
        console.log('⚠️  Unhealthy Providers:');
        unhealthyProviders.forEach(provider => {
          console.log(`   ${provider.provider}: ${provider.status} - ${provider.details || 'No details'}`);
        });
      } else {
        console.log('✅ All providers are healthy');
      }
    } catch (error) {
      console.log(`❌ Health Check: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // 8. Test all providers
    console.log('\n🧪 Testing All Providers:');
    try {
      const testResults = await router.testAllProviders();
      console.log(`Test completed at: ${testResults.timestamp}`);
      
      Object.entries(testResults.tests).forEach(([category, results]: [string, any]) => {
        const categoryResults = Object.entries(results);
        const successCount = categoryResults.filter(([, result]: [string, any]) => !result.error).length;
        console.log(`  ${category}: ${successCount}/${categoryResults.length} providers passed`);
      });
    } catch (error) {
      console.log(`❌ Provider Testing: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // 9. Model Optimization
    console.log('\n🔧 Model Optimization:');
    try {
      if (allModels.length > 0) {
        const modelToOptimize = allModels[0];
        
        // Get optimization recommendations
        const recommendations = await router.getOptimizationRecommendations(modelToOptimize.id);
        console.log(`Optimization recommendations for ${modelToOptimize.name}:`);
        console.log(`  Recommended strategies: ${recommendations.recommended.join(', ')}`);
        
        // Optimize the model
        const optimizationResult = await router.optimizeModel(modelToOptimize.id, {
          strategies: ['quantization', 'caching']
        });
        
        console.log('✅ Model optimization completed');
        console.log(`  Applied strategies: ${optimizationResult.appliedStrategies.join(', ')}`);
        console.log(`  Size reduction: ${optimizationResult.metrics.sizeReduction}%`);
        console.log(`  Speed improvement: ${optimizationResult.metrics.speedImprovement}x`);
        console.log(`  Accuracy loss: ${optimizationResult.metrics.accuracyLoss}%`);
        
        // Get optimization statistics
        const optimizationStats = router.getOptimizationStats();
        console.log('Optimization Statistics:');
        console.log(`  Optimizer enabled: ${optimizationStats.optimizerEnabled}`);
        if (optimizationStats.optimizerEnabled) {
          console.log(`  Optimized models: ${optimizationStats.optimizedModels}`);
          console.log(`  Cache hit rate: ${(optimizationStats.cacheHitRate * 100).toFixed(1)}%`);
          console.log(`  Average batch size: ${optimizationStats.averageBatchSize.toFixed(1)}`);
        }
      }
    } catch (error) {
      console.log(`❌ Model Optimization: ${error instanceof Error ? error.message : 'Error'}`);
    }

    console.log('\n✅ Provider Router Demo Complete!');

  } finally {
    // 9. Cleanup
    console.log('\n🧹 Cleaning up...');
    await router.shutdown();
    console.log('✅ Router shutdown complete');
  }
}

/**
 * Example: Advanced usage with specific provider access
 */
async function demonstrateAdvancedUsage() {
  console.log('\n🔧 Advanced Provider Usage');
  console.log('===========================');

  const router = await createProviderRouter({
    // Enable only audio providers for this demo
    speakerEmotion: { enabled: true, priority: 10 },
    audioEnhancement: { enabled: true, priority: 15 },
    realTimeAudio: { enabled: true, priority: 20 },
    // Disable others
    scikitLearn: { enabled: false },
    xgboost: { enabled: false },
    yolo: { enabled: false }
  });

  try {
    // Get specific provider
    const speakerProvider = router.getProvider('speaker-emotion');
    if (speakerProvider) {
      console.log('✅ Got speaker emotion provider directly');
      
      // Use provider directly
      const models = await speakerProvider.listModels();
      console.log(`   Available models: ${models.length}`);
      
      // Execute request directly on provider
      if (models.length > 0) {
        const request: ModelRequest = {
          model: models[0].id,
          input: Buffer.from('mock audio for speaker analysis'),
          parameters: {}
        };
        
        const response = await speakerProvider.execute(request);
        console.log(`   Direct execution successful: ${response.finishReason}`);
      }
    }

    // Access registry directly for advanced operations
    const registry = router.getRegistry();
    console.log('✅ Got registry for advanced operations');
    
    // Get registry statistics
    const registryStats = registry.getStats();
    console.log(`   Registry stats: ${registryStats.totalProviders} total, ${registryStats.enabledProviders} enabled`);

  } finally {
    await router.shutdown();
  }
}

/**
 * Run the demonstrations
 */
async function main() {
  try {
    await demonstrateProviderRouter();
    await demonstrateAdvancedUsage();
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateProviderRouter, demonstrateAdvancedUsage };