import { ModelRegistry } from './ModelRegistry';
import { SpeakerEmotionProvider } from './SpeakerEmotionProvider';
import { AudioEnhancementProvider } from './AudioEnhancementProvider';
import { RealTimeAudioProvider } from './RealTimeAudioProvider';

/**
 * Audio Provider Configuration
 */
export interface AudioProviderConfig {
  // Speaker Identification and Emotion Detection
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

  // Audio Enhancement and Noise Reduction
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

  // Real-time Audio Streaming
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
 * Default Audio Provider Configuration
 */
export const DEFAULT_AUDIO_CONFIG: Required<AudioProviderConfig> = {
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
 * Audio Provider Registration Result
 */
export interface AudioProviderRegistrationResult {
  speakerEmotion: {
    registered: boolean;
    provider?: SpeakerEmotionProvider;
    error?: string;
  };
  audioEnhancement: {
    registered: boolean;
    provider?: AudioEnhancementProvider;
    error?: string;
  };
  realTimeAudio: {
    registered: boolean;
    provider?: RealTimeAudioProvider;
    error?: string;
  };
}

/**
 * Register all audio providers with the model registry
 */
export async function registerAudioProviders(
  registry: ModelRegistry,
  config: AudioProviderConfig = {}
): Promise<AudioProviderRegistrationResult> {
  const finalConfig = mergeConfig(DEFAULT_AUDIO_CONFIG, config);
  const result: AudioProviderRegistrationResult = {
    speakerEmotion: { registered: false },
    audioEnhancement: { registered: false },
    realTimeAudio: { registered: false }
  };

  // Register Speaker Identification and Emotion Detection Provider
  if (finalConfig.speakerEmotion.enabled) {
    try {
      const provider = new SpeakerEmotionProvider(finalConfig.speakerEmotion);
      registry.register(provider, finalConfig.speakerEmotion.priority, true);
      result.speakerEmotion.registered = true;
      result.speakerEmotion.provider = provider;
      console.log('✅ Speaker Identification and Emotion Detection provider registered successfully');
    } catch (error) {
      result.speakerEmotion.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to register Speaker Identification and Emotion Detection provider:', error);
    }
  }

  // Register Audio Enhancement and Noise Reduction Provider
  if (finalConfig.audioEnhancement.enabled) {
    try {
      const provider = new AudioEnhancementProvider(finalConfig.audioEnhancement);
      registry.register(provider, finalConfig.audioEnhancement.priority, true);
      result.audioEnhancement.registered = true;
      result.audioEnhancement.provider = provider;
      console.log('✅ Audio Enhancement and Noise Reduction provider registered successfully');
    } catch (error) {
      result.audioEnhancement.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to register Audio Enhancement and Noise Reduction provider:', error);
    }
  }

  // Register Real-time Audio Streaming Provider
  if (finalConfig.realTimeAudio.enabled) {
    try {
      const provider = new RealTimeAudioProvider(finalConfig.realTimeAudio);
      registry.register(provider, finalConfig.realTimeAudio.priority, true);
      result.realTimeAudio.registered = true;
      result.realTimeAudio.provider = provider;
      console.log('✅ Real-time Audio Streaming provider registered successfully');
    } catch (error) {
      result.realTimeAudio.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to register Real-time Audio Streaming provider:', error);
    }
  }

  // Log summary
  const registeredCount = Object.values(result).filter(r => r.registered).length;
  const totalCount = Object.keys(result).length;
  console.log(`🎵 Audio providers registration complete: ${registeredCount}/${totalCount} providers registered`);

  return result;
}

/**
 * Unregister all audio providers from the model registry
 */
export async function unregisterAudioProviders(registry: ModelRegistry): Promise<void> {
  const providerNames = [
    'speaker-emotion',
    'audio-enhancement',
    'real-time-audio'
  ];

  for (const providerName of providerNames) {
    try {
      const unregistered = registry.unregister(providerName);
      if (unregistered) {
        console.log(`✅ Unregistered ${providerName} provider`);
      }
    } catch (error) {
      console.error(`❌ Failed to unregister ${providerName} provider:`, error);
    }
  }

  console.log('🎵 Audio providers unregistration complete');
}

/**
 * Get audio provider health status
 */
export async function getAudioProviderHealth(registry: ModelRegistry): Promise<{
  speakerEmotion?: any;
  audioEnhancement?: any;
  realTimeAudio?: any;
}> {
  const health: any = {};

  // Check Speaker Identification and Emotion Detection Provider
  const speakerEmotionProvider = registry.getProvider('speaker-emotion');
  if (speakerEmotionProvider) {
    try {
      health.speakerEmotion = await speakerEmotionProvider.getHealthStatus();
    } catch (error) {
      health.speakerEmotion = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check Audio Enhancement Provider
  const audioEnhancementProvider = registry.getProvider('audio-enhancement');
  if (audioEnhancementProvider) {
    try {
      health.audioEnhancement = await audioEnhancementProvider.getHealthStatus();
    } catch (error) {
      health.audioEnhancement = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check Real-time Audio Provider
  const realTimeAudioProvider = registry.getProvider('real-time-audio');
  if (realTimeAudioProvider) {
    try {
      health.realTimeAudio = await realTimeAudioProvider.getHealthStatus();
    } catch (error) {
      health.realTimeAudio = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return health;
}

/**
 * Get available audio models from all providers
 */
export async function getAvailableAudioModels(registry: ModelRegistry): Promise<{
  speakerEmotion: any[];
  audioEnhancement: any[];
  realTimeAudio: any[];
}> {
  const models: {
    speakerEmotion: any[];
    audioEnhancement: any[];
    realTimeAudio: any[];
  } = {
    speakerEmotion: [],
    audioEnhancement: [],
    realTimeAudio: []
  };

  // Get Speaker Identification and Emotion Detection models
  const speakerEmotionProvider = registry.getProvider('speaker-emotion');
  if (speakerEmotionProvider) {
    try {
      models.speakerEmotion = await speakerEmotionProvider.listModels();
    } catch (error) {
      console.warn('Failed to get speaker emotion models:', error);
    }
  }

  // Get Audio Enhancement models
  const audioEnhancementProvider = registry.getProvider('audio-enhancement');
  if (audioEnhancementProvider) {
    try {
      models.audioEnhancement = await audioEnhancementProvider.listModels();
    } catch (error) {
      console.warn('Failed to get audio enhancement models:', error);
    }
  }

  // Get Real-time Audio models
  const realTimeAudioProvider = registry.getProvider('real-time-audio');
  if (realTimeAudioProvider) {
    try {
      models.realTimeAudio = await realTimeAudioProvider.listModels();
    } catch (error) {
      console.warn('Failed to get real-time audio models:', error);
    }
  }

  return models;
}

/**
 * Test audio providers with sample data
 */
export async function testAudioProviders(registry: ModelRegistry): Promise<{
  speakerEmotion: any;
  audioEnhancement: any;
  realTimeAudio: any;
}> {
  const results: any = {};

  // Test Speaker Identification and Emotion Detection
  const speakerEmotionProvider = registry.getProvider('speaker-emotion');
  if (speakerEmotionProvider) {
    try {
      const testRequest = {
        model: 'ecapa-tdnn-speaker-id',
        input: Buffer.from('mock audio data'),
        parameters: {}
      };
      results.speakerEmotion = await speakerEmotionProvider.execute(testRequest);
    } catch (error) {
      results.speakerEmotion = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test Audio Enhancement
  const audioEnhancementProvider = registry.getProvider('audio-enhancement');
  if (audioEnhancementProvider) {
    try {
      const testRequest = {
        model: 'rnnoise-v1',
        input: Buffer.from('mock audio data'),
        parameters: {}
      };
      results.audioEnhancement = await audioEnhancementProvider.execute(testRequest);
    } catch (error) {
      results.audioEnhancement = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test Real-time Audio
  const realTimeAudioProvider = registry.getProvider('real-time-audio');
  if (realTimeAudioProvider) {
    try {
      const testRequest = {
        model: 'whisper-streaming',
        input: Buffer.from('mock audio data'),
        parameters: { streaming: true, stream_id: 'test-stream' }
      };
      results.realTimeAudio = await realTimeAudioProvider.execute(testRequest);
    } catch (error) {
      results.realTimeAudio = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return results;
}

/**
 * Create audio processing pipeline with multiple providers
 */
export class AudioProcessingPipeline {
  private registry: ModelRegistry;
  private config: AudioProviderConfig;

  constructor(registry: ModelRegistry, config: AudioProviderConfig = {}) {
    this.registry = registry;
    this.config = config;
  }

  /**
   * Process audio through multiple stages
   */
  async processAudio(audioInput: any, pipeline: string[]): Promise<any> {
    let currentInput = audioInput;
    const results: any = {};

    for (const stage of pipeline) {
      try {
        switch (stage) {
          case 'enhancement':
            const enhancementProvider = this.registry.getProvider('audio-enhancement');
            if (enhancementProvider) {
              const request = {
                model: 'rnnoise-v1',
                input: currentInput,
                parameters: {}
              };
              results.enhancement = await enhancementProvider.execute(request);
              currentInput = results.enhancement.content.enhanced_audio;
            }
            break;

          case 'speaker-analysis':
            const speakerProvider = this.registry.getProvider('speaker-emotion');
            if (speakerProvider) {
              const request = {
                model: 'ecapa-tdnn-speaker-id',
                input: currentInput,
                parameters: {}
              };
              results.speakerAnalysis = await speakerProvider.execute(request);
            }
            break;

          case 'emotion-detection':
            const emotionProvider = this.registry.getProvider('speaker-emotion');
            if (emotionProvider) {
              const request = {
                model: 'wav2vec2-emotion-recognition',
                input: currentInput,
                parameters: {}
              };
              results.emotionDetection = await emotionProvider.execute(request);
            }
            break;

          case 'transcription':
            const transcriptionProvider = this.registry.getProvider('real-time-audio');
            if (transcriptionProvider) {
              const request = {
                model: 'whisper-streaming',
                input: currentInput,
                parameters: {}
              };
              results.transcription = await transcriptionProvider.execute(request);
            }
            break;

          default:
            console.warn(`Unknown pipeline stage: ${stage}`);
        }
      } catch (error) {
        console.error(`Error in pipeline stage ${stage}:`, error);
        results[stage] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      input: audioInput,
      pipeline,
      results,
      processedAt: new Date()
    };
  }

  /**
   * Get recommended pipeline for audio processing task
   */
  getRecommendedPipeline(task: 'transcription' | 'analysis' | 'enhancement' | 'full'): string[] {
    switch (task) {
      case 'transcription':
        return ['enhancement', 'transcription'];
      case 'analysis':
        return ['enhancement', 'speaker-analysis', 'emotion-detection'];
      case 'enhancement':
        return ['enhancement'];
      case 'full':
        return ['enhancement', 'speaker-analysis', 'emotion-detection', 'transcription'];
      default:
        return ['enhancement'];
    }
  }
}

// Helper function to merge configurations
function mergeConfig(
  defaultConfig: Required<AudioProviderConfig>,
  userConfig: AudioProviderConfig
): Required<AudioProviderConfig> {
  return {
    speakerEmotion: { ...defaultConfig.speakerEmotion, ...userConfig.speakerEmotion },
    audioEnhancement: { ...defaultConfig.audioEnhancement, ...userConfig.audioEnhancement },
    realTimeAudio: { ...defaultConfig.realTimeAudio, ...userConfig.realTimeAudio }
  };
}

// Export all audio providers for direct use
export {
  SpeakerEmotionProvider,
  AudioEnhancementProvider,
  RealTimeAudioProvider
};