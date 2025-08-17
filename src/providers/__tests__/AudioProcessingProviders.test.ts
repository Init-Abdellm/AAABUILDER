import { SpeakerEmotionProvider } from '../SpeakerEmotionProvider';
import { AudioEnhancementProvider } from '../AudioEnhancementProvider';
import { RealTimeAudioProvider } from '../RealTimeAudioProvider';
import { 
  registerAudioProviders, 
  unregisterAudioProviders, 
  getAudioProviderHealth,
  getAvailableAudioModels,
  testAudioProviders,
  AudioProcessingPipeline,
  DEFAULT_AUDIO_CONFIG
} from '../AudioProviders';
import { ModelRegistry } from '../ModelRegistry';
import { ModelRequest } from '../ModelProvider';

describe('Audio Processing Providers', () => {
  let registry: ModelRegistry;
  let speakerEmotionProvider: SpeakerEmotionProvider;
  let audioEnhancementProvider: AudioEnhancementProvider;
  let realTimeAudioProvider: RealTimeAudioProvider;

  beforeEach(() => {
    registry = new ModelRegistry();
    speakerEmotionProvider = new SpeakerEmotionProvider();
    audioEnhancementProvider = new AudioEnhancementProvider();
    realTimeAudioProvider = new RealTimeAudioProvider();
  });

  afterEach(async () => {
    await registry.shutdown();
    await speakerEmotionProvider.cleanup();
    await audioEnhancementProvider.cleanup();
    await realTimeAudioProvider.cleanup();
  });

  describe('Provider Initialization', () => {
    it('should initialize all audio providers with default config', () => {
      expect(speakerEmotionProvider.getName()).toBe('speaker-emotion');
      expect(speakerEmotionProvider.getType()).toBe('audio-analysis');
      
      expect(audioEnhancementProvider.getName()).toBe('audio-enhancement');
      expect(audioEnhancementProvider.getType()).toBe('audio-processing');
      
      expect(realTimeAudioProvider.getName()).toBe('real-time-audio');
      expect(realTimeAudioProvider.getType()).toBe('audio-streaming');
    });

    it('should initialize providers with custom config', () => {
      const customSpeakerProvider = new SpeakerEmotionProvider({
        backend: 'speechbrain',
        speakerThreshold: 0.8,
        emotionThreshold: 0.7
      });

      const customEnhancementProvider = new AudioEnhancementProvider({
        backend: 'facebook-denoiser',
        sampleRate: 48000,
        noiseReductionLevel: 0.9
      });

      const customRealTimeProvider = new RealTimeAudioProvider({
        backend: 'websocket',
        maxLatency: 30,
        enableVAD: false
      });

      expect(customSpeakerProvider.getName()).toBe('speaker-emotion');
      expect(customEnhancementProvider.getName()).toBe('audio-enhancement');
      expect(customRealTimeProvider.getName()).toBe('real-time-audio');
    });
  });

  describe('Model Type Support', () => {
    it('should support correct model types for each provider', () => {
      // Speaker Emotion Provider
      expect(speakerEmotionProvider.supports('ASR')).toBe(true);
      expect(speakerEmotionProvider.supports('CNN')).toBe(true);
      expect(speakerEmotionProvider.supports('Transformer')).toBe(true);
      expect(speakerEmotionProvider.supports('LLM')).toBe(false);

      // Audio Enhancement Provider
      expect(audioEnhancementProvider.supports('RNN')).toBe(true);
      expect(audioEnhancementProvider.supports('CNN')).toBe(true);
      expect(audioEnhancementProvider.supports('GAN')).toBe(true);
      expect(audioEnhancementProvider.supports('Vision')).toBe(false);

      // Real-time Audio Provider
      expect(realTimeAudioProvider.supports('RNN')).toBe(true);
      expect(realTimeAudioProvider.supports('CNN')).toBe(true);
      expect(realTimeAudioProvider.supports('Transformer')).toBe(true);
      expect(realTimeAudioProvider.supports('Diffusion')).toBe(false);
    });
  });

  describe('Model Listing', () => {
    it('should list models for speaker emotion provider', async () => {
      const models = await speakerEmotionProvider.listModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);

      // Check for speaker identification models
      const speakerModels = models.filter(m => m.metadata.category === 'speaker-identification');
      expect(speakerModels.length).toBeGreaterThan(0);

      // Check for emotion detection models
      const emotionModels = models.filter(m => m.metadata.category === 'emotion-detection');
      expect(emotionModels.length).toBeGreaterThan(0);

      // Verify model structure
      const firstModel = models[0];
      expect(firstModel.id).toBeDefined();
      expect(firstModel.name).toBeDefined();
      expect(firstModel.type).toBeDefined();
      expect(firstModel.provider).toBe('speaker-emotion');
      expect(firstModel.available).toBe(true);
    });

    it('should list models for audio enhancement provider', async () => {
      const models = await audioEnhancementProvider.listModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);

      // Check for noise reduction models
      const noiseReductionModels = models.filter(m => m.metadata.category === 'noise-reduction');
      expect(noiseReductionModels.length).toBeGreaterThan(0);

      // Check for speech enhancement models
      const enhancementModels = models.filter(m => m.metadata.category === 'speech-enhancement');
      expect(enhancementModels.length).toBeGreaterThan(0);

      // Verify RNNoise model exists
      const rnnoise = models.find(m => m.id === 'rnnoise-v1');
      expect(rnnoise).toBeDefined();
      expect(rnnoise?.type).toBe('RNN');
    });

    it('should list models for real-time audio provider', async () => {
      const models = await realTimeAudioProvider.listModels();
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);

      // Check for transcription models
      const transcriptionModels = models.filter(m => m.metadata.category === 'real-time-transcription');
      expect(transcriptionModels.length).toBeGreaterThan(0);

      // Check for streaming models
      const streamingModels = models.filter(m => m.id.includes('streaming'));
      expect(streamingModels.length).toBeGreaterThan(0);

      // Verify Whisper streaming model exists
      const whisperStreaming = models.find(m => m.id === 'whisper-streaming');
      expect(whisperStreaming).toBeDefined();
      expect(whisperStreaming?.type).toBe('Transformer');
    });
  });

  describe('Audio Processing Execution', () => {
    const mockAudioBuffer = Buffer.from('mock audio data for testing');

    it('should execute speaker identification', async () => {
      const request: ModelRequest = {
        model: 'ecapa-tdnn-speaker-id',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await speakerEmotionProvider.execute(request);
      
      expect(response.content.speaker_analysis).toBeDefined();
      expect(response.content.speaker_analysis.speakers).toBeInstanceOf(Array);
      expect(response.content.speaker_analysis.total_speakers).toBeGreaterThan(0);
      expect(response.metadata?.provider).toBe('speaker-emotion');
      expect(response.metadata?.analysis_type).toBe('speaker-identification');
      expect(response.finishReason).toBe('completed');
    });

    it('should execute emotion detection', async () => {
      const request: ModelRequest = {
        model: 'wav2vec2-emotion-recognition',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await speakerEmotionProvider.execute(request);
      
      expect(response.content.emotion_analysis).toBeDefined();
      expect(response.content.emotion_analysis.emotions).toBeInstanceOf(Array);
      expect(response.content.emotion_analysis.dominant_emotion).toBeDefined();
      expect(response.content.emotion_analysis.confidence).toBeGreaterThan(0);
      expect(response.metadata?.analysis_type).toBe('emotion-detection');
    });

    it('should execute noise reduction', async () => {
      const request: ModelRequest = {
        model: 'rnnoise-v1',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await audioEnhancementProvider.execute(request);
      
      expect(response.content.enhanced_audio).toBeDefined();
      expect(response.content.quality_metrics).toBeDefined();
      expect(response.content.enhancement_type).toBe('noise-reduction');
      expect(response.metadata?.provider).toBe('audio-enhancement');
      expect(response.metadata?.enhancement_type).toBe('noise-reduction');
    });

    it('should execute speech enhancement', async () => {
      const request: ModelRequest = {
        model: 'facebook-denoiser',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await audioEnhancementProvider.execute(request);
      
      expect(response.content.enhanced_audio).toBeDefined();
      expect(response.content.quality_metrics).toBeDefined();
      expect(response.content.enhancement_type).toBe('speech-enhancement');
      expect(response.metadata?.enhancement_type).toBe('speech-enhancement');
    });

    it('should execute real-time transcription', async () => {
      const request: ModelRequest = {
        model: 'whisper-streaming',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await realTimeAudioProvider.execute(request);
      
      expect(response.content.streaming_result).toBeDefined();
      expect(response.content.streaming_type).toBe('real-time-transcription');
      expect(response.metadata?.provider).toBe('real-time-audio');
      expect(response.metadata?.streaming_type).toBe('real-time-transcription');
      expect(response.metadata?.real_time).toBe(true);
    });

    it('should execute real-time enhancement', async () => {
      const request: ModelRequest = {
        model: 'rnnoise-streaming',
        input: mockAudioBuffer,
        parameters: {}
      };

      const response = await realTimeAudioProvider.execute(request);
      
      expect(response.content.streaming_result).toBeDefined();
      expect(response.content.streaming_type).toBe('real-time-enhancement');
      expect(response.metadata?.streaming_type).toBe('real-time-enhancement');
    });
  });

  describe('Provider Registration', () => {
    it('should register all audio providers successfully', async () => {
      const result = await registerAudioProviders(registry);
      
      expect(result.speakerEmotion.registered).toBe(true);
      expect(result.speakerEmotion.provider).toBeInstanceOf(SpeakerEmotionProvider);
      
      expect(result.audioEnhancement.registered).toBe(true);
      expect(result.audioEnhancement.provider).toBeInstanceOf(AudioEnhancementProvider);
      
      expect(result.realTimeAudio.registered).toBe(true);
      expect(result.realTimeAudio.provider).toBeInstanceOf(RealTimeAudioProvider);
    });

    it('should register providers with custom config', async () => {
      const customConfig = {
        speakerEmotion: {
          enabled: true,
          priority: 20,
          backend: 'speechbrain' as const
        },
        audioEnhancement: {
          enabled: true,
          priority: 25,
          backend: 'nvidia-noisered' as const
        },
        realTimeAudio: {
          enabled: false // Disabled
        }
      };

      const result = await registerAudioProviders(registry, customConfig);
      
      expect(result.speakerEmotion.registered).toBe(true);
      expect(result.audioEnhancement.registered).toBe(true);
      expect(result.realTimeAudio.registered).toBe(false); // Disabled
    });

    it('should unregister all audio providers', async () => {
      // First register providers
      await registerAudioProviders(registry);
      
      // Verify they are registered
      expect(registry.getProvider('speaker-emotion')).not.toBeNull();
      expect(registry.getProvider('audio-enhancement')).not.toBeNull();
      expect(registry.getProvider('real-time-audio')).not.toBeNull();
      
      // Unregister
      await unregisterAudioProviders(registry);
      
      // Verify they are unregistered
      expect(registry.getProvider('speaker-emotion')).toBeNull();
      expect(registry.getProvider('audio-enhancement')).toBeNull();
      expect(registry.getProvider('real-time-audio')).toBeNull();
    });
  });

  describe('Provider Health and Testing', () => {
    beforeEach(async () => {
      await registerAudioProviders(registry);
    });

    it('should check audio provider health', async () => {
      const health = await getAudioProviderHealth(registry);
      
      expect(health.speakerEmotion).toBeDefined();
      expect(health.audioEnhancement).toBeDefined();
      expect(health.realTimeAudio).toBeDefined();
    });

    it('should get available audio models', async () => {
      const models = await getAvailableAudioModels(registry);
      
      expect(models.speakerEmotion).toBeInstanceOf(Array);
      expect(models.speakerEmotion.length).toBeGreaterThan(0);
      
      expect(models.audioEnhancement).toBeInstanceOf(Array);
      expect(models.audioEnhancement.length).toBeGreaterThan(0);
      
      expect(models.realTimeAudio).toBeInstanceOf(Array);
      expect(models.realTimeAudio.length).toBeGreaterThan(0);
    });

    it('should test audio providers', async () => {
      const testResults = await testAudioProviders(registry);
      
      expect(testResults.speakerEmotion).toBeDefined();
      expect(testResults.audioEnhancement).toBeDefined();
      expect(testResults.realTimeAudio).toBeDefined();
    });
  });

  describe('Audio Processing Pipeline', () => {
    let pipeline: AudioProcessingPipeline;

    beforeEach(async () => {
      await registerAudioProviders(registry);
      pipeline = new AudioProcessingPipeline(registry);
    });

    it('should create audio processing pipeline', () => {
      expect(pipeline).toBeInstanceOf(AudioProcessingPipeline);
    });

    it('should get recommended pipeline for different tasks', () => {
      const transcriptionPipeline = pipeline.getRecommendedPipeline('transcription');
      expect(transcriptionPipeline).toEqual(['enhancement', 'transcription']);

      const analysisPipeline = pipeline.getRecommendedPipeline('analysis');
      expect(analysisPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection']);

      const enhancementPipeline = pipeline.getRecommendedPipeline('enhancement');
      expect(enhancementPipeline).toEqual(['enhancement']);

      const fullPipeline = pipeline.getRecommendedPipeline('full');
      expect(fullPipeline).toEqual(['enhancement', 'speaker-analysis', 'emotion-detection', 'transcription']);
    });

    it('should process audio through pipeline', async () => {
      const mockAudio = Buffer.from('mock audio data');
      const pipelineStages = ['enhancement', 'speaker-analysis'];

      const result = await pipeline.processAudio(mockAudio, pipelineStages);
      
      expect(result.input).toBe(mockAudio);
      expect(result.pipeline).toEqual(pipelineStages);
      expect(result.results).toBeDefined();
      expect(result.results.enhancement).toBeDefined();
      expect(result.results.speakerAnalysis).toBeDefined();
      expect(result.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('Real-time Streaming', () => {
    beforeEach(async () => {
      await realTimeAudioProvider.initialize();
    });

    it('should start audio stream', async () => {
      const streamConfig = {
        model: 'whisper-streaming',
        sample_rate: 16000,
        frame_size: 160
      };

      const result = await realTimeAudioProvider.startStream('test-stream-1', streamConfig);
      
      expect(result.stream_id).toBe('test-stream-1');
      expect(result.status).toBe('started');
      expect(result.latency).toBeDefined();
      expect(result.sample_rate).toBeDefined();
      expect(result.frame_size).toBeDefined();

      // Cleanup
      await realTimeAudioProvider.stopStream('test-stream-1');
    });

    it('should process stream chunks', async () => {
      const streamConfig = {
        model: 'rnnoise-streaming',
        sample_rate: 16000,
        frame_size: 160
      };

      await realTimeAudioProvider.startStream('test-stream-2', streamConfig);
      
      const audioChunk = new Array(160).fill(0.1); // Mock audio chunk
      const result = await realTimeAudioProvider.processStreamChunk('test-stream-2', audioChunk);
      
      expect(result.stream_id).toBe('test-stream-2');
      expect(result.result || result.status).toBeDefined();

      // Cleanup
      await realTimeAudioProvider.stopStream('test-stream-2');
    });

    it('should stop audio stream', async () => {
      const streamConfig = {
        model: 'vad-streaming',
        sample_rate: 16000
      };

      await realTimeAudioProvider.startStream('test-stream-3', streamConfig);
      const result = await realTimeAudioProvider.stopStream('test-stream-3');
      
      expect(result.stream_id).toBe('test-stream-3');
      expect(result.status).toBe('stopped');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model requests', async () => {
      const request: ModelRequest = {
        model: 'non-existent-model',
        input: Buffer.from('test'),
        parameters: {}
      };

      await expect(speakerEmotionProvider.execute(request)).rejects.toThrow();
      await expect(audioEnhancementProvider.execute(request)).rejects.toThrow();
      await expect(realTimeAudioProvider.execute(request)).rejects.toThrow();
    });

    it('should handle invalid input', async () => {
      const request: ModelRequest = {
        model: 'ecapa-tdnn-speaker-id',
        input: null,
        parameters: {}
      };

      await expect(speakerEmotionProvider.execute(request)).rejects.toThrow('Input audio is required');
    });

    it('should handle stream errors', async () => {
      await expect(realTimeAudioProvider.processStreamChunk('non-existent-stream', [])).rejects.toThrow();
      await expect(realTimeAudioProvider.stopStream('non-existent-stream')).rejects.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate speaker emotion provider config', () => {
      const validConfig = {
        model: 'ecapa-tdnn-speaker-id',
        parameters: {
          speaker_threshold: 0.8,
          emotion_threshold: 0.7
        }
      };

      const result = speakerEmotionProvider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate audio enhancement provider config', () => {
      const validConfig = {
        model: 'rnnoise-v1',
        parameters: {
          noise_reduction_level: 0.8,
          sample_rate: 16000
        }
      };

      const result = audioEnhancementProvider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate real-time audio provider config', () => {
      const validConfig = {
        model: 'whisper-streaming',
        parameters: {
          max_latency: 100,
          buffer_size: 4800,
          sample_rate: 16000
        }
      };

      const result = realTimeAudioProvider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configurations', () => {
      const invalidConfig = {
        // Missing model
        parameters: {}
      };

      expect(speakerEmotionProvider.validateConfig(invalidConfig).valid).toBe(false);
      expect(audioEnhancementProvider.validateConfig(invalidConfig).valid).toBe(false);
      expect(realTimeAudioProvider.validateConfig(invalidConfig).valid).toBe(false);
    });
  });

  describe('Default Configuration', () => {
    it('should have valid default audio configuration', () => {
      expect(DEFAULT_AUDIO_CONFIG.speakerEmotion.enabled).toBe(true);
      expect(DEFAULT_AUDIO_CONFIG.speakerEmotion.backend).toBe('pyannote');
      expect(DEFAULT_AUDIO_CONFIG.speakerEmotion.priority).toBe(10);

      expect(DEFAULT_AUDIO_CONFIG.audioEnhancement.enabled).toBe(true);
      expect(DEFAULT_AUDIO_CONFIG.audioEnhancement.backend).toBe('rnnoise');
      expect(DEFAULT_AUDIO_CONFIG.audioEnhancement.priority).toBe(15);

      expect(DEFAULT_AUDIO_CONFIG.realTimeAudio.enabled).toBe(true);
      expect(DEFAULT_AUDIO_CONFIG.realTimeAudio.backend).toBe('webrtc');
      expect(DEFAULT_AUDIO_CONFIG.realTimeAudio.priority).toBe(20);
    });
  });
});