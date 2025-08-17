import { 
  ModelType, 
  ModelCapability 
} from '../types/global';
import { 
  ModelInfo, 
  TaskType 
} from './ModelProvider';

/**
 * Capability Detection Result
 */
export interface CapabilityDetectionResult {
  capabilities: ModelCapability[];
  confidence: number;
  detectionMethod: 'explicit' | 'inferred' | 'tested';
  metadata: Record<string, any>;
}

/**
 * Model Capability Detector
 * Automatically detects and validates model capabilities
 */
export class ModelCapabilityDetector {
  private static readonly TYPE_CAPABILITY_MAP: Record<ModelType, ModelCapability[]> = {
    'LLM': [
      'text-generation', 'text-completion', 'text-embedding',
      'code-generation', 'code-completion', 'mathematical-reasoning',
      'logical-reasoning', 'streaming'
    ],
    'SLM': [
      'text-generation', 'text-completion', 'streaming'
    ],
    'MLM': [
      'text-generation', 'text-completion', 'text-embedding'
    ],
    'Vision': [
      'image-classification', 'image-segmentation', 'object-detection',
      'face-recognition', 'ocr', 'image-generation'
    ],
    'ASR': [
      'speech-to-text', 'streaming'
    ],
    'TTS': [
      'text-to-speech', 'voice-cloning'
    ],
    'RL': [
      'reinforcement-learning'
    ],
    'GNN': [
      'graph-processing'
    ],
    'RNN': [
      'time-series', 'text-generation'
    ],
    'CNN': [
      'image-classification', 'image-segmentation', 'object-detection'
    ],
    'GAN': [
      'image-generation'
    ],
    'Diffusion': [
      'image-generation'
    ],
    'Transformer': [
      'text-generation', 'text-completion', 'text-embedding',
      'image-classification', 'multimodal'
    ],
    'MLP': [
      'mathematical-reasoning'
    ],
    'Autoencoder': [
      'anomaly-detection'
    ],
    'BERT': [
      'text-embedding'
    ],
    'RAG': [
      'text-generation'
    ],
    'Hybrid': [
      'multimodal', 'text-generation', 'image-classification'
    ],
    'Foundation': [
      'multimodal', 'text-generation', 'image-generation',
      'code-generation', 'mathematical-reasoning'
    ]
  };

  private static readonly PROVIDER_CAPABILITY_MAP: Record<string, ModelCapability[]> = {
    'openai': [
      'text-generation', 'text-completion', 'text-embedding',
      'image-generation', 'code-generation',
      'streaming', 'fine-tuning'
    ],
    'anthropic': [
      'text-generation', 'text-completion', 'code-generation',
      'mathematical-reasoning', 'logical-reasoning', 'streaming'
    ],
    'google': [
      'text-generation', 'text-completion', 'text-embedding',
      'image-generation', 'multimodal', 'code-generation'
    ],
    'huggingface': [
      'text-generation', 'text-completion', 'text-embedding',
      'image-classification', 'object-detection', 'speech-to-text',
      'text-to-speech', 'fine-tuning'
    ],
    'ollama': [
      'text-generation', 'text-completion', 'text-embedding',
      'code-generation', 'streaming'
    ]
  };

  private static readonly MODEL_NAME_PATTERNS: Record<string, ModelCapability[]> = {
    'gpt': ['text-generation', 'code-generation'],
    'claude': ['text-generation', 'code-generation', 'mathematical-reasoning'],
    'gemini': ['text-generation', 'multimodal', 'code-generation'],
    'llama': ['text-generation', 'code-generation'],
    'mistral': ['text-generation', 'code-generation'],
    'whisper': ['speech-to-text'],
    'dall-e': ['image-generation'],
    'stable-diffusion': ['image-generation'],
    'yolo': ['object-detection'],
    'resnet': ['image-classification'],
    'bert': ['text-embedding'],
    'roberta': ['text-embedding'],
    't5': ['text-generation', 'text-completion'],
    'bart': ['text-generation']
  };

  /**
   * Detect capabilities for a model
   */
  static detectCapabilities(modelInfo: ModelInfo): CapabilityDetectionResult {
    const capabilities = new Set<ModelCapability>();
    let confidence = 0;
    let detectionMethod: 'explicit' | 'inferred' | 'tested' = 'inferred';
    const metadata: Record<string, any> = {};

    // 1. Use explicit capabilities if available
    if (modelInfo.capabilities?.capabilities?.length > 0) {
      modelInfo.capabilities.capabilities.forEach(cap => capabilities.add(cap));
      confidence = 0.9;
      detectionMethod = 'explicit';
      metadata['source'] = 'explicit';
    } else {
      // 2. Infer from model type
      const typeCapabilities = this.TYPE_CAPABILITY_MAP[modelInfo.type] || [];
      typeCapabilities.forEach(cap => capabilities.add(cap));
      confidence += 0.3;
      metadata['typeInferred'] = typeCapabilities;

      // 3. Infer from provider
      const providerCapabilities = this.PROVIDER_CAPABILITY_MAP[modelInfo.provider] || [];
      providerCapabilities.forEach(cap => capabilities.add(cap));
      confidence += 0.2;
      metadata['providerInferred'] = providerCapabilities;

      // 4. Infer from model name patterns
      const nameCapabilities = this.inferFromModelName(modelInfo.name);
      nameCapabilities.forEach(cap => capabilities.add(cap));
      confidence += nameCapabilities.length > 0 ? 0.3 : 0;
      metadata['nameInferred'] = nameCapabilities;

      // 5. Infer from metadata
      const metadataCapabilities = this.inferFromMetadata(modelInfo.metadata);
      metadataCapabilities.forEach(cap => capabilities.add(cap));
      confidence += metadataCapabilities.length > 0 ? 0.2 : 0;
      metadata['metadataInferred'] = metadataCapabilities;
    }

    return {
      capabilities: Array.from(capabilities),
      confidence: Math.min(confidence, 1.0),
      detectionMethod,
      metadata
    };
  }

  /**
   * Validate model capabilities against requirements
   */
  static validateCapabilities(
    modelCapabilities: ModelCapability[],
    requiredCapabilities: ModelCapability[],
    optionalCapabilities: ModelCapability[] = []
  ): CapabilityValidationResult {
    const missing = requiredCapabilities.filter(cap => !modelCapabilities.includes(cap));
    const present = requiredCapabilities.filter(cap => modelCapabilities.includes(cap));
    const optional = optionalCapabilities.filter(cap => modelCapabilities.includes(cap));
    const extra = modelCapabilities.filter(cap => 
      !requiredCapabilities.includes(cap) && !optionalCapabilities.includes(cap)
    );

    const score = present.length / requiredCapabilities.length;
    const valid = missing.length === 0;

    return {
      valid,
      score,
      missing,
      present,
      optional,
      extra,
      summary: this.generateValidationSummary(valid, score, missing.length, optional.length)
    };
  }

  /**
   * Get recommended capabilities for a task type
   */
  static getRecommendedCapabilities(taskType: TaskType): TaskCapabilityRequirements {
    const requirements: Record<TaskType, TaskCapabilityRequirements> = {
      'text-generation': {
        required: ['text-generation'],
        optional: ['streaming'],
        preferred: ['code-generation', 'mathematical-reasoning']
      },
      'text-completion': {
        required: ['text-completion'],
        optional: ['streaming'],
        preferred: ['text-generation']
      },
      'text-embedding': {
        required: ['text-embedding'],
        optional: [],
        preferred: []
      },
      'image-generation': {
        required: ['image-generation'],
        optional: [],
        preferred: []
      },
      'image-classification': {
        required: ['image-classification'],
        optional: ['object-detection'],
        preferred: []
      },
      'image-analysis': {
        required: ['image-classification'],
        optional: ['object-detection', 'ocr', 'face-recognition'],
        preferred: ['multimodal']
      },
      'speech-to-text': {
        required: ['speech-to-text'],
        optional: ['streaming'],
        preferred: []
      },
      'text-to-speech': {
        required: ['text-to-speech'],
        optional: ['voice-cloning'],
        preferred: []
      },
      'audio-analysis': {
        required: ['speech-to-text'],
        optional: [],
        preferred: []
      },
      'code-generation': {
        required: ['code-generation'],
        optional: ['code-completion', 'code-analysis'],
        preferred: []
      },
      'code-completion': {
        required: ['code-completion'],
        optional: ['code-generation'],
        preferred: []
      },
      'code-analysis': {
        required: ['code-analysis'],
        optional: ['code-generation'],
        preferred: []
      },
      'mathematical-reasoning': {
        required: ['mathematical-reasoning'],
        optional: ['logical-reasoning'],
        preferred: ['code-generation']
      },
      'logical-reasoning': {
        required: ['logical-reasoning'],
        optional: ['mathematical-reasoning'],
        preferred: []
      },
      'question-answering': {
        required: ['text-generation'],
        optional: ['logical-reasoning'],
        preferred: []
      },
      'summarization': {
        required: ['text-generation'],
        optional: [],
        preferred: []
      },
      'translation': {
        required: ['text-generation'],
        optional: [],
        preferred: []
      },
      'sentiment-analysis': {
        required: ['text-embedding'],
        optional: [],
        preferred: []
      },
      'classification': {
        required: ['image-classification'],
        optional: [],
        preferred: []
      },
      'clustering': {
        required: ['anomaly-detection'],
        optional: [],
        preferred: []
      },
      'anomaly-detection': {
        required: ['anomaly-detection'],
        optional: [],
        preferred: []
      },
      'recommendation': {
        required: ['recommendation'],
        optional: [],
        preferred: []
      },
      'forecasting': {
        required: ['time-series'],
        optional: [],
        preferred: []
      }
    };

    return requirements[taskType] || {
      required: [],
      optional: [],
      preferred: []
    };
  }

  /**
   * Check if model supports a specific task
   */
  static supportsTask(modelCapabilities: ModelCapability[], taskType: TaskType): boolean {
    const requirements = this.getRecommendedCapabilities(taskType);
    return requirements.required.every(cap => modelCapabilities.includes(cap));
  }

  /**
   * Get capability compatibility score between two models
   */
  static getCompatibilityScore(
    capabilities1: ModelCapability[],
    capabilities2: ModelCapability[]
  ): number {
    const set1 = new Set(capabilities1);
    const set2 = new Set(capabilities2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Private helper methods

  private static inferFromModelName(modelName: string): ModelCapability[] {
    const capabilities: ModelCapability[] = [];
    const lowerName = modelName.toLowerCase();

    for (const [pattern, caps] of Object.entries(this.MODEL_NAME_PATTERNS)) {
      if (lowerName.includes(pattern)) {
        capabilities.push(...caps);
      }
    }

    return capabilities;
  }

  private static inferFromMetadata(metadata: any): ModelCapability[] {
    const capabilities: ModelCapability[] = [];

    if (!metadata) return capabilities;

    // Check for specific metadata fields
    if (metadata.supportsStreaming) capabilities.push('streaming');
    if (metadata.supportsFineTuning) capabilities.push('fine-tuning');
    if (metadata.multimodal) capabilities.push('multimodal');
    if (metadata.functionCalling) capabilities.push('code-generation');

    // Check description for capability hints
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      if (desc.includes('vision')) capabilities.push('image-classification');
      if (desc.includes('audio')) capabilities.push('speech-to-text');
      if (desc.includes('code')) capabilities.push('code-generation');
      if (desc.includes('embedding')) capabilities.push('text-embedding');
    }

    // Check tags
    if (metadata.tags && Array.isArray(metadata.tags)) {
      for (const tag of metadata.tags) {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('vision')) capabilities.push('image-classification');
        if (tagLower.includes('audio')) capabilities.push('speech-to-text');
        if (tagLower.includes('code')) capabilities.push('code-generation');
      }
    }

    return capabilities;
  }

  private static generateValidationSummary(
    valid: boolean,
    score: number,
    missingCount: number,
    optionalCount: number
  ): string {
    if (valid) {
      if (optionalCount > 0) {
        return `Fully compatible with ${optionalCount} bonus capabilities`;
      } else {
        return 'Fully compatible with all required capabilities';
      }
    } else {
      return `Missing ${missingCount} required capabilities (${Math.round(score * 100)}% compatible)`;
    }
  }
}

/**
 * Capability Validation Result
 */
export interface CapabilityValidationResult {
  valid: boolean;
  score: number;
  missing: ModelCapability[];
  present: ModelCapability[];
  optional: ModelCapability[];
  extra: ModelCapability[];
  summary: string;
}

/**
 * Task Capability Requirements
 */
export interface TaskCapabilityRequirements {
  required: ModelCapability[];
  optional: ModelCapability[];
  preferred: ModelCapability[];
}