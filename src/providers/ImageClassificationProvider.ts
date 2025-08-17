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
 * Image Classification Provider
 * Supports ResNet, EfficientNet, and other CNN architectures
 */
export class ImageClassificationProvider extends ModelProvider {
  private loadedModels: Map<string, any> = new Map();
  private imageNetClasses: string[] = [];

  constructor(config: Record<string, any> = {}) {
    super('image-classification', 'computer-vision', {
      backend: config['backend'] || 'tensorflowjs', // 'tensorflowjs', 'onnx', 'pytorch'
      enableGPU: config['enableGPU'] || false,
      topK: config['topK'] || 5,
      inputSize: config['inputSize'] || 224,
      batchSize: config['batchSize'] || 1,
      ...config
    });
  }

  supports(modelType: ModelType): boolean {
    const supportedTypes: ModelType[] = ['CNN', 'Vision', 'Transformer'];
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
      
      // Preprocess image
      const preprocessedInput = await this.preprocessImage(request.input, model);
      
      // Run inference
      const predictions = await this.runInference(model, preprocessedInput);
      
      // Post-process predictions
      const results = await this.postprocessPredictions(predictions, model, request);
      
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
      throw new Error(`Image classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['CNN', 'Vision', 'Transformer'],
      capabilities: [
        'text-generation'
      ],
      maxInputSize: 1024 * 1024 * 3, // 1024x1024 RGB
      maxOutputSize: 21843, // ImageNet-21k classes
      streaming: false,
      fineTuning: true,
      multimodal: false,
      batchProcessing: true,
      realTime: true
    };
  }

  validateConfig(config: ModelConfig): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate model name
    if (!config.model) {
      errors.push({
        field: 'model',
        message: 'Model name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate classification-specific parameters
    if (config.parameters) {
      this.validateClassificationParameters(config.parameters, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [
      // ResNet Models
      {
        id: 'resnet50',
        name: 'ResNet-50',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'depth': 50
        },
        metadata: {
          version: '2.0',
          description: 'Deep residual network with 50 layers',
          category: 'image-classification',
          complexity: 'high',
          accuracy: 0.921, // Top-1 accuracy on ImageNet
          top5_accuracy: 0.975,
          model_size: '98MB',
          parameters: '25.6M',
          flops: '4.1B'
        },
        available: true
      },
      {
        id: 'resnet101',
        name: 'ResNet-101',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'depth': 101
        },
        metadata: {
          version: '2.0',
          description: 'Deep residual network with 101 layers',
          category: 'image-classification',
          complexity: 'very-high',
          accuracy: 0.931,
          top5_accuracy: 0.978,
          model_size: '171MB',
          parameters: '44.5M',
          flops: '7.8B'
        },
        available: true
      },
      {
        id: 'resnet152',
        name: 'ResNet-152',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'depth': 152
        },
        metadata: {
          version: '2.0',
          description: 'Deep residual network with 152 layers',
          category: 'image-classification',
          complexity: 'very-high',
          accuracy: 0.937,
          top5_accuracy: 0.981,
          model_size: '230MB',
          parameters: '60.2M',
          flops: '11.6B'
        },
        available: true
      },

      // EfficientNet Models
      {
        id: 'efficientnet-b0',
        name: 'EfficientNet-B0',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'compound_scaling': 'b0'
        },
        metadata: {
          version: '2.0',
          description: 'Efficient convolutional neural network baseline',
          category: 'image-classification',
          complexity: 'medium',
          accuracy: 0.924,
          top5_accuracy: 0.972,
          model_size: '20MB',
          parameters: '5.3M',
          flops: '0.39B'
        },
        available: true
      },
      {
        id: 'efficientnet-b3',
        name: 'EfficientNet-B3',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 300,
          'num_classes': 1000,
          'weights': 'imagenet',
          'compound_scaling': 'b3'
        },
        metadata: {
          version: '2.0',
          description: 'Scaled EfficientNet with balanced accuracy and efficiency',
          category: 'image-classification',
          complexity: 'high',
          accuracy: 0.943,
          top5_accuracy: 0.981,
          model_size: '48MB',
          parameters: '12.0M',
          flops: '1.8B'
        },
        available: true
      },
      {
        id: 'efficientnet-b7',
        name: 'EfficientNet-B7',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 600,
          'num_classes': 1000,
          'weights': 'imagenet',
          'compound_scaling': 'b7'
        },
        metadata: {
          version: '2.0',
          description: 'Largest EfficientNet with highest accuracy',
          category: 'image-classification',
          complexity: 'very-high',
          accuracy: 0.965,
          top5_accuracy: 0.987,
          model_size: '256MB',
          parameters: '66.3M',
          flops: '37.0B'
        },
        available: true
      },

      // MobileNet Models (for mobile/edge deployment)
      {
        id: 'mobilenet-v2',
        name: 'MobileNet V2',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'alpha': 1.0
        },
        metadata: {
          version: '2.0',
          description: 'Efficient CNN for mobile and embedded applications',
          category: 'image-classification',
          complexity: 'low',
          accuracy: 0.901,
          top5_accuracy: 0.969,
          model_size: '14MB',
          parameters: '3.5M',
          flops: '0.3B',
          mobile_optimized: true
        },
        available: true
      },
      {
        id: 'mobilenet-v3-large',
        name: 'MobileNet V3 Large',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'num_classes': 1000,
          'weights': 'imagenet',
          'variant': 'large'
        },
        metadata: {
          version: '3.0',
          description: 'Latest MobileNet with neural architecture search',
          category: 'image-classification',
          complexity: 'medium',
          accuracy: 0.918,
          top5_accuracy: 0.974,
          model_size: '21MB',
          parameters: '5.4M',
          flops: '0.22B',
          mobile_optimized: true
        },
        available: true
      },

      // Vision Transformer Models
      {
        id: 'vit-base-patch16',
        name: 'Vision Transformer Base',
        type: 'Transformer',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 224,
          'patch_size': 16,
          'num_classes': 1000,
          'num_layers': 12,
          'num_heads': 12,
          'hidden_dim': 768
        },
        metadata: {
          version: '1.0',
          description: 'Vision Transformer with patch-based attention',
          category: 'image-classification',
          complexity: 'very-high',
          accuracy: 0.928,
          top5_accuracy: 0.976,
          model_size: '330MB',
          parameters: '86.6M',
          attention_based: true
        },
        available: true
      },

      // Specialized Models
      {
        id: 'inception-v3',
        name: 'Inception V3',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          'input_size': 299,
          'num_classes': 1000,
          'weights': 'imagenet'
        },
        metadata: {
          version: '3.0',
          description: 'Inception architecture with factorized convolutions',
          category: 'image-classification',
          complexity: 'high',
          accuracy: 0.937,
          top5_accuracy: 0.980,
          model_size: '92MB',
          parameters: '23.8M'
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
      if (this.config['backend'] === 'tensorflowjs') {
        return await this.checkTensorFlowJSAvailability();
      } else if (this.config['backend'] === 'onnx') {
        return await this.checkONNXAvailability();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  override async initialize(): Promise<void> {
    try {
      // Initialize backend
      if (this.config['backend'] === 'tensorflowjs') {
        await this.initializeTensorFlowJS();
      } else if (this.config['backend'] === 'onnx') {
        await this.initializeONNX();
      }

      // Load ImageNet class labels
      await this.loadImageNetClasses();

      console.log('Image Classification provider initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Image Classification provider:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateRequest(request: ModelRequest): ValidationResult {
    const errors: any[] = [];

    if (!request.input) {
      errors.push({
        field: 'input',
        message: 'Input image is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate image format
    if (request.input && !this.isValidImageInput(request.input)) {
      errors.push({
        field: 'input',
        message: 'Input must be a valid image (Buffer, base64 string, or image URL)',
        code: 'INVALID_TYPE'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private isValidImageInput(input: any): boolean {
    return (
      Buffer.isBuffer(input) ||
      (typeof input === 'string' && (
        input.startsWith('data:image/') ||
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
      inputSize: modelInfo.parameters['input_size'] || 224,
      numClasses: modelInfo.parameters['num_classes'] || 1000,
      predict: (input: any) => this.mockInference(input, modelInfo)
    };

    this.loadedModels.set(modelId, mockModel);
    return mockModel;
  }

  private async preprocessImage(_input: any, model: any): Promise<any> {
    const inputSize = model.inputSize;
    
    // Mock image preprocessing
    return {
      tensor: Array.from({ length: inputSize * inputSize * 3 }, () => Math.random()),
      originalSize: { width: 1920, height: 1080 },
      processedSize: { width: inputSize, height: inputSize },
      normalization: 'imagenet' // Mean: [0.485, 0.456, 0.406], Std: [0.229, 0.224, 0.225]
    };
  }

  private async runInference(model: any, preprocessedInput: any): Promise<any> {
    return model.predict(preprocessedInput);
  }

  private mockInference(_input: any, modelInfo: ModelInfo): any {
    const numClasses = modelInfo.parameters['num_classes'] || 1000;
    
    // Generate mock predictions with realistic distribution
    const logits = Array.from({ length: numClasses }, () => Math.random() * 10 - 5);
    
    // Apply softmax to get probabilities
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(x => Math.exp(x - maxLogit));
    const sumExp = expLogits.reduce((sum, x) => sum + x, 0);
    const probabilities = expLogits.map(x => x / sumExp);

    return {
      logits,
      probabilities,
      features: Array.from({ length: 2048 }, () => Math.random()) // Feature vector
    };
  }

  private async postprocessPredictions(predictions: any, _model: any, request: ModelRequest): Promise<any> {
    const topK = request.parameters?.['top_k'] || this.config['topK'];
    
    // Get top-K predictions
    const indexed = predictions.probabilities.map((prob: number, index: number) => ({
      class_id: index,
      probability: prob,
      class_name: this.getClassName(index)
    }));

    // Sort by probability and take top-K
    const topPredictions = indexed
      .sort((a: any, b: any) => b.probability - a.probability)
      .slice(0, topK);

    return {
      predictions: topPredictions,
      features: predictions.features,
      confidence: topPredictions[0]?.probability || 0,
      predicted_class: topPredictions[0]?.class_name || 'unknown'
    };
  }

  private getClassName(classId: number): string {
    if (this.imageNetClasses.length > classId) {
      return this.imageNetClasses[classId] || `class_${classId}`;
    }
    return `class_${classId}`;
  }

  private async loadImageNetClasses(): Promise<void> {
    // Mock ImageNet class loading (first 50 classes)
    this.imageNetClasses = [
      'tench', 'goldfish', 'great white shark', 'tiger shark', 'hammerhead',
      'electric ray', 'stingray', 'cock', 'hen', 'ostrich', 'brambling',
      'goldfinch', 'house finch', 'junco', 'indigo bunting', 'robin',
      'bulbul', 'jay', 'magpie', 'chickadee', 'water ouzel', 'kite',
      'bald eagle', 'vulture', 'great grey owl', 'European fire salamander',
      'common newt', 'eft', 'spotted salamander', 'axolotl', 'bullfrog',
      'tree frog', 'tailed frog', 'loggerhead', 'leatherback turtle',
      'mud turtle', 'terrapin', 'box turtle', 'banded gecko', 'common iguana',
      'American chameleon', 'whiptail', 'agama', 'frilled lizard',
      'alligator lizard', 'Gila monster', 'green lizard', 'African chameleon',
      'Komodo dragon', 'African crocodile'
    ];
    
    // Fill remaining classes
    for (let i = this.imageNetClasses.length; i < 1000; i++) {
      this.imageNetClasses.push(`class_${i}`);
    }
  }

  private async formatResponse(results: any, request: ModelRequest, model: any): Promise<ModelResponse> {
    return {
      content: {
        predictions: results.predictions,
        top_prediction: {
          class_name: results.predicted_class,
          confidence: results.confidence,
          class_id: results.predictions[0]?.class_id || 0
        },
        features: results.features.slice(0, 100), // Return first 100 features
        model_info: {
          model_id: model.id,
          architecture: this.getArchitectureType(model.id),
          input_size: model.inputSize,
          num_classes: model.numClasses,
          parameters: model.info.metadata.parameters,
          flops: model.info.metadata.flops
        }
      },
      model: request.model,
      usage: {
        inputSize: this.calculateImageSize(request.input),
        outputSize: results.predictions.length,
        processingTime: 0 // Will be set by caller
      },
      finishReason: 'completed',
      metadata: {
        provider: this.name,
        backend: this.config['backend'],
        architecture: this.getArchitectureType(model.id),
        top_k: results.predictions.length,
        confidence: results.confidence
      }
    };
  }

  private getArchitectureType(modelId: string): string {
    if (modelId.includes('resnet')) return 'ResNet';
    if (modelId.includes('efficientnet')) return 'EfficientNet';
    if (modelId.includes('mobilenet')) return 'MobileNet';
    if (modelId.includes('vit')) return 'Vision Transformer';
    if (modelId.includes('inception')) return 'Inception';
    return 'CNN';
  }

  private calculateImageSize(input: any): number {
    if (Buffer.isBuffer(input)) {
      return input.length;
    } else if (typeof input === 'string') {
      return input.length;
    } else if (Array.isArray(input)) {
      return input.length;
    }
    return 1;
  }

  private validateClassificationParameters(
    parameters: any, 
    errors: any[], 
    warnings: any[]
  ): void {
    // Validate top_k
    if (parameters['top_k'] !== undefined) {
      if (parameters['top_k'] < 1 || parameters['top_k'] > 1000) {
        errors.push({
          field: 'parameters.top_k',
          message: 'top_k must be between 1 and 1000',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate input_size
    if (parameters['input_size'] !== undefined) {
      const validSizes = [224, 299, 300, 331, 380, 456, 528, 600];
      if (!validSizes.includes(parameters['input_size'])) {
        warnings.push({
          field: 'parameters.input_size',
          message: 'Input size may not be optimal for the model',
          suggestion: `Common sizes: ${validSizes.join(', ')}`
        });
      }
    }

    // Validate batch_size
    if (parameters['batch_size'] !== undefined) {
      if (parameters['batch_size'] < 1 || parameters['batch_size'] > 64) {
        warnings.push({
          field: 'parameters.batch_size',
          message: 'Batch size should be between 1 and 64',
          suggestion: 'Use smaller batch sizes for better memory efficiency'
        });
      }
    }
  }

  private async checkTensorFlowJSAvailability(): Promise<boolean> {
    try {
      // Mock TensorFlow.js availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkONNXAvailability(): Promise<boolean> {
    try {
      // Mock ONNX availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async initializeTensorFlowJS(): Promise<void> {
    // Mock TensorFlow.js initialization
    console.log('TensorFlow.js backend initialized for image classification');
  }

  private async initializeONNX(): Promise<void> {
    // Mock ONNX initialization
    console.log('ONNX backend initialized for image classification');
  }

  override async cleanup(): Promise<void> {
    // Dispose of all loaded models
    Array.from(this.loadedModels.entries()).forEach(([modelId, model]) => {
      try {
        if (model && model.dispose) {
          model.dispose();
        }
      } catch (error) {
        console.warn(`Failed to dispose classification model ${modelId}:`, error);
      }
    });
    this.loadedModels.clear();
  }
}