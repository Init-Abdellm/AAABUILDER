import { 
  ModelProvider, 
  ModelRequest, 
  ModelResponse, 
  ModelCapabilities, 
  ModelInfo, 
  ValidationResult,
  ModelConfig
} from './ModelProvider';
import { ModelType } from '../types/global';

/**
 * Enhanced Whisper Provider
 * Advanced speech-to-text with speaker diarization, timestamps, and language detection
 */
export class WhisperProvider extends ModelProvider {
  private loadedModels: Map<string, any> = new Map();
  private audioProcessor: any;

  constructor(config: Record<string, any> = {}) {
    super('whisper', 'speech-to-text', {
      backend: config.backend || 'openai-whisper', // 'openai-whisper', 'whisper-cpp', 'transformers'
      enableGPU: config.enableGPU || false,
      language: config.language || 'auto', // Auto-detect or specific language
      task: config.task || 'transcribe', // 'transcribe' or 'translate'
      enableTimestamps: config.enableTimestamps || true,
      enableSpeakerDiarization: config.enableSpeakerDiarization || false,
      enableVAD: config.enableVAD || true, // Voice Activity Detection
      chunkLength: config.chunkLength || 30, // seconds
      ...config
    });
  }

  supports(modelType: ModelType): boolean {
    const supportedTypes: ModelType[] = ['ASR', 'Transformer'];
    return supportedTypes.includes(modelType);
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Load model if not cached
      const model = await this.loadModel(request.model);
      
      // Preprocess audio
      const preprocessedAudio = await this.preprocessAudio(request.input, model);
      
      // Run speech recognition
      const transcriptionResult = await this.runTranscription(model, preprocessedAudio, request);
      
      // Post-process results
      const results = await this.postprocessTranscription(transcriptionResult, model, request);
      
      // Format response
      const response = await this.formatResponse(results, request, model);
      
      const duration = Date.now() - startTime;
      
      return {
        ...response,
        usage: {
          ...response.usage,
          duration
        }
      };

    } catch (error) {
      throw new Error(`Whisper execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['ASR', 'Transformer'],
      capabilities: [
        'speech-to-text',
        'language-detection',
        'translation',
        'timestamp-generation',
        'speaker-diarization',
        'voice-activity-detection',
        'noise-robustness',
        'multilingual'
      ],
      maxInputSize: 25 * 1024 * 1024, // 25MB audio file
      maxOutputSize: 100000, // Max characters in transcription
      streaming: true,
      fineTuning: true,
      multimodal: false,
      batchProcessing: true,
      realTime: true
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    const errors = [];
    const warnings = [];

    // Validate model name
    if (!config.model) {
      errors.push({
        field: 'model',
        message: 'Model name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate Whisper-specific parameters
    if (config.parameters) {
      this.validateWhisperParameters(config.parameters, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [
      // OpenAI Whisper Models
      {
        id: 'whisper-tiny',
        name: 'Whisper Tiny',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'tiny',
          parameters: '39M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '1.0',
          description: 'Fastest Whisper model with basic accuracy',
          category: 'speech-to-text',
          complexity: 'low',
          wer: 0.058, // Word Error Rate
          speed: '32x realtime',
          model_size: '39MB',
          parameters: '39M',
          languages: 99
        },
        available: true
      },
      {
        id: 'whisper-base',
        name: 'Whisper Base',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'base',
          parameters: '74M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '1.0',
          description: 'Balanced Whisper model for general use',
          category: 'speech-to-text',
          complexity: 'medium',
          wer: 0.045,
          speed: '16x realtime',
          model_size: '142MB',
          parameters: '74M',
          languages: 99
        },
        available: true
      },
      {
        id: 'whisper-small',
        name: 'Whisper Small',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'small',
          parameters: '244M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '1.0',
          description: 'Good accuracy Whisper model',
          category: 'speech-to-text',
          complexity: 'medium',
          wer: 0.035,
          speed: '6x realtime',
          model_size: '466MB',
          parameters: '244M',
          languages: 99
        },
        available: true
      },
      {
        id: 'whisper-medium',
        name: 'Whisper Medium',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'medium',
          parameters: '769M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '1.0',
          description: 'High accuracy Whisper model',
          category: 'speech-to-text',
          complexity: 'high',
          wer: 0.028,
          speed: '2x realtime',
          model_size: '1.5GB',
          parameters: '769M',
          languages: 99
        },
        available: true
      },
      {
        id: 'whisper-large-v2',
        name: 'Whisper Large v2',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'large-v2',
          parameters: '1550M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '2.0',
          description: 'Best accuracy Whisper model',
          category: 'speech-to-text',
          complexity: 'very-high',
          wer: 0.022,
          speed: '1x realtime',
          model_size: '3GB',
          parameters: '1550M',
          languages: 99
        },
        available: true
      },
      {
        id: 'whisper-large-v3',
        name: 'Whisper Large v3',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'large-v3',
          parameters: '1550M',
          multilingual: true,
          english_only: false
        },
        metadata: {
          version: '3.0',
          description: 'Latest Whisper model with improved accuracy',
          category: 'speech-to-text',
          complexity: 'very-high',
          wer: 0.018,
          speed: '1x realtime',
          model_size: '3GB',
          parameters: '1550M',
          languages: 99,
          latest: true
        },
        available: true
      },

      // English-only Models (faster)
      {
        id: 'whisper-tiny-en',
        name: 'Whisper Tiny English',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'tiny',
          parameters: '39M',
          multilingual: false,
          english_only: true
        },
        metadata: {
          version: '1.0',
          description: 'English-only Whisper tiny model (faster)',
          category: 'speech-to-text',
          complexity: 'low',
          wer: 0.051,
          speed: '65x realtime',
          model_size: '39MB',
          parameters: '39M',
          languages: 1,
          english_optimized: true
        },
        available: true
      },
      {
        id: 'whisper-base-en',
        name: 'Whisper Base English',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'base',
          parameters: '74M',
          multilingual: false,
          english_only: true
        },
        metadata: {
          version: '1.0',
          description: 'English-only Whisper base model (faster)',
          category: 'speech-to-text',
          complexity: 'medium',
          wer: 0.038,
          speed: '32x realtime',
          model_size: '142MB',
          parameters: '74M',
          languages: 1,
          english_optimized: true
        },
        available: true
      },

      // Distilled Models (faster inference)
      {
        id: 'whisper-distil-small-en',
        name: 'Distil-Whisper Small English',
        type: 'ASR',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          model_size: 'distil-small',
          parameters: '166M',
          multilingual: false,
          english_only: true,
          distilled: true
        },
        metadata: {
          version: '1.0',
          description: 'Distilled Whisper for 6x faster inference',
          category: 'speech-to-text',
          complexity: 'medium',
          wer: 0.035,
          speed: '12x realtime',
          model_size: '166MB',
          parameters: '166M',
          languages: 1,
          distilled: true,
          speed_optimized: true
        },
        available: true
      }
    ];

    return models;
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check backend availability
      if (this.config.backend === 'openai-whisper') {
        return await this.checkOpenAIWhisperAvailability();
      } else if (this.config.backend === 'whisper-cpp') {
        return await this.checkWhisperCppAvailability();
      } else if (this.config.backend === 'transformers') {
        return await this.checkTransformersAvailability();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize backend
      if (this.config.backend === 'openai-whisper') {
        await this.initializeOpenAIWhisper();
      } else if (this.config.backend === 'whisper-cpp') {
        await this.initializeWhisperCpp();
      } else if (this.config.backend === 'transformers') {
        await this.initializeTransformers();
      }

      // Initialize audio processor
      await this.initializeAudioProcessor();

      console.log('Enhanced Whisper provider initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Whisper provider:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateRequest(request: ModelRequest): ValidationResult {
    const errors = [];

    if (!request.input) {
      errors.push({
        field: 'input',
        message: 'Input audio is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate audio format
    if (request.input && !this.isValidAudioInput(request.input)) {
      errors.push({
        field: 'input',
        message: 'Input must be valid audio (Buffer, base64, or audio URL)',
        code: 'INVALID_TYPE'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private isValidAudioInput(input: any): boolean {
    return (
      Buffer.isBuffer(input) ||
      (typeof input === 'string' && (
        input.startsWith('data:audio/') ||
        input.startsWith('http') ||
        input.startsWith('file://')
      )) ||
      (Array.isArray(input) && input.every(val => typeof val === 'number'))
    );
  }

  private async loadModel(modelId: string): Promise<any> {
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId);
    }

    const modelInfo = await this.getModelInfo(modelId);
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Mock model loading
    const mockModel = {
      id: modelId,
      info: modelInfo,
      modelSize: modelInfo.parameters.model_size,
      multilingual: modelInfo.parameters.multilingual,
      englishOnly: modelInfo.parameters.english_only,
      transcribe: (audio: any, options: any) => this.mockTranscription(audio, modelInfo, options)
    };

    this.loadedModels.set(modelId, mockModel);
    return mockModel;
  }

  private async preprocessAudio(input: any, model: any): Promise<any> {
    // Mock audio preprocessing
    return {
      audio_data: input,
      sample_rate: 16000,
      duration: Math.random() * 60 + 10, // 10-70 seconds
      channels: 1,
      format: 'wav',
      preprocessed: true,
      vad_segments: this.config.enableVAD ? this.generateVADSegments() : null
    };
  }

  private generateVADSegments(): Array<{start: number, end: number, confidence: number}> {
    const numSegments = Math.floor(Math.random() * 5) + 2;
    const segments = [];
    let currentTime = 0;
    
    for (let i = 0; i < numSegments; i++) {
      const start = currentTime + Math.random() * 2;
      const duration = Math.random() * 8 + 2; // 2-10 seconds
      const end = start + duration;
      
      segments.push({
        start,
        end,
        confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
      });
      
      currentTime = end + Math.random() * 3; // Gap between segments
    }
    
    return segments;
  }

  private async runTranscription(model: any, preprocessedAudio: any, request: ModelRequest): Promise<any> {
    const options = {
      language: request.parameters?.language || this.config.language,
      task: request.parameters?.task || this.config.task,
      enable_timestamps: request.parameters?.enable_timestamps ?? this.config.enableTimestamps,
      enable_speaker_diarization: request.parameters?.enable_speaker_diarization ?? this.config.enableSpeakerDiarization,
      chunk_length: request.parameters?.chunk_length || this.config.chunkLength
    };

    return model.transcribe(preprocessedAudio, options);
  }

  private mockTranscription(audio: any, modelInfo: ModelInfo, options: any): any {
    const sampleTexts = [
      "Hello, welcome to our presentation on artificial intelligence and machine learning.",
      "Today we'll be discussing the latest developments in natural language processing.",
      "The weather forecast shows sunny skies with temperatures reaching 75 degrees.",
      "Please remember to submit your reports by the end of the week.",
      "Thank you for joining us today. We hope you found this session informative."
    ];

    const numSegments = Math.floor(Math.random() * 3) + 2;
    const segments = [];
    let currentTime = 0;
    
    for (let i = 0; i < numSegments; i++) {
      const text = sampleTexts[i % sampleTexts.length];
      const duration = text.length * 0.08; // ~80ms per character
      const start = currentTime;
      const end = start + duration;
      
      const segment = {
        id: i,
        text,
        start,
        end,
        confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
        language: options.language === 'auto' ? 'en' : options.language,
        no_speech_prob: Math.random() * 0.1, // Low probability of no speech
        words: options.enable_timestamps ? this.generateWordTimestamps(text, start, end) : null,
        speaker: options.enable_speaker_diarization ? `SPEAKER_${Math.floor(Math.random() * 3)}` : null
      };
      
      segments.push(segment);
      currentTime = end + Math.random() * 2; // Gap between segments
    }

    return {
      text: segments.map(s => s.text).join(' '),
      segments,
      language: options.language === 'auto' ? 'en' : options.language,
      language_probability: Math.random() * 0.3 + 0.7,
      duration: currentTime,
      model_info: {
        model_id: modelInfo.id,
        model_size: modelInfo.parameters.model_size,
        wer: modelInfo.metadata.wer,
        multilingual: modelInfo.parameters.multilingual
      }
    };
  }

  private generateWordTimestamps(text: string, segmentStart: number, segmentEnd: number): any[] {
    const words = text.split(' ');
    const segmentDuration = segmentEnd - segmentStart;
    const avgWordDuration = segmentDuration / words.length;
    
    return words.map((word, index) => {
      const start = segmentStart + (index * avgWordDuration);
      const end = start + avgWordDuration * (0.8 + Math.random() * 0.4); // Vary word duration
      
      return {
        word: word.replace(/[.,!?]/g, ''), // Remove punctuation
        start,
        end,
        confidence: Math.random() * 0.2 + 0.8
      };
    });
  }

  private async postprocessTranscription(transcriptionResult: any, model: any, request: ModelRequest): Promise<any> {
    // Apply confidence filtering
    const minConfidence = request.parameters?.min_confidence || 0.5;
    const filteredSegments = transcriptionResult.segments.filter((segment: any) => 
      segment.confidence >= minConfidence
    );

    // Speaker diarization post-processing
    let speakerStats = null;
    if (this.config.enableSpeakerDiarization) {
      speakerStats = this.calculateSpeakerStatistics(filteredSegments);
    }

    // Language detection confidence
    const languageDetection = {
      detected_language: transcriptionResult.language,
      confidence: transcriptionResult.language_probability,
      alternatives: this.generateLanguageAlternatives(transcriptionResult.language)
    };

    return {
      transcription: {
        text: filteredSegments.map((s: any) => s.text).join(' '),
        segments: filteredSegments,
        language_detection: languageDetection,
        speaker_statistics: speakerStats,
        duration: transcriptionResult.duration,
        confidence: filteredSegments.reduce((sum: number, s: any) => sum + s.confidence, 0) / filteredSegments.length
      },
      model_info: transcriptionResult.model_info
    };
  }

  private calculateSpeakerStatistics(segments: any[]): any {
    const speakerMap = new Map();
    
    segments.forEach(segment => {
      if (segment.speaker) {
        if (!speakerMap.has(segment.speaker)) {
          speakerMap.set(segment.speaker, {
            speaker_id: segment.speaker,
            total_duration: 0,
            segment_count: 0,
            words_spoken: 0
          });
        }
        
        const stats = speakerMap.get(segment.speaker);
        stats.total_duration += segment.end - segment.start;
        stats.segment_count += 1;
        stats.words_spoken += segment.text.split(' ').length;
      }
    });

    return Array.from(speakerMap.values()).map(stats => ({
      ...stats,
      speaking_percentage: (stats.total_duration / segments.reduce((sum, s) => sum + (s.end - s.start), 0)) * 100
    }));
  }

  private generateLanguageAlternatives(detectedLanguage: string): any[] {
    const alternatives = [
      { language: 'es', confidence: 0.15 },
      { language: 'fr', confidence: 0.12 },
      { language: 'de', confidence: 0.08 },
      { language: 'it', confidence: 0.05 }
    ];
    
    return alternatives.filter(alt => alt.language !== detectedLanguage);
  }

  private async formatResponse(results: any, request: ModelRequest, model: any): Promise<ModelResponse> {
    return {
      content: {
        transcription: results.transcription,
        model_info: {
          model_id: model.id,
          model_size: model.modelSize,
          multilingual: model.multilingual,
          english_only: model.englishOnly,
          wer: model.info.metadata.wer,
          speed: model.info.metadata.speed,
          languages_supported: model.info.metadata.languages
        },
        processing_info: {
          backend: this.config.backend,
          vad_enabled: this.config.enableVAD,
          speaker_diarization_enabled: this.config.enableSpeakerDiarization,
          timestamps_enabled: this.config.enableTimestamps
        }
      },
      model: request.model,
      usage: {
        inputSize: this.calculateAudioSize(request.input),
        outputSize: results.transcription.text.length,
        processingTime: 0, // Will be set by caller
        audioDuration: results.transcription.duration
      },
      finishReason: 'completed',
      metadata: {
        provider: this.name,
        backend: this.config.backend,
        language: results.transcription.language_detection.detected_language,
        confidence: results.transcription.confidence,
        segments_count: results.transcription.segments.length,
        speakers_detected: results.transcription.speaker_statistics?.length || 0
      }
    };
  }

  private calculateAudioSize(input: any): number {
    if (Buffer.isBuffer(input)) {
      return input.length;
    } else if (typeof input === 'string') {
      return input.length;
    } else if (Array.isArray(input)) {
      return input.length * 4; // Assume 32-bit samples
    }
    return 1;
  }

  private validateWhisperParameters(
    parameters: any, 
    errors: any[], 
    warnings: any[]
  ): void {
    // Validate language
    if (parameters.language !== undefined) {
      const supportedLanguages = [
        'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'
      ];
      if (!supportedLanguages.includes(parameters.language)) {
        warnings.push({
          field: 'parameters.language',
          message: 'Language may not be supported',
          suggestion: `Common languages: ${supportedLanguages.slice(0, 8).join(', ')}`
        });
      }
    }

    // Validate task
    if (parameters.task !== undefined) {
      const validTasks = ['transcribe', 'translate'];
      if (!validTasks.includes(parameters.task)) {
        errors.push({
          field: 'parameters.task',
          message: 'Task must be "transcribe" or "translate"',
          code: 'INVALID_ENUM_VALUE'
        });
      }
    }

    // Validate chunk length
    if (parameters.chunk_length !== undefined) {
      if (parameters.chunk_length < 5 || parameters.chunk_length > 60) {
        warnings.push({
          field: 'parameters.chunk_length',
          message: 'Chunk length should be between 5 and 60 seconds',
          suggestion: 'Use 30 seconds for optimal performance'
        });
      }
    }

    // Validate confidence threshold
    if (parameters.min_confidence !== undefined) {
      if (parameters.min_confidence < 0 || parameters.min_confidence > 1) {
        errors.push({
          field: 'parameters.min_confidence',
          message: 'Confidence threshold must be between 0 and 1',
          code: 'INVALID_RANGE'
        });
      }
    }
  }

  private async checkOpenAIWhisperAvailability(): Promise<boolean> {
    try {
      // Mock OpenAI Whisper availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkWhisperCppAvailability(): Promise<boolean> {
    try {
      // Mock whisper.cpp availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkTransformersAvailability(): Promise<boolean> {
    try {
      // Mock transformers availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async initializeOpenAIWhisper(): Promise<void> {
    // Mock OpenAI Whisper initialization
    console.log('OpenAI Whisper backend initialized');
  }

  private async initializeWhisperCpp(): Promise<void> {
    // Mock whisper.cpp initialization
    console.log('whisper.cpp backend initialized');
  }

  private async initializeTransformers(): Promise<void> {
    // Mock transformers initialization
    console.log('Transformers Whisper backend initialized');
  }

  private async initializeAudioProcessor(): Promise<void> {
    // Mock audio processor initialization
    this.audioProcessor = {
      initialized: true,
      sample_rate: 16000,
      channels: 1,
      vad_enabled: this.config.enableVAD
    };
  }

  async cleanup(): Promise<void> {
    // Dispose of all loaded models
    for (const [modelId, model] of this.loadedModels) {
      try {
        if (model && model.dispose) {
          model.dispose();
        }
      } catch (error) {
        console.warn(`Failed to dispose Whisper model ${modelId}:`, error);
      }
    }
    this.loadedModels.clear();

    // Cleanup audio processor
    if (this.audioProcessor && this.audioProcessor.cleanup) {
      try {
        await this.audioProcessor.cleanup();
      } catch (error) {
        console.warn('Failed to cleanup audio processor:', error);
      }
    }
  }
}