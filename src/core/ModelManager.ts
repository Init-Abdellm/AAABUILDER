import { AIModel, ModelType, ModelCapability, AIProvider, ProviderType } from '../types/global';
import { Logger } from '../utils/Logger';

/**
 * Comprehensive Model Manager for AAABuilder
 * Handles all AI/ML model types and providers
 */
export class ModelManager {
  private static instance: ModelManager;
  private models: Map<string, AIModel> = new Map();
  private providers: Map<string, AIProvider> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ModelManager');
    this.initializeDefaultModels();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Initialize default models for all supported types
   */
  private initializeDefaultModels(): void {
    this.logger.info('Initializing default AI/ML models...');

    // LLM Models
    this.registerModel({
      id: 'gpt-4o',
      name: 'GPT-4 Omni',
      type: 'LLM',
      provider: 'openai',
      capabilities: ['text-generation', 'text-completion', 'multimodal', 'streaming'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'OpenAI GPT-4 Omni model',
        architecture: 'Transformer',
        size: 175000000000,
      },
    });

    this.registerModel({
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      type: 'LLM',
      provider: 'openai',
      capabilities: ['text-generation', 'text-completion', 'streaming'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'OpenAI GPT-3.5 Turbo model',
        architecture: 'Transformer',
        size: 17500000000,
      },
    });

    this.registerModel({
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      type: 'LLM',
      provider: 'anthropic',
      capabilities: ['text-generation', 'text-completion', 'multimodal', 'streaming'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'Anthropic Claude 3 Opus model',
        architecture: 'Transformer',
        size: 200000000000,
      },
    });

    // Vision Models
    this.registerModel({
      id: 'gpt-4o-vision',
      name: 'GPT-4 Omni Vision',
      type: 'Vision',
      provider: 'openai',
      capabilities: ['image-classification', 'object-detection', 'ocr', 'image-captioning'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
      },
      metadata: {
        version: '1.0',
        description: 'OpenAI GPT-4 Omni with vision capabilities',
        architecture: 'Vision Transformer',
        size: 175000000000,
      },
    });

    // ASR Models
    this.registerModel({
      id: 'whisper-1',
      name: 'Whisper',
      type: 'ASR',
      provider: 'openai',
      capabilities: ['speech-to-text', 'language-detection'],
      parameters: {
        temperature: 0.0,
      },
      metadata: {
        version: '1.0',
        description: 'OpenAI Whisper speech recognition model',
        architecture: 'Transformer',
        size: 1500000000,
      },
    });

    // TTS Models
    this.registerModel({
      id: 'tts-1',
      name: 'TTS-1',
      type: 'TTS',
      provider: 'openai',
      capabilities: ['text-to-speech', 'voice-cloning'],
      parameters: {
        voice: 'alloy',
        speed: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'OpenAI TTS-1 text-to-speech model',
        architecture: 'Neural TTS',
        size: 500000000,
      },
    });

    // Local Models (Ollama)
    this.registerModel({
      id: 'llama2',
      name: 'Llama 2',
      type: 'LLM',
      provider: 'ollama',
      capabilities: ['text-generation', 'text-completion', 'streaming'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'Meta Llama 2 model via Ollama',
        architecture: 'Transformer',
        size: 7000000000,
      },
    });

    this.registerModel({
      id: 'mistral',
      name: 'Mistral',
      type: 'LLM',
      provider: 'ollama',
      capabilities: ['text-generation', 'text-completion', 'streaming'],
      parameters: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
      },
      metadata: {
        version: '1.0',
        description: 'Mistral AI model via Ollama',
        architecture: 'Transformer',
        size: 7000000000,
      },
    });

    // Machine Learning Models
    this.registerModel({
      id: 'cnn-classifier',
      name: 'CNN Image Classifier',
      type: 'CNN',
      provider: 'local',
      capabilities: ['image-classification'],
      parameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
      },
      metadata: {
        version: '1.0',
        description: 'Convolutional Neural Network for image classification',
        architecture: 'CNN',
        size: 50000000,
      },
    });

    this.registerModel({
      id: 'rnn-sequence',
      name: 'RNN Sequence Model',
      type: 'RNN',
      provider: 'local',
      capabilities: ['time-series', 'anomaly-detection'],
      parameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
      },
      metadata: {
        version: '1.0',
        description: 'Recurrent Neural Network for sequence modeling',
        architecture: 'LSTM',
        size: 10000000,
      },
    });

    this.registerModel({
      id: 'gnn-graph',
      name: 'GNN Graph Model',
      type: 'GNN',
      provider: 'local',
      capabilities: ['graph-processing', 'recommendation'],
      parameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
      },
      metadata: {
        version: '1.0',
        description: 'Graph Neural Network for graph processing',
        architecture: 'GCN',
        size: 20000000,
      },
    });

    // Foundation Models
    this.registerModel({
      id: 'bert-base',
      name: 'BERT Base',
      type: 'BERT',
      provider: 'huggingface',
      capabilities: ['text-embedding', 'text-classification'],
      parameters: {
        maxTokens: 512,
        temperature: 0.0,
      },
      metadata: {
        version: '1.0',
        description: 'BERT base model for text understanding',
        architecture: 'Transformer',
        size: 110000000,
      },
    });

    // RAG Models
    this.registerModel({
      id: 'rag-hybrid',
      name: 'RAG Hybrid Model',
      type: 'RAG',
      provider: 'local',
      capabilities: ['text-generation', 'text-embedding', 'recommendation'],
      parameters: {
        maxTokens: 2048,
        temperature: 0.7,
        topK: 10,
      },
      metadata: {
        version: '1.0',
        description: 'Retrieval-Augmented Generation hybrid model',
        architecture: 'Hybrid',
        size: 50000000,
      },
    });

    this.logger.info(`Initialized ${this.models.size} default models`);
  }

  /**
   * Register a new model
   */
  public registerModel(model: AIModel): void {
    this.models.set(model.id, model);
    this.logger.info(`Registered model: ${model.name} (${model.type})`);
  }

  /**
   * Get a model by ID
   */
  public getModel(modelId: string): AIModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models of a specific type
   */
  public getModelsByType(type: ModelType): AIModel[] {
    return Array.from(this.models.values()).filter(model => model.type === type);
  }

  /**
   * Get all models from a specific provider
   */
  public getModelsByProvider(provider: string): AIModel[] {
    return Array.from(this.models.values()).filter(model => model.provider === provider);
  }

  /**
   * Get models with specific capabilities
   */
  public getModelsByCapability(capability: ModelCapability): AIModel[] {
    return Array.from(this.models.values()).filter(model => 
      model.capabilities.includes(capability)
    );
  }

  /**
   * Register a new provider
   */
  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.info(`Registered provider: ${provider.name} (${provider.type})`);
  }

  /**
   * Get a provider by name
   */
  public getProvider(providerName: string): AIProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Get all providers
   */
  public getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  public getProvidersByType(type: ProviderType): AIProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.type === type);
  }

  /**
   * Search models by criteria
   */
  public searchModels(criteria: {
    type?: ModelType;
    provider?: string;
    capabilities?: ModelCapability[];
    minSize?: number;
    maxSize?: number;
  }): AIModel[] {
    return Array.from(this.models.values()).filter(model => {
      if (criteria.type && model.type !== criteria.type) return false;
      if (criteria.provider && model.provider !== criteria.provider) return false;
      if (criteria.capabilities && !criteria.capabilities.every(cap => model.capabilities.includes(cap))) return false;
      if (criteria.minSize && (model.metadata.size || 0) < criteria.minSize) return false;
      if (criteria.maxSize && (model.metadata.size || 0) > criteria.maxSize) return false;
      return true;
    });
  }

  /**
   * Get model statistics
   */
  public getModelStatistics(): {
    total: number;
    byType: Record<ModelType, number>;
    byProvider: Record<string, number>;
    byCapability: Record<ModelCapability, number>;
  } {
    const byType: Record<ModelType, number> = {} as Record<ModelType, number>;
    const byProvider: Record<string, number> = {};
    const byCapability: Record<ModelCapability, number> = {} as Record<ModelCapability, number>;

    for (const model of this.models.values()) {
      // Count by type
      byType[model.type] = (byType[model.type] || 0) + 1;

      // Count by provider
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;

      // Count by capability
      for (const capability of model.capabilities) {
        byCapability[capability] = (byCapability[capability] || 0) + 1;
      }
    }

    return {
      total: this.models.size,
      byType,
      byProvider,
      byCapability,
    };
  }

  /**
   * Validate model configuration
   */
  public validateModel(model: AIModel): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!model.id) errors.push('Model ID is required');
    if (!model.name) errors.push('Model name is required');
    if (!model.type) errors.push('Model type is required');
    if (!model.provider) errors.push('Model provider is required');
    if (!model.capabilities || model.capabilities.length === 0) {
      errors.push('Model must have at least one capability');
    }
    if (!model.parameters) errors.push('Model parameters are required');
    if (!model.metadata) errors.push('Model metadata is required');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export models to JSON
   */
  public exportModels(): string {
    return JSON.stringify(Array.from(this.models.values()), null, 2);
  }

  /**
   * Import models from JSON
   */
  public importModels(jsonData: string): void {
    try {
      const models = JSON.parse(jsonData) as AIModel[];
      for (const model of models) {
        const validation = this.validateModel(model);
        if (validation.valid) {
          this.registerModel(model);
        } else {
          this.logger.warn(`Skipping invalid model ${model.id}: ${validation.errors.join(', ')}`);
        }
      }
      this.logger.info(`Imported ${models.length} models`);
    } catch (error) {
      this.logger.error(`Failed to import models: ${error}`);
      throw new Error('Invalid JSON format for model import');
    }
  }

  /**
   * Clear all models
   */
  public clearModels(): void {
    this.models.clear();
    this.logger.info('Cleared all models');
  }

  /**
   * Get recommended models for a task
   */
  public getRecommendedModels(task: string, constraints?: {
    maxSize?: number;
    provider?: string;
    type?: ModelType;
  }): AIModel[] {
    // Simple recommendation logic - can be enhanced with ML
    const taskCapabilities: Record<string, ModelCapability[]> = {
      'text-generation': ['text-generation'],
      'image-classification': ['image-classification'],
      'speech-recognition': ['speech-to-text'],
      'text-to-speech': ['text-to-speech'],
      'code-generation': ['code-generation'],
      'sentiment-analysis': ['text-classification'],
      'object-detection': ['object-detection'],
      'ocr': ['ocr'],
      'translation': ['text-generation'],
      'summarization': ['text-generation'],
      'question-answering': ['text-generation'],
      'recommendation': ['recommendation'],
      'anomaly-detection': ['anomaly-detection'],
      'time-series': ['time-series'],
      'graph-analysis': ['graph-processing'],
    };

    const requiredCapabilities = taskCapabilities[task] || ['text-generation'];
    let candidates = this.getModelsByCapability(requiredCapabilities[0]);

    // Filter by constraints
    if (constraints?.maxSize) {
      candidates = candidates.filter(model => (model.metadata.size || 0) <= constraints.maxSize!);
    }
    if (constraints?.provider) {
      candidates = candidates.filter(model => model.provider === constraints.provider);
    }
    if (constraints?.type) {
      candidates = candidates.filter(model => model.type === constraints.type);
    }

    // Sort by relevance (size, capabilities match, etc.)
    candidates.sort((a, b) => {
      const aScore = this.calculateModelScore(a, requiredCapabilities);
      const bScore = this.calculateModelScore(b, requiredCapabilities);
      return bScore - aScore;
    });

    return candidates.slice(0, 5); // Return top 5 recommendations
  }

  private calculateModelScore(model: AIModel, requiredCapabilities: ModelCapability[]): number {
    let score = 0;

    // Capability match score
    const capabilityMatches = requiredCapabilities.filter(cap => model.capabilities.includes(cap)).length;
    score += capabilityMatches * 10;

    // Size score (smaller is better for local deployment)
    if (model.metadata.size) {
      score += Math.max(0, 10 - Math.log10(model.metadata.size));
    }

    // Provider preference (local > cloud for some use cases)
    if (model.provider === 'local' || model.provider === 'ollama') {
      score += 5;
    }

    return score;
  }
}
