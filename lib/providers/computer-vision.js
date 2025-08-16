/**
 * Computer Vision Providers (JavaScript Implementation)
 * YOLO, Image Classification, Vision Transformers, Segmentation, and OCR
 */

const { ModelProvider, ValidationUtils, ResponseUtils } = require('./ModelProvider');

/**
 * Computer Vision Provider Registry
 */
class ComputerVisionRegistry {
  constructor() {
    this.providers = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize all computer vision providers
      const yoloProvider = new YOLOProvider();
      const classificationProvider = new ImageClassificationProvider();
      const vitProvider = new VisionTransformerProvider();
      const segmentationOCRProvider = new ImageSegmentationOCRProvider();

      // Register providers
      this.providers.set('yolo', yoloProvider);
      this.providers.set('image-classification', classificationProvider);
      this.providers.set('vision-transformer', vitProvider);
      this.providers.set('segmentation-ocr', segmentationOCRProvider);

      // Initialize each provider
      await Promise.allSettled([
        yoloProvider.initialize(),
        classificationProvider.initialize(),
        vitProvider.initialize(),
        segmentationOCRProvider.initialize(),
      ]);

      this.initialized = true;
      console.log('Computer Vision providers initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize some computer vision providers:', error);
    }
  }

  getProvider(name) {
    return this.providers.get(name);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  async getAvailableProviders() {
    const providers = [];
    for (const [name, provider] of this.providers) {
      try {
        const available = await provider.isAvailable();
        if (available) {
          providers.push({ name, provider });
        }
      } catch (error) {
        console.warn(`Provider ${name} availability check failed:`, error);
      }
    }
    return providers;
  }
}

/**
 * YOLO Object Detection Provider (JavaScript)
 */
class YOLOProvider extends ModelProvider {
  constructor() {
    super('yolo', 'object-detection', {
      backend: 'onnx',
      confidenceThreshold: 0.5,
      nmsThreshold: 0.4,
      maxDetections: 100,
      inputSize: 640,
    });
    this.loadedModels = new Map();
  }

  supports(modelType) {
    return ['CNN', 'Vision'].includes(modelType);
  }

  async execute(request) {
    const startTime = Date.now();
    
    try {
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const result = this.mockYOLOExecution(request);
      const duration = Date.now() - startTime;
      
      return ResponseUtils.createModelResponse(
        result,
        request.model,
        ResponseUtils.createUsage(0, 0, null, duration),
      );

    } catch (error) {
      throw new Error(`YOLO execution failed: ${error.message}`);
    }
  }

  getCapabilities() {
    return ResponseUtils.createCapabilities(
      ['CNN', 'Vision'],
      ['object-detection', 'real-time-detection', 'multi-class-detection'],
      {
        maxInputSize: 1920 * 1080 * 3,
        maxOutputSize: 25200 * 85,
        streaming: true,
        fineTuning: true,
        batchProcessing: true,
        realTime: true,
      },
    );
  }

  validateConfig(config) {
    const errors = [];
    const warnings = [];

    const requiredError = ValidationUtils.validateRequired(config.model, 'model');
    if (requiredError) errors.push(requiredError);

    if (config.parameters?.confidence_threshold !== undefined) {
      const rangeError = ValidationUtils.validateRange(
        config.parameters.confidence_threshold, 
        'confidence_threshold', 
        0, 
        1,
      );
      if (rangeError) errors.push(rangeError);
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, warnings);
  }

  async listModels() {
    return [
      ResponseUtils.createModelInfo(
        'yolov5n',
        'YOLOv5 Nano',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 640, num_classes: 80, confidence_threshold: 0.25 },
        { version: '7.0', accuracy: 0.459, speed: '45 FPS', model_size: '1.9MB' },
      ),
      ResponseUtils.createModelInfo(
        'yolov5s',
        'YOLOv5 Small',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 640, num_classes: 80 },
        { version: '7.0', accuracy: 0.568, speed: '35 FPS', model_size: '14MB' },
      ),
      ResponseUtils.createModelInfo(
        'yolov8n',
        'YOLOv8 Nano',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 640, num_classes: 80 },
        { version: '8.0', accuracy: 0.508, speed: '80 FPS', model_size: '6MB' },
      ),
    ];
  }

  async getModelInfo(modelId) {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable() {
    return true;
  }

  validateRequest(request) {
    const errors = [];

    if (!request.input) {
      errors.push(ValidationUtils.createValidationError(
        'input',
        'Input image is required',
        'REQUIRED_FIELD',
      ));
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, []);
  }

  mockYOLOExecution(request) {
    const numDetections = Math.floor(Math.random() * 10) + 1;
    const cocoClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    ];

    const detections = Array.from({ length: numDetections }, () => {
      const classId = Math.floor(Math.random() * cocoClasses.length);
      return {
        bbox: {
          x1: Math.random() * 640,
          y1: Math.random() * 640,
          x2: Math.random() * 640,
          y2: Math.random() * 640,
          width: Math.random() * 200,
          height: Math.random() * 200,
        },
        confidence: Math.random() * 0.5 + 0.5,
        class_id: classId,
        class_name: cocoClasses[classId],
      };
    });

    return {
      detections,
      summary: {
        total_detections: detections.length,
        classes_detected: [...new Set(detections.map(d => d.class_name))],
        average_confidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length,
        model_info: {
          model_id: request.model,
          input_size: 640,
          num_classes: 80,
        },
      },
    };
  }
}

/**
 * Image Classification Provider (JavaScript)
 */
class ImageClassificationProvider extends ModelProvider {
  constructor() {
    super('image-classification', 'computer-vision', {
      backend: 'tensorflowjs',
      topK: 5,
      inputSize: 224,
    });
    this.loadedModels = new Map();
    this.imageNetClasses = [];
  }

  supports(modelType) {
    return ['CNN', 'Vision', 'Transformer'].includes(modelType);
  }

  async execute(request) {
    const startTime = Date.now();
    
    try {
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const result = this.mockClassificationExecution(request);
      const duration = Date.now() - startTime;
      
      return ResponseUtils.createModelResponse(
        result,
        request.model,
        ResponseUtils.createUsage(0, 0, null, duration),
      );

    } catch (error) {
      throw new Error(`Image classification failed: ${error.message}`);
    }
  }

  getCapabilities() {
    return ResponseUtils.createCapabilities(
      ['CNN', 'Vision', 'Transformer'],
      ['image-classification', 'feature-extraction', 'transfer-learning'],
      {
        maxInputSize: 1024 * 1024 * 3,
        maxOutputSize: 21843,
        streaming: false,
        fineTuning: true,
        batchProcessing: true,
        realTime: true,
      },
    );
  }

  validateConfig(config) {
    const errors = [];
    const warnings = [];

    const requiredError = ValidationUtils.validateRequired(config.model, 'model');
    if (requiredError) errors.push(requiredError);

    if (config.parameters?.top_k !== undefined) {
      const rangeError = ValidationUtils.validateRange(
        config.parameters.top_k, 
        'top_k', 
        1, 
        1000,
      );
      if (rangeError) errors.push(rangeError);
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, warnings);
  }

  async listModels() {
    return [
      ResponseUtils.createModelInfo(
        'resnet50',
        'ResNet-50',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 224, num_classes: 1000, weights: 'imagenet' },
        { version: '2.0', accuracy: 0.921, model_size: '98MB', parameters: '25.6M' },
      ),
      ResponseUtils.createModelInfo(
        'efficientnet-b0',
        'EfficientNet-B0',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 224, num_classes: 1000 },
        { version: '2.0', accuracy: 0.924, model_size: '20MB', parameters: '5.3M' },
      ),
      ResponseUtils.createModelInfo(
        'mobilenet-v2',
        'MobileNet V2',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 224, num_classes: 1000 },
        { version: '2.0', accuracy: 0.901, model_size: '14MB', mobile_optimized: true },
      ),
    ];
  }

  async getModelInfo(modelId) {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable() {
    return true;
  }

  validateRequest(request) {
    const errors = [];

    if (!request.input) {
      errors.push(ValidationUtils.createValidationError(
        'input',
        'Input image is required',
        'REQUIRED_FIELD',
      ));
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, []);
  }

  mockClassificationExecution(request) {
    const topK = request.parameters?.top_k || 5;
    const classes = [
      'tench', 'goldfish', 'great white shark', 'tiger shark', 'hammerhead',
      'electric ray', 'stingray', 'cock', 'hen', 'ostrich',
    ];

    const predictions = Array.from({ length: topK }, (_, i) => ({
      class_id: i,
      probability: Math.random() * (1 - i * 0.1),
      class_name: classes[i % classes.length],
    })).sort((a, b) => b.probability - a.probability);

    return {
      predictions,
      top_prediction: {
        class_name: predictions[0].class_name,
        confidence: predictions[0].probability,
        class_id: predictions[0].class_id,
      },
      features: Array.from({ length: 100 }, () => Math.random()),
      model_info: {
        model_id: request.model,
        architecture: this.getArchitectureType(request.model),
        input_size: 224,
        num_classes: 1000,
      },
    };
  }

  getArchitectureType(modelId) {
    if (modelId.includes('resnet')) return 'ResNet';
    if (modelId.includes('efficientnet')) return 'EfficientNet';
    if (modelId.includes('mobilenet')) return 'MobileNet';
    return 'CNN';
  }
}

/**
 * Vision Transformer Provider (JavaScript)
 */
class VisionTransformerProvider extends ModelProvider {
  constructor() {
    super('vision-transformer', 'transformer-vision', {
      backend: 'transformers',
      returnAttention: false,
      patchSize: 16,
    });
    this.loadedModels = new Map();
  }

  supports(modelType) {
    return ['Transformer', 'Vision', 'CNN'].includes(modelType);
  }

  async execute(request) {
    const startTime = Date.now();
    
    try {
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const result = this.mockViTExecution(request);
      const duration = Date.now() - startTime;
      
      return ResponseUtils.createModelResponse(
        result,
        request.model,
        ResponseUtils.createUsage(0, 0, null, duration),
      );

    } catch (error) {
      throw new Error(`Vision Transformer execution failed: ${error.message}`);
    }
  }

  getCapabilities() {
    return ResponseUtils.createCapabilities(
      ['Transformer', 'Vision', 'CNN'],
      ['image-classification', 'feature-extraction', 'attention-visualization'],
      {
        maxInputSize: 1024 * 1024 * 3,
        maxOutputSize: 21843,
        streaming: false,
        fineTuning: true,
        multimodal: true,
        batchProcessing: true,
        attentionMaps: true,
      },
    );
  }

  validateConfig(config) {
    const errors = [];
    const warnings = [];

    const requiredError = ValidationUtils.validateRequired(config.model, 'model');
    if (requiredError) errors.push(requiredError);

    return ValidationUtils.createValidationResult(errors.length === 0, errors, warnings);
  }

  async listModels() {
    return [
      ResponseUtils.createModelInfo(
        'vit-base-patch16-224',
        'ViT-Base/16 (224x224)',
        'Transformer',
        this.name,
        this.getCapabilities(),
        { image_size: 224, patch_size: 16, num_layers: 12, num_heads: 12 },
        { version: '1.0', accuracy: 0.928, model_size: '330MB', attention_heads: 12 },
      ),
      ResponseUtils.createModelInfo(
        'vit-large-patch16-224',
        'ViT-Large/16 (224x224)',
        'Transformer',
        this.name,
        this.getCapabilities(),
        { image_size: 224, patch_size: 16, num_layers: 24, num_heads: 16 },
        { version: '1.0', accuracy: 0.952, model_size: '1.2GB', attention_heads: 16 },
      ),
      ResponseUtils.createModelInfo(
        'deit-base-patch16-224',
        'DeiT-Base/16',
        'Transformer',
        this.name,
        this.getCapabilities(),
        { image_size: 224, patch_size: 16, distillation: true },
        { version: '1.0', accuracy: 0.934, training_efficient: true },
      ),
    ];
  }

  async getModelInfo(modelId) {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable() {
    return true;
  }

  validateRequest(request) {
    const errors = [];

    if (!request.input) {
      errors.push(ValidationUtils.createValidationError(
        'input',
        'Input image is required',
        'REQUIRED_FIELD',
      ));
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, []);
  }

  mockViTExecution(request) {
    const topK = request.parameters?.top_k || 5;
    const classes = ['tench', 'goldfish', 'shark', 'bird', 'cat'];
    const numPatches = 196; // 14x14 patches for 224x224 image with 16x16 patches

    const predictions = Array.from({ length: topK }, (_, i) => ({
      class_id: i,
      probability: Math.random() * (1 - i * 0.1),
      class_name: classes[i % classes.length],
    })).sort((a, b) => b.probability - a.probability);

    let attentionAnalysis = null;
    if (request.parameters?.return_attention) {
      attentionAnalysis = {
        head_analysis: Array.from({ length: 12 }, (_, head) => ({
          head_id: head,
          average_attention: Math.random(),
          attention_entropy: Math.random() * 5,
          focused_patches: Array.from({ length: 10 }, () => Math.floor(Math.random() * numPatches)),
        })),
        global_attention_map: Array.from({ length: numPatches }, () => Math.random()),
        attention_rollout: Array.from({ length: numPatches }, () => Math.random()),
      };
    }

    return {
      predictions,
      top_prediction: {
        class_name: predictions[0].class_name,
        confidence: predictions[0].probability,
        class_id: predictions[0].class_id,
      },
      features: {
        cls_features: Array.from({ length: 100 }, () => Math.random()),
        patch_features: Array.from({ length: 10 }, () => 
          Array.from({ length: 50 }, () => Math.random()),
        ),
      },
      attention_analysis: attentionAnalysis,
      transformer_info: {
        model_id: request.model,
        architecture: 'Vision Transformer',
        image_size: 224,
        patch_size: 16,
        num_patches: numPatches,
        num_layers: 12,
        num_heads: 12,
      },
    };
  }
}

/**
 * Image Segmentation and OCR Provider (JavaScript)
 */
class ImageSegmentationOCRProvider extends ModelProvider {
  constructor() {
    super('segmentation-ocr', 'computer-vision', {
      backend: 'tensorflowjs',
      ocrEngine: 'tesseract',
      segmentationThreshold: 0.5,
      ocrConfidenceThreshold: 0.6,
    });
    this.loadedModels = new Map();
  }

  supports(modelType) {
    return ['CNN', 'Vision', 'Transformer'].includes(modelType);
  }

  async execute(request) {
    const startTime = Date.now();
    
    try {
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const taskType = this.inferTaskType(request.model);
      let result;
      
      if (taskType === 'ocr') {
        result = this.mockOCRExecution(request);
      } else {
        result = this.mockSegmentationExecution(request);
      }
      
      const duration = Date.now() - startTime;
      
      return ResponseUtils.createModelResponse(
        result,
        request.model,
        ResponseUtils.createUsage(0, 0, null, duration),
      );

    } catch (error) {
      throw new Error(`Segmentation/OCR execution failed: ${error.message}`);
    }
  }

  getCapabilities() {
    return ResponseUtils.createCapabilities(
      ['CNN', 'Vision', 'Transformer'],
      [
        'image-segmentation', 'semantic-segmentation', 'instance-segmentation',
        'ocr', 'text-detection', 'text-recognition', 'document-analysis',
      ],
      {
        maxInputSize: 2048 * 2048 * 3,
        maxOutputSize: 2048 * 2048,
        streaming: false,
        fineTuning: true,
        batchProcessing: true,
      },
    );
  }

  validateConfig(config) {
    const errors = [];
    const warnings = [];

    const requiredError = ValidationUtils.validateRequired(config.model, 'model');
    if (requiredError) errors.push(requiredError);

    return ValidationUtils.createValidationResult(errors.length === 0, errors, warnings);
  }

  async listModels() {
    return [
      // Segmentation Models
      ResponseUtils.createModelInfo(
        'deeplabv3-resnet50',
        'DeepLabV3 ResNet-50',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 513, num_classes: 21, backbone: 'resnet50' },
        { version: '3.0', miou: 0.789, model_size: '160MB', category: 'semantic-segmentation' },
      ),
      ResponseUtils.createModelInfo(
        'unet-resnet34',
        'U-Net ResNet-34',
        'CNN',
        this.name,
        this.getCapabilities(),
        { input_size: 256, num_classes: 1, backbone: 'resnet34' },
        { version: '1.0', dice_score: 0.92, model_size: '85MB', medical_imaging: true },
      ),
      
      // OCR Models
      ResponseUtils.createModelInfo(
        'tesseract-v5',
        'Tesseract OCR v5',
        'CNN',
        this.name,
        this.getCapabilities(),
        { engine_mode: 1, languages: ['eng'] },
        { version: '5.0', accuracy: 0.95, model_size: '15MB', open_source: true },
      ),
      ResponseUtils.createModelInfo(
        'paddleocr-v3',
        'PaddleOCR v3',
        'CNN',
        this.name,
        this.getCapabilities(),
        { languages: ['ch', 'en'] },
        { version: '3.0', accuracy: 0.97, model_size: '8MB', multilingual: true },
      ),
    ];
  }

  async getModelInfo(modelId) {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async isAvailable() {
    return true;
  }

  validateRequest(request) {
    const errors = [];

    if (!request.input) {
      errors.push(ValidationUtils.createValidationError(
        'input',
        'Input image is required',
        'REQUIRED_FIELD',
      ));
    }

    return ValidationUtils.createValidationResult(errors.length === 0, errors, []);
  }

  inferTaskType(modelId) {
    if (modelId.includes('tesseract') || modelId.includes('paddleocr') || 
        modelId.includes('easyocr') || modelId.includes('craft')) {
      return 'ocr';
    }
    return 'segmentation';
  }

  mockSegmentationExecution(request) {
    const numClasses = 21; // PASCAL VOC
    const inputSize = 512;
    const vocClasses = [
      'background', 'aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus',
      'car', 'cat', 'chair', 'cow', 'diningtable', 'dog', 'horse',
      'motorbike', 'person', 'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor',
    ];

    // Generate mock segmentation mask (sample)
    const maskSample = Array.from({ length: 1000 }, () => 
      Math.floor(Math.random() * numClasses),
    );

    // Calculate class statistics
    const classCounts = new Array(numClasses).fill(0);
    maskSample.forEach(classId => classCounts[classId]++);
    
    const classStatistics = classCounts.map((count, classId) => ({
      class_id: classId,
      pixel_count: count,
      percentage: (count / maskSample.length) * 100,
      class_name: vocClasses[classId],
    })).filter(stat => stat.pixel_count > 0);

    return {
      segmentation: {
        mask: maskSample,
        class_statistics: classStatistics,
        detected_classes: classStatistics.map(stat => ({
          class_id: stat.class_id,
          class_name: stat.class_name,
        })),
        average_confidence: Math.random() * 0.3 + 0.7,
      },
      model_info: {
        model_id: request.model,
        task_type: 'segmentation',
        num_classes: numClasses,
        input_size: inputSize,
      },
    };
  }

  mockOCRExecution(request) {
    const mockTexts = [
      'Hello World', 'Computer Vision', 'OCR Technology', 
      'Machine Learning', 'Artificial Intelligence',
    ];
    
    const numDetections = Math.floor(Math.random() * 5) + 1;
    
    const textDetections = Array.from({ length: numDetections }, (_, i) => ({
      text: mockTexts[i % mockTexts.length],
      confidence: Math.random() * 0.4 + 0.6,
      bbox: {
        x1: Math.random() * 800,
        y1: Math.random() * 600,
        x2: Math.random() * 800 + 100,
        y2: Math.random() * 600 + 50,
      },
      language: 'eng',
    }));

    return {
      ocr: {
        text_detections: textDetections,
        full_text: textDetections.map(det => det.text).join(' '),
        word_count: textDetections.length,
        average_confidence: textDetections.reduce((sum, det) => sum + det.confidence, 0) / textDetections.length,
        languages_detected: ['eng'],
      },
      model_info: {
        model_id: request.model,
        task_type: 'ocr',
        languages: ['eng'],
        engine: this.config.ocrEngine,
      },
    };
  }
}

// Export all providers and registry
module.exports = {
  ComputerVisionRegistry,
  YOLOProvider,
  ImageClassificationProvider,
  VisionTransformerProvider,
  ImageSegmentationOCRProvider,
};