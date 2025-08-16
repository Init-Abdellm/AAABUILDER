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
 * YOLO Object Detection Provider
 * Supports various YOLO versions for real-time object detection
 */
export class YOLOProvider extends ModelProvider {
  private loadedModels: Map<string, any> = new Map();
  private onnxRuntime: any;

  constructor(config: Record<string, any> = {}) {
    super('yolo', 'object-detection', {
      backend: config.backend || 'onnx', // 'onnx', 'tensorflowjs', 'opencv'
      enableGPU: config.enableGPU || false,
      confidenceThreshold: config.confidenceThreshold || 0.5,
      nmsThreshold: config.nmsThreshold || 0.4,
      maxDetections: config.maxDetections || 100,
      inputSize: config.inputSize || 640,
      ...config
    });
  }

  supports(modelType: ModelType): boolean {
    const supportedTypes: ModelType[] = ['CNN', 'Vision'];
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
      const rawOutput = await this.runInference(model, preprocessedInput);
      
      // Post-process detections
      const detections = await this.postprocessDetections(rawOutput, model, request);
      
      // Format response
      const response = await this.formatResponse(detections, request, model);
      
      const duration = Date.now() - startTime;
      
      return {
        ...response,
        usage: {
          ...response.usage,
          duration
        }
      };

    } catch (error) {
      throw new Error(`YOLO execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['CNN', 'Vision'],
      capabilities: [
        'object-detection',
        'real-time-detection',
        'multi-class-detection',
        'bounding-box-regression',
        'confidence-scoring'
      ],
      maxInputSize: 1920 * 1080 * 3, // Full HD RGB
      maxOutputSize: 25200 * 85, // Max detections * (bbox + conf + classes)
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

    // Validate YOLO-specific parameters
    if (config.parameters) {
      this.validateYOLOParameters(config.parameters, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [
      // YOLOv5 Models
      {
        id: 'yolov5n',
        name: 'YOLOv5 Nano',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.45
        },
        metadata: {
          version: '7.0',
          description: 'Ultra-lightweight YOLO for mobile and edge devices',
          category: 'object-detection',
          complexity: 'low',
          accuracy: 0.459, // mAP@0.5
          speed: '45 FPS',
          model_size: '1.9MB',
          parameters: '1.9M'
        },
        available: true
      },
      {
        id: 'yolov5s',
        name: 'YOLOv5 Small',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.45
        },
        metadata: {
          version: '7.0',
          description: 'Small YOLO model balancing speed and accuracy',
          category: 'object-detection',
          complexity: 'medium',
          accuracy: 0.568,
          speed: '35 FPS',
          model_size: '14MB',
          parameters: '7.2M'
        },
        available: true
      },
      {
        id: 'yolov5m',
        name: 'YOLOv5 Medium',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.45
        },
        metadata: {
          version: '7.0',
          description: 'Medium YOLO model with good accuracy-speed tradeoff',
          category: 'object-detection',
          complexity: 'medium',
          accuracy: 0.635,
          speed: '25 FPS',
          model_size: '42MB',
          parameters: '21.2M'
        },
        available: true
      },
      {
        id: 'yolov5l',
        name: 'YOLOv5 Large',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.45
        },
        metadata: {
          version: '7.0',
          description: 'Large YOLO model with high accuracy',
          category: 'object-detection',
          complexity: 'high',
          accuracy: 0.674,
          speed: '15 FPS',
          model_size: '90MB',
          parameters: '46.5M'
        },
        available: true
      },

      // YOLOv8 Models
      {
        id: 'yolov8n',
        name: 'YOLOv8 Nano',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.7
        },
        metadata: {
          version: '8.0',
          description: 'Latest ultra-efficient YOLO with improved architecture',
          category: 'object-detection',
          complexity: 'low',
          accuracy: 0.508,
          speed: '80 FPS',
          model_size: '6MB',
          parameters: '3.2M'
        },
        available: true
      },
      {
        id: 'yolov8s',
        name: 'YOLOv8 Small',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 80,
          confidence_threshold: 0.25,
          nms_threshold: 0.7
        },
        metadata: {
          version: '8.0',
          description: 'Small YOLOv8 with enhanced feature extraction',
          category: 'object-detection',
          complexity: 'medium',
          accuracy: 0.615,
          speed: '50 FPS',
          model_size: '22MB',
          parameters: '11.2M'
        },
        available: true
      },

      // Specialized YOLO Models
      {
        id: 'yolov5-face',
        name: 'YOLOv5 Face Detection',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_classes: 1,
          confidence_threshold: 0.4,
          nms_threshold: 0.5
        },
        metadata: {
          version: '7.0',
          description: 'Specialized YOLO model for face detection',
          category: 'face-detection',
          complexity: 'medium',
          accuracy: 0.95,
          speed: '30 FPS',
          model_size: '30MB'
        },
        available: true
      },
      {
        id: 'yolov8-pose',
        name: 'YOLOv8 Pose Estimation',
        type: 'CNN',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          input_size: 640,
          num_keypoints: 17,
          confidence_threshold: 0.25,
          nms_threshold: 0.7
        },
        metadata: {
          version: '8.0',
          description: 'YOLOv8 with human pose estimation capabilities',
          category: 'pose-estimation',
          complexity: 'high',
          accuracy: 0.89,
          speed: '25 FPS',
          model_size: '50MB'
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
      // Check if ONNX Runtime or TensorFlow.js is available
      if (this.config.backend === 'onnx') {
        return await this.checkONNXAvailability();
      } else if (this.config.backend === 'tensorflowjs') {
        return await this.checkTensorFlowJSAvailability();
      }
      return true; // Mock availability
    } catch (error) {
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize the appropriate backend
      if (this.config.backend === 'onnx') {
        await this.initializeONNX();
      } else if (this.config.backend === 'tensorflowjs') {
        await this.initializeTensorFlowJS();
      }

      console.log('YOLO provider initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize YOLO provider:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateRequest(request: ModelRequest): ValidationResult {
    const errors = [];

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

    // Mock model loading
    const modelInfo = await this.getModelInfo(modelId);
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not found`);
    }

    const mockModel = {
      id: modelId,
      info: modelInfo,
      inputSize: modelInfo.parameters.input_size || 640,
      numClasses: modelInfo.parameters.num_classes || 80,
      confidenceThreshold: modelInfo.parameters.confidence_threshold || 0.25,
      nmsThreshold: modelInfo.parameters.nms_threshold || 0.45,
      predict: (input: any) => this.mockInference(input, modelInfo)
    };

    this.loadedModels.set(modelId, mockModel);
    return mockModel;
  }

  private async preprocessImage(input: any, model: any): Promise<any> {
    // Mock image preprocessing
    const inputSize = model.inputSize;
    
    return {
      tensor: Array.from({ length: inputSize * inputSize * 3 }, () => Math.random()),
      originalSize: { width: 1920, height: 1080 },
      processedSize: { width: inputSize, height: inputSize },
      scaleFactor: { x: 1920 / inputSize, y: 1080 / inputSize }
    };
  }

  private async runInference(model: any, preprocessedInput: any): Promise<any> {
    // Mock inference
    return model.predict(preprocessedInput);
  }

  private mockInference(input: any, modelInfo: ModelInfo): any {
    const numDetections = Math.floor(Math.random() * 10) + 1;
    const numClasses = modelInfo.parameters.num_classes || 80;
    
    return {
      boxes: Array.from({ length: numDetections }, () => [
        Math.random() * 640, // x1
        Math.random() * 640, // y1
        Math.random() * 640, // x2
        Math.random() * 640  // y2
      ]),
      scores: Array.from({ length: numDetections }, () => Math.random() * 0.5 + 0.5),
      classes: Array.from({ length: numDetections }, () => Math.floor(Math.random() * numClasses)),
      numDetections
    };
  }

  private async postprocessDetections(rawOutput: any, model: any, request: ModelRequest): Promise<any> {
    const confidenceThreshold = request.parameters?.confidence_threshold || model.confidenceThreshold;
    const nmsThreshold = request.parameters?.nms_threshold || model.nmsThreshold;
    const maxDetections = request.parameters?.max_detections || this.config.maxDetections;

    // Filter by confidence
    const validDetections = [];
    for (let i = 0; i < rawOutput.numDetections; i++) {
      if (rawOutput.scores[i] >= confidenceThreshold) {
        validDetections.push({
          bbox: rawOutput.boxes[i],
          confidence: rawOutput.scores[i],
          class_id: rawOutput.classes[i],
          class_name: this.getClassName(rawOutput.classes[i])
        });
      }
    }

    // Apply NMS (Non-Maximum Suppression) - simplified mock
    const nmsDetections = this.applyNMS(validDetections, nmsThreshold);

    // Limit to max detections
    return nmsDetections.slice(0, maxDetections);
  }

  private applyNMS(detections: any[], nmsThreshold: number): any[] {
    // Simplified NMS implementation (mock)
    return detections
      .sort((a, b) => b.confidence - a.confidence)
      .filter((detection, index) => {
        // Simple overlap check (mock implementation)
        return index < 20; // Limit to top 20 detections
      });
  }

  private getClassName(classId: number): string {
    // COCO dataset class names (simplified)
    const cocoClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
      'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
      'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
      'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange'
    ];
    
    return cocoClasses[classId] || `class_${classId}`;
  }

  private async formatResponse(detections: any[], request: ModelRequest, model: any): Promise<ModelResponse> {
    return {
      content: {
        detections: detections.map(det => ({
          bbox: {
            x1: det.bbox[0],
            y1: det.bbox[1],
            x2: det.bbox[2],
            y2: det.bbox[3],
            width: det.bbox[2] - det.bbox[0],
            height: det.bbox[3] - det.bbox[1]
          },
          confidence: det.confidence,
          class_id: det.class_id,
          class_name: det.class_name
        })),
        summary: {
          total_detections: detections.length,
          classes_detected: [...new Set(detections.map(d => d.class_name))],
          average_confidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length || 0,
          model_info: {
            model_id: model.id,
            input_size: model.inputSize,
            num_classes: model.numClasses,
            confidence_threshold: model.confidenceThreshold,
            nms_threshold: model.nmsThreshold
          }
        }
      },
      model: request.model,
      usage: {
        inputSize: this.calculateImageSize(request.input),
        outputSize: detections.length,
        processingTime: 0 // Will be set by caller
      },
      finishReason: 'completed',
      metadata: {
        provider: this.name,
        backend: this.config.backend,
        model_version: model.info.metadata.version,
        detection_count: detections.length
      }
    };
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

  private validateYOLOParameters(
    parameters: any, 
    errors: any[], 
    warnings: any[]
  ): void {
    // Validate confidence threshold
    if (parameters.confidence_threshold !== undefined) {
      if (parameters.confidence_threshold < 0 || parameters.confidence_threshold > 1) {
        errors.push({
          field: 'parameters.confidence_threshold',
          message: 'Confidence threshold must be between 0 and 1',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate NMS threshold
    if (parameters.nms_threshold !== undefined) {
      if (parameters.nms_threshold < 0 || parameters.nms_threshold > 1) {
        errors.push({
          field: 'parameters.nms_threshold',
          message: 'NMS threshold must be between 0 and 1',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate input size
    if (parameters.input_size !== undefined) {
      const validSizes = [320, 416, 512, 608, 640, 736, 832, 896, 960, 1024];
      if (!validSizes.includes(parameters.input_size)) {
        warnings.push({
          field: 'parameters.input_size',
          message: 'Input size should be a multiple of 32',
          suggestion: `Use one of: ${validSizes.join(', ')}`
        });
      }
    }

    // Validate max detections
    if (parameters.max_detections !== undefined) {
      if (parameters.max_detections < 1 || parameters.max_detections > 1000) {
        warnings.push({
          field: 'parameters.max_detections',
          message: 'Max detections should be between 1 and 1000',
          suggestion: 'Use values between 10 and 100 for best performance'
        });
      }
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

  private async checkTensorFlowJSAvailability(): Promise<boolean> {
    try {
      // Mock TensorFlow.js availability check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async initializeONNX(): Promise<void> {
    // Mock ONNX initialization
    this.onnxRuntime = {
      initialized: true,
      version: '1.16.0'
    };
  }

  private async initializeTensorFlowJS(): Promise<void> {
    // Mock TensorFlow.js initialization
    console.log('TensorFlow.js backend initialized for YOLO');
  }

  async cleanup(): Promise<void> {
    // Dispose of all loaded models
    for (const [modelId, model] of this.loadedModels) {
      try {
        if (model && model.dispose) {
          model.dispose();
        }
      } catch (error) {
        console.warn(`Failed to dispose YOLO model ${modelId}:`, error);
      }
    }
    this.loadedModels.clear();
  }
}