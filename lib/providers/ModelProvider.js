/**
 * Model Provider Base Class (JavaScript Implementation)
 * Unified interface for all AI/ML model providers
 */

/**
 * Abstract Model Provider Base Class
 * All model providers must extend this class
 */
class ModelProvider {
  constructor(name, type, config = {}) {
    if (this.constructor === ModelProvider) {
      throw new Error('ModelProvider is abstract and cannot be instantiated directly');
    }
    
    this.name = name;
    this.type = type;
    this.config = config;
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Get provider type
   */
  getType() {
    return this.type;
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if provider supports a specific model type
   * @abstract
   */
  supports(_modelType) {
    throw new Error('supports() method must be implemented by subclass');
  }

  /**
   * Execute a model request
   * @abstract
   */
  async execute(_request) {
    throw new Error('execute() method must be implemented by subclass');
  }

  /**
   * Get provider capabilities
   * @abstract
   */
  getCapabilities() {
    throw new Error('getCapabilities() method must be implemented by subclass');
  }

  /**
   * Validate model configuration
   * @abstract
   */
  validateConfig(_config) {
    throw new Error('validateConfig() method must be implemented by subclass');
  }

  /**
   * List available models
   * @abstract
   */
  async listModels() {
    throw new Error('listModels() method must be implemented by subclass');
  }

  /**
   * Get specific model information
   * @abstract
   */
  async getModelInfo(_modelId) {
    throw new Error('getModelInfo() method must be implemented by subclass');
  }

  /**
   * Check if provider is available/healthy
   * @abstract
   */
  async isAvailable() {
    throw new Error('isAvailable() method must be implemented by subclass');
  }

  /**
   * Initialize provider (setup connections, validate credentials, etc.)
   */
  async initialize() {
    // Default implementation - can be overridden
  }

  /**
   * Cleanup provider resources
   */
  async cleanup() {
    // Default implementation - can be overridden
  }

  /**
   * Get provider health status
   */
  async getHealthStatus() {
    try {
      const available = await this.isAvailable();
      return {
        provider: this.name,
        status: available ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        details: available ? 'Provider is operational' : 'Provider is not available',
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'error',
        timestamp: new Date(),
        details: error.message || 'Unknown error',
        error: error,
      };
    }
  }

  /**
   * Estimate cost for a request (optional)
   */
  async estimateCost(_request) {
    // Default implementation returns null (cost estimation not available)
    return null;
  }

  /**
   * Prepare request for execution (preprocessing, validation, etc.)
   */
  async prepareRequest(request) {
    // Default implementation - can be overridden
    return request;
  }

  /**
   * Process response after execution (postprocessing, formatting, etc.)
   */
  async processResponse(response) {
    // Default implementation - can be overridden
    return response;
  }
}

/**
 * Model Type Constants
 */
const ModelTypes = {
  LLM: 'LLM',
  SLM: 'SLM',
  MLM: 'MLM',
  Vision: 'Vision',
  ASR: 'ASR',
  TTS: 'TTS',
  RL: 'RL',
  GNN: 'GNN',
  RNN: 'RNN',
  CNN: 'CNN',
  GAN: 'GAN',
  Diffusion: 'Diffusion',
  Transformer: 'Transformer',
  MLP: 'MLP',
  Autoencoder: 'Autoencoder',
  BERT: 'BERT',
  RAG: 'RAG',
  Hybrid: 'Hybrid',
  Foundation: 'Foundation',
};

/**
 * Model Capability Constants
 */
const ModelCapabilities = {
  TEXT_GENERATION: 'text-generation',
  TEXT_COMPLETION: 'text-completion',
  TEXT_EMBEDDING: 'text-embedding',
  IMAGE_GENERATION: 'image-generation',
  IMAGE_CLASSIFICATION: 'image-classification',
  IMAGE_SEGMENTATION: 'image-segmentation',
  OBJECT_DETECTION: 'object-detection',
  FACE_RECOGNITION: 'face-recognition',
  OCR: 'ocr',
  SPEECH_TO_TEXT: 'speech-to-text',
  TEXT_TO_SPEECH: 'text-to-speech',
  VOICE_CLONING: 'voice-cloning',
  CODE_GENERATION: 'code-generation',
  CODE_COMPLETION: 'code-completion',
  CODE_ANALYSIS: 'code-analysis',
  MATHEMATICAL_REASONING: 'mathematical-reasoning',
  LOGICAL_REASONING: 'logical-reasoning',
  MULTIMODAL: 'multimodal',
  STREAMING: 'streaming',
  FINE_TUNING: 'fine-tuning',
  REINFORCEMENT_LEARNING: 'reinforcement-learning',
  GRAPH_PROCESSING: 'graph-processing',
  TIME_SERIES: 'time-series',
  ANOMALY_DETECTION: 'anomaly-detection',
  RECOMMENDATION: 'recommendation',
};

/**
 * Task Type Constants
 */
const TaskTypes = {
  TEXT_GENERATION: 'text-generation',
  TEXT_COMPLETION: 'text-completion',
  TEXT_EMBEDDING: 'text-embedding',
  IMAGE_GENERATION: 'image-generation',
  IMAGE_CLASSIFICATION: 'image-classification',
  IMAGE_ANALYSIS: 'image-analysis',
  SPEECH_TO_TEXT: 'speech-to-text',
  TEXT_TO_SPEECH: 'text-to-speech',
  AUDIO_ANALYSIS: 'audio-analysis',
  CODE_GENERATION: 'code-generation',
  CODE_COMPLETION: 'code-completion',
  CODE_ANALYSIS: 'code-analysis',
  MATHEMATICAL_REASONING: 'mathematical-reasoning',
  LOGICAL_REASONING: 'logical-reasoning',
  QUESTION_ANSWERING: 'question-answering',
  SUMMARIZATION: 'summarization',
  TRANSLATION: 'translation',
  SENTIMENT_ANALYSIS: 'sentiment-analysis',
  CLASSIFICATION: 'classification',
  CLUSTERING: 'clustering',
  ANOMALY_DETECTION: 'anomaly-detection',
  RECOMMENDATION: 'recommendation',
  FORECASTING: 'forecasting',
};

/**
 * Utility functions for validation
 */
const ValidationUtils = {
  /**
   * Create a validation result
   */
  createValidationResult(valid, errors = [], warnings = []) {
    return {
      valid,
      errors,
      warnings,
    };
  },

  /**
   * Create a validation error
   */
  createValidationError(field, message, code, value = undefined) {
    return {
      field,
      message,
      code,
      value,
    };
  },

  /**
   * Create a validation warning
   */
  createValidationWarning(field, message, suggestion = undefined) {
    return {
      field,
      message,
      suggestion,
    };
  },

  /**
   * Validate required field
   */
  validateRequired(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return this.createValidationError(
        fieldName,
        `${fieldName} is required`,
        'REQUIRED_FIELD',
        value,
      );
    }
    return null;
  },

  /**
   * Validate numeric range
   */
  validateRange(value, fieldName, min, max) {
    if (typeof value !== 'number') {
      return this.createValidationError(
        fieldName,
        `${fieldName} must be a number`,
        'INVALID_TYPE',
        value,
      );
    }
    
    if (value < min || value > max) {
      return this.createValidationError(
        fieldName,
        `${fieldName} must be between ${min} and ${max}`,
        'OUT_OF_RANGE',
        value,
      );
    }
    
    return null;
  },

  /**
   * Validate enum value
   */
  validateEnum(value, fieldName, allowedValues) {
    if (!allowedValues.includes(value)) {
      return this.createValidationError(
        fieldName,
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        'INVALID_ENUM_VALUE',
        value,
      );
    }
    return null;
  },
};

/**
 * Response formatting utilities
 */
const ResponseUtils = {
  /**
   * Create a standardized model response
   */
  createModelResponse(content, model, usage = null, finishReason = null, metadata = {}) {
    return {
      content,
      usage,
      model,
      finishReason,
      metadata,
      stream: false,
    };
  },

  /**
   * Create usage information
   */
  createUsage(promptTokens = 0, completionTokens = 0, cost = null, duration = null) {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      duration,
    };
  },

  /**
   * Create model info
   */
  createModelInfo(id, name, type, provider, capabilities, parameters = {}, metadata = {}, available = true) {
    return {
      id,
      name,
      type,
      provider,
      capabilities,
      parameters,
      metadata,
      available,
      deprecated: false,
    };
  },

  /**
   * Create capabilities object
   */
  createCapabilities(supportedTypes, capabilities, options = {}) {
    return {
      supportedTypes,
      capabilities,
      streaming: options.streaming || false,
      fineTuning: options.fineTuning || false,
      multimodal: options.multimodal || false,
      batchProcessing: options.batchProcessing || false,
      maxInputSize: options.maxInputSize,
      maxOutputSize: options.maxOutputSize,
      ...options,
    };
  },
};

module.exports = {
  ModelProvider,
  ModelTypes,
  ModelCapabilities,
  TaskTypes,
  ValidationUtils,
  ResponseUtils,
};