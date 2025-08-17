import { 
  ModelType, 
  ModelCapability, 
  ModelParameters, 
  ModelMetadata,
  ExecutionContext 
} from '../types/global';

/**
 * Model Request Interface
 * Standardized request format for all model providers
 */
export interface ModelRequest {
  model: string;
  input: any;
  parameters?: ModelParameters;
  context?: ExecutionContext;
  metadata?: Record<string, any>;
}

/**
 * Model Response Interface
 * Standardized response format from all model providers
 */
export interface ModelResponse {
  content: any;
  usage?: ModelUsage;
  model: string;
  finishReason?: string;
  metadata?: Record<string, any>;
  stream?: boolean;
}

/**
 * Model Usage Information
 */
export interface ModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Model Capabilities Interface
 */
export interface ModelCapabilities {
  supportedTypes: ModelType[];
  capabilities: ModelCapability[];
  maxInputSize?: number;
  maxOutputSize?: number;
  streaming?: boolean;
  fineTuning?: boolean;
  multimodal?: boolean;
  batchProcessing?: boolean;
  [key: string]: any;
}

/**
 * Model Information Interface
 */
export interface ModelInfo {
  id: string;
  name: string;
  type: ModelType;
  provider: string;
  capabilities: ModelCapabilities;
  parameters: ModelParameters;
  metadata: ModelMetadata;
  available: boolean;
  deprecated?: boolean;
}

/**
 * Model Recommendation Interface
 */
export interface ModelRecommendation {
  model: ModelInfo;
  score: number;
  reason: string;
  alternatives?: ModelInfo[];
}

/**
 * Task Type for Model Recommendations
 */
export type TaskType = 
  | 'text-generation' | 'text-completion' | 'text-embedding'
  | 'image-generation' | 'image-classification' | 'image-analysis'
  | 'speech-to-text' | 'text-to-speech' | 'audio-analysis'
  | 'code-generation' | 'code-completion' | 'code-analysis'
  | 'mathematical-reasoning' | 'logical-reasoning'
  | 'question-answering' | 'summarization' | 'translation'
  | 'sentiment-analysis' | 'classification' | 'clustering'
  | 'anomaly-detection' | 'recommendation' | 'forecasting';

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Model Configuration Interface
 */
export interface ModelConfig {
  model: string;
  provider: string;
  parameters?: ModelParameters;
  optimization?: ModelOptimization;
  fallback?: ModelConfig[];
  metadata?: Record<string, any>;
}

export interface ModelOptimization {
  caching?: boolean;
  batching?: boolean;
  quantization?: 'int8' | 'int4' | 'fp16' | 'fp32';
  acceleration?: 'cpu' | 'gpu' | 'tpu' | 'auto';
  maxConcurrency?: number;
  timeout?: number;
}

/**
 * Abstract Model Provider Base Class
 * All model providers must extend this class
 */
export abstract class ModelProvider {
  protected name: string;
  protected type: string;
  protected config: Record<string, any>;

  constructor(name: string, type: string, config: Record<string, any> = {}) {
    this.name = name;
    this.type = type;
    this.config = config;
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get provider type
   */
  getType(): string {
    return this.type;
  }

  /**
   * Get provider configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Check if provider supports a specific model type
   */
  abstract supports(modelType: ModelType): boolean;

  /**
   * Execute a model request
   */
  abstract execute(request: ModelRequest): Promise<ModelResponse>;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ModelCapabilities;

  /**
   * Validate model configuration
   */
  abstract validateConfig(config: ModelConfig): ValidationResult;

  /**
   * List available models
   */
  abstract listModels(): Promise<ModelInfo[]>;

  /**
   * Get specific model information
   */
  abstract getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Check if provider is available/healthy
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Initialize provider (setup connections, validate credentials, etc.)
   */
  async initialize(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Cleanup provider resources
   */
  async cleanup(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Get provider health status
   */
  async getHealthStatus(): Promise<ProviderHealthStatus> {
    try {
      const available = await this.isAvailable();
      return {
        provider: this.name,
        status: available ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        details: available ? 'Provider is operational' : 'Provider is not available'
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'error',
        timestamp: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Estimate cost for a request (optional)
   */
  async estimateCost(_request: ModelRequest): Promise<number | null> {
    // Default implementation returns null (cost estimation not available)
    return null;
  }

  /**
   * Prepare request for execution (preprocessing, validation, etc.)
   */
  protected async prepareRequest(request: ModelRequest): Promise<ModelRequest> {
    // Default implementation - can be overridden
    return request;
  }

  /**
   * Process response after execution (postprocessing, formatting, etc.)
   */
  protected async processResponse(response: ModelResponse): Promise<ModelResponse> {
    // Default implementation - can be overridden
    return response;
  }
}

/**
 * Provider Health Status Interface
 */
export interface ProviderHealthStatus {
  provider: string;
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: Date;
  details: string;
  error?: Error;
  metrics?: Record<string, any>;
}