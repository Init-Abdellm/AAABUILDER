import { 
  ModelCapabilityDetector,
  CapabilityDetectionResult,
  CapabilityValidationResult,
  TaskCapabilityRequirements
} from '../ModelCapabilityDetector';
import { ModelInfo, TaskType } from '../ModelProvider';
import { ModelType, ModelCapability } from '../../types/global';

describe('ModelCapabilityDetector', () => {
  describe('Capability Detection', () => {
    test('should detect capabilities from explicit model info', () => {
      const modelInfo: ModelInfo = {
        id: 'test-model',
        name: 'Test Model',
        type: 'LLM',
        provider: 'test',
        capabilities: {
          supportedTypes: ['LLM'],
          capabilities: ['text-generation', 'code-generation'],
          streaming: true,
          fineTuning: false,
          multimodal: false,
          batchProcessing: true
        },
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('text-generation');
      expect(result.capabilities).toContain('code-generation');
      expect(result.confidence).toBe(0.9);
      expect(result.detectionMethod).toBe('explicit');
    });

    test('should infer capabilities from model type', () => {
      const modelInfo: ModelInfo = {
        id: 'vision-model',
        name: 'Vision Model',
        type: 'Vision',
        provider: 'test',
        capabilities: {
          supportedTypes: ['Vision'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: true,
          batchProcessing: false
        },
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('image-classification');
      expect(result.capabilities).toContain('object-detection');
      expect(result.detectionMethod).toBe('inferred');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should infer capabilities from provider', () => {
      const modelInfo: ModelInfo = {
        id: 'openai-model',
        name: 'OpenAI Model',
        type: 'LLM',
        provider: 'openai',
        capabilities: {
          supportedTypes: ['LLM'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: false,
          batchProcessing: false
        },
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('text-generation');
      expect(result.capabilities).toContain('streaming');
      expect(result.metadata.providerInferred).toContain('text-generation');
    });

    test('should infer capabilities from model name patterns', () => {
      const modelInfo: ModelInfo = {
        id: 'gpt-4',
        name: 'GPT-4',
        type: 'LLM',
        provider: 'test',
        capabilities: {
          supportedTypes: ['LLM'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: false,
          batchProcessing: false
        },
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('text-generation');
      expect(result.capabilities).toContain('code-generation');
      expect(result.metadata.nameInferred).toContain('text-generation');
    });

    test('should infer capabilities from metadata', () => {
      const modelInfo: ModelInfo = {
        id: 'test-model',
        name: 'Test Model',
        type: 'LLM',
        provider: 'test',
        capabilities: {
          supportedTypes: ['LLM'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: false,
          batchProcessing: false
        },
        parameters: {},
        metadata: {
          version: '1.0.0',
          supportsStreaming: true,
          multimodal: true,
          description: 'A model that supports vision and code generation',
          tags: ['vision', 'code']
        },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('streaming');
      expect(result.capabilities).toContain('multimodal');
      expect(result.capabilities).toContain('image-classification');
      expect(result.capabilities).toContain('code-generation');
    });

    test('should handle model with no capability information', () => {
      const modelInfo: ModelInfo = {
        id: 'unknown-model',
        name: 'Unknown Model',
        type: 'MLP',
        provider: 'unknown',
        capabilities: {
          supportedTypes: ['MLP'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: false,
          batchProcessing: false
        },
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities).toContain('classification');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Capability Validation', () => {
    test('should validate when all required capabilities are present', () => {
      const modelCapabilities: ModelCapability[] = [
        'text-generation', 'code-generation', 'streaming'
      ];
      const requiredCapabilities: ModelCapability[] = [
        'text-generation', 'code-generation'
      ];
      const optionalCapabilities: ModelCapability[] = [
        'streaming', 'function-calling'
      ];

      const result = ModelCapabilityDetector.validateCapabilities(
        modelCapabilities,
        requiredCapabilities,
        optionalCapabilities
      );

      expect(result.valid).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.missing).toHaveLength(0);
      expect(result.present).toEqual(requiredCapabilities);
      expect(result.optional).toContain('streaming');
      expect(result.summary).toContain('Fully compatible');
    });

    test('should detect missing required capabilities', () => {
      const modelCapabilities: ModelCapability[] = [
        'text-generation'
      ];
      const requiredCapabilities: ModelCapability[] = [
        'text-generation', 'code-generation', 'function-calling'
      ];

      const result = ModelCapabilityDetector.validateCapabilities(
        modelCapabilities,
        requiredCapabilities
      );

      expect(result.valid).toBe(false);
      expect(result.score).toBe(1/3); // 1 out of 3 required capabilities
      expect(result.missing).toEqual(['code-generation', 'function-calling']);
      expect(result.present).toEqual(['text-generation']);
      expect(result.summary).toContain('Missing 2 required capabilities');
    });

    test('should identify extra capabilities', () => {
      const modelCapabilities: ModelCapability[] = [
        'text-generation', 'image-generation', 'speech-to-text'
      ];
      const requiredCapabilities: ModelCapability[] = [
        'text-generation'
      ];
      const optionalCapabilities: ModelCapability[] = [
        'image-generation'
      ];

      const result = ModelCapabilityDetector.validateCapabilities(
        modelCapabilities,
        requiredCapabilities,
        optionalCapabilities
      );

      expect(result.valid).toBe(true);
      expect(result.extra).toContain('speech-to-text');
      expect(result.optional).toContain('image-generation');
    });
  });

  describe('Task Capability Requirements', () => {
    test('should return requirements for text generation', () => {
      const requirements = ModelCapabilityDetector.getRecommendedCapabilities('text-generation');

      expect(requirements.required).toContain('text-generation');
      expect(requirements.optional).toContain('streaming');
      expect(requirements.preferred).toContain('code-generation');
    });

    test('should return requirements for image classification', () => {
      const requirements = ModelCapabilityDetector.getRecommendedCapabilities('image-classification');

      expect(requirements.required).toContain('image-classification');
      expect(requirements.optional).toContain('object-detection');
    });

    test('should return requirements for code generation', () => {
      const requirements = ModelCapabilityDetector.getRecommendedCapabilities('code-generation');

      expect(requirements.required).toContain('code-generation');
      expect(requirements.optional).toContain('code-completion');
      expect(requirements.preferred).toContain('function-calling');
    });

    test('should return empty requirements for unknown task', () => {
      const requirements = ModelCapabilityDetector.getRecommendedCapabilities('unknown-task' as TaskType);

      expect(requirements.required).toHaveLength(0);
      expect(requirements.optional).toHaveLength(0);
      expect(requirements.preferred).toHaveLength(0);
    });
  });

  describe('Task Support Check', () => {
    test('should confirm model supports task when requirements are met', () => {
      const modelCapabilities: ModelCapability[] = [
        'text-generation', 'streaming', 'code-generation'
      ];

      const supports = ModelCapabilityDetector.supportsTask(modelCapabilities, 'text-generation');

      expect(supports).toBe(true);
    });

    test('should deny model supports task when requirements are not met', () => {
      const modelCapabilities: ModelCapability[] = [
        'image-classification', 'object-detection'
      ];

      const supports = ModelCapabilityDetector.supportsTask(modelCapabilities, 'text-generation');

      expect(supports).toBe(false);
    });

    test('should handle complex task requirements', () => {
      const modelCapabilities: ModelCapability[] = [
        'speech-to-text', 'streaming'
      ];

      const supportsASR = ModelCapabilityDetector.supportsTask(modelCapabilities, 'speech-to-text');
      const supportsGeneration = ModelCapabilityDetector.supportsTask(modelCapabilities, 'text-generation');

      expect(supportsASR).toBe(true);
      expect(supportsGeneration).toBe(false);
    });
  });

  describe('Compatibility Scoring', () => {
    test('should calculate perfect compatibility score', () => {
      const capabilities1: ModelCapability[] = [
        'text-generation', 'code-generation', 'streaming'
      ];
      const capabilities2: ModelCapability[] = [
        'text-generation', 'code-generation', 'streaming'
      ];

      const score = ModelCapabilityDetector.getCompatibilityScore(capabilities1, capabilities2);

      expect(score).toBe(1.0);
    });

    test('should calculate partial compatibility score', () => {
      const capabilities1: ModelCapability[] = [
        'text-generation', 'code-generation'
      ];
      const capabilities2: ModelCapability[] = [
        'text-generation', 'image-generation'
      ];

      const score = ModelCapabilityDetector.getCompatibilityScore(capabilities1, capabilities2);

      expect(score).toBe(1/3); // 1 intersection, 3 union
    });

    test('should calculate zero compatibility score', () => {
      const capabilities1: ModelCapability[] = [
        'text-generation', 'code-generation'
      ];
      const capabilities2: ModelCapability[] = [
        'image-classification', 'object-detection'
      ];

      const score = ModelCapabilityDetector.getCompatibilityScore(capabilities1, capabilities2);

      expect(score).toBe(0);
    });

    test('should handle empty capability lists', () => {
      const capabilities1: ModelCapability[] = [];
      const capabilities2: ModelCapability[] = ['text-generation'];

      const score = ModelCapabilityDetector.getCompatibilityScore(capabilities1, capabilities2);

      expect(score).toBe(0);
    });

    test('should handle both empty capability lists', () => {
      const capabilities1: ModelCapability[] = [];
      const capabilities2: ModelCapability[] = [];

      const score = ModelCapabilityDetector.getCompatibilityScore(capabilities1, capabilities2);

      expect(score).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle model with null metadata', () => {
      const modelInfo: ModelInfo = {
        id: 'test-model',
        name: 'Test Model',
        type: 'LLM',
        provider: 'test',
        capabilities: {
          supportedTypes: ['LLM'],
          capabilities: [],
          streaming: false,
          fineTuning: false,
          multimodal: false,
          batchProcessing: false
        },
        parameters: {},
        metadata: null as any,
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle model with undefined capabilities', () => {
      const modelInfo: ModelInfo = {
        id: 'test-model',
        name: 'Test Model',
        type: 'LLM',
        provider: 'test',
        capabilities: undefined as any,
        parameters: {},
        metadata: { version: '1.0.0' },
        available: true
      };

      const result = ModelCapabilityDetector.detectCapabilities(modelInfo);

      expect(result.capabilities.length).toBeGreaterThan(0);
      expect(result.detectionMethod).toBe('inferred');
    });
  });
});