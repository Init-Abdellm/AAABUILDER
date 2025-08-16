import { YOLOProvider } from '../YOLOProvider';
import { ImageClassificationProvider } from '../ImageClassificationProvider';
import { VisionTransformerProvider } from '../VisionTransformerProvider';
import { ImageSegmentationOCRProvider } from '../ImageSegmentationOCRProvider';
import { ModelRequest, ModelConfig } from '../ModelProvider';
import { ModelType } from '../../types/global';

describe('Computer Vision Providers', () => {
  describe('YOLOProvider', () => {
    let provider: YOLOProvider;

    beforeEach(() => {
      provider = new YOLOProvider();
    });

    test('should support correct model types', () => {
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(true);
      expect(provider.supports('LLM' as ModelType)).toBe(false);
    });

    test('should return object detection capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportedTypes).toContain('CNN');
      expect(capabilities.capabilities).toContain('object-detection');
      expect(capabilities.capabilities).toContain('real-time-detection');
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.realTime).toBe(true);
    });

    test('should list YOLO models', async () => {
      const models = await provider.listModels();
      
      expect(models.length).toBeGreaterThan(0);
      
      const yolov5n = models.find(m => m.id === 'yolov5n');
      expect(yolov5n).toBeDefined();
      expect(yolov5n?.name).toBe('YOLOv5 Nano');
      expect(yolov5n?.metadata.speed).toBe('45 FPS');
      
      const yolov8n = models.find(m => m.id === 'yolov8n');
      expect(yolov8n).toBeDefined();
      expect(yolov8n?.metadata.version).toBe('8.0');
    });

    test('should execute object detection', async () => {
      const request: ModelRequest = {
        model: 'yolov5s',
        input: Buffer.from('fake-image-data'),
        parameters: {
          confidence_threshold: 0.5,
          nms_threshold: 0.4
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('detections');
      expect(response.content).toHaveProperty('summary');
      expect(response.content.summary).toHaveProperty('total_detections');
      expect(response.content.summary).toHaveProperty('classes_detected');
      expect(response.content.summary).toHaveProperty('average_confidence');
      
      // Check detection format
      if (response.content.detections.length > 0) {
        const detection = response.content.detections[0];
        expect(detection).toHaveProperty('bbox');
        expect(detection).toHaveProperty('confidence');
        expect(detection).toHaveProperty('class_id');
        expect(detection).toHaveProperty('class_name');
        expect(detection.bbox).toHaveProperty('x1');
        expect(detection.bbox).toHaveProperty('y1');
        expect(detection.bbox).toHaveProperty('width');
        expect(detection.bbox).toHaveProperty('height');
      }
    });

    test('should validate YOLO parameters', () => {
      const validConfig: ModelConfig = {
        model: 'yolov5s',
        provider: 'yolo',
        parameters: {
          confidence_threshold: 0.5,
          nms_threshold: 0.4,
          input_size: 640
        }
      };

      const result = provider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid confidence threshold', () => {
      const invalidConfig: ModelConfig = {
        model: 'yolov5s',
        provider: 'yolo',
        parameters: {
          confidence_threshold: 1.5 // Invalid: > 1
        }
      };

      const result = provider.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.confidence_threshold')).toBe(true);
    });

    test('should handle specialized YOLO models', async () => {
      const models = await provider.listModels();
      
      const faceModel = models.find(m => m.id === 'yolov5-face');
      expect(faceModel).toBeDefined();
      expect(faceModel?.metadata.category).toBe('face-detection');
      
      const poseModel = models.find(m => m.id === 'yolov8-pose');
      expect(poseModel).toBeDefined();
      expect(poseModel?.metadata.category).toBe('pose-estimation');
    });

    test('should require valid image input', async () => {
      const request: ModelRequest = {
        model: 'yolov5s',
        input: 'invalid-input'
      };

      await expect(provider.execute(request)).rejects.toThrow('Invalid request');
    });
  });

  describe('ImageClassificationProvider', () => {
    let provider: ImageClassificationProvider;

    beforeEach(() => {
      provider = new ImageClassificationProvider();
    });

    test('should support CNN and Vision Transformer types', () => {
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(true);
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('ASR' as ModelType)).toBe(false);
    });

    test('should return classification capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.capabilities).toContain('image-classification');
      expect(capabilities.capabilities).toContain('feature-extraction');
      expect(capabilities.capabilities).toContain('transfer-learning');
      expect(capabilities.fineTuning).toBe(true);
      expect(capabilities.realTime).toBe(true);
    });

    test('should list diverse classification models', async () => {
      const models = await provider.listModels();
      
      expect(models.length).toBeGreaterThan(0);
      
      // Check ResNet models
      const resnet50 = models.find(m => m.id === 'resnet50');
      expect(resnet50).toBeDefined();
      expect(resnet50?.metadata.accuracy).toBe(0.921);
      
      // Check EfficientNet models
      const efficientnet = models.find(m => m.id === 'efficientnet-b0');
      expect(efficientnet).toBeDefined();
      expect(efficientnet?.metadata.parameters).toBe('5.3M');
      
      // Check MobileNet models
      const mobilenet = models.find(m => m.id === 'mobilenet-v2');
      expect(mobilenet).toBeDefined();
      expect(mobilenet?.metadata.mobile_optimized).toBe(true);
      
      // Check Vision Transformer
      const vit = models.find(m => m.id === 'vit-base-patch16');
      expect(vit).toBeDefined();
      expect(vit?.type).toBe('Transformer');
    });

    test('should execute image classification', async () => {
      const request: ModelRequest = {
        model: 'resnet50',
        input: Buffer.from('fake-image-data'),
        parameters: {
          top_k: 5
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('top_prediction');
      expect(response.content).toHaveProperty('features');
      expect(response.content).toHaveProperty('model_info');
      
      // Check predictions format
      expect(response.content.predictions).toHaveLength(5);
      const prediction = response.content.predictions[0];
      expect(prediction).toHaveProperty('class_id');
      expect(prediction).toHaveProperty('probability');
      expect(prediction).toHaveProperty('class_name');
      
      // Check top prediction
      expect(response.content.top_prediction).toHaveProperty('class_name');
      expect(response.content.top_prediction).toHaveProperty('confidence');
      
      // Check features
      expect(Array.isArray(response.content.features)).toBe(true);
    });

    test('should validate classification parameters', () => {
      const config: ModelConfig = {
        model: 'resnet50',
        provider: 'image-classification',
        parameters: {
          top_k: 10,
          input_size: 224,
          batch_size: 32
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid top_k parameter', () => {
      const config: ModelConfig = {
        model: 'resnet50',
        provider: 'image-classification',
        parameters: {
          top_k: 2000 // Invalid: > 1000
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.top_k')).toBe(true);
    });

    test('should handle different model architectures', async () => {
      const models = await provider.listModels();
      
      const architectures = models.map(m => m.metadata.category || 'image-classification');
      expect(architectures).toContain('image-classification');
      
      // Test different input sizes
      const resnet = models.find(m => m.id === 'resnet50');
      const inception = models.find(m => m.id === 'inception-v3');
      
      expect(resnet?.parameters.input_size).toBe(224);
      expect(inception?.parameters.input_size).toBe(299);
    });
  });

  describe('VisionTransformerProvider', () => {
    let provider: VisionTransformerProvider;

    beforeEach(() => {
      provider = new VisionTransformerProvider();
    });

    test('should support Transformer and Vision types', () => {
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(true);
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('RNN' as ModelType)).toBe(false);
    });

    test('should return transformer-specific capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.capabilities).toContain('attention-visualization');
      expect(capabilities.capabilities).toContain('patch-based-analysis');
      expect(capabilities.attentionMaps).toBe(true);
      expect(capabilities.multimodal).toBe(true);
    });

    test('should list Vision Transformer models', async () => {
      const models = await provider.listModels();
      
      expect(models.length).toBeGreaterThan(0);
      
      // Check ViT Base
      const vitBase = models.find(m => m.id === 'vit-base-patch16-224');
      expect(vitBase).toBeDefined();
      expect(vitBase?.parameters.patch_size).toBe(16);
      expect(vitBase?.parameters.num_heads).toBe(12);
      expect(vitBase?.metadata.patches_per_image).toBe(196);
      
      // Check ViT Large
      const vitLarge = models.find(m => m.id === 'vit-large-patch16-224');
      expect(vitLarge).toBeDefined();
      expect(vitLarge?.parameters.num_layers).toBe(24);
      expect(vitLarge?.parameters.num_heads).toBe(16);
      
      // Check DeiT
      const deit = models.find(m => m.id === 'deit-base-patch16-224');
      expect(deit).toBeDefined();
      expect(deit?.parameters.distillation).toBe(true);
      
      // Check Swin Transformer
      const swin = models.find(m => m.id === 'swin-base-patch4-window7-224');
      expect(swin).toBeDefined();
      expect(swin?.metadata.hierarchical).toBe(true);
    });

    test('should execute Vision Transformer inference', async () => {
      const request: ModelRequest = {
        model: 'vit-base-patch16-224',
        input: Buffer.from('fake-image-data'),
        parameters: {
          top_k: 5,
          return_attention: false
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('predictions');
      expect(response.content).toHaveProperty('features');
      expect(response.content).toHaveProperty('transformer_info');
      
      // Check transformer-specific info
      expect(response.content.transformer_info).toHaveProperty('patch_size');
      expect(response.content.transformer_info).toHaveProperty('num_patches');
      expect(response.content.transformer_info).toHaveProperty('num_layers');
      expect(response.content.transformer_info).toHaveProperty('num_heads');
      
      // Check features
      expect(response.content.features).toHaveProperty('cls_features');
      expect(response.content.features).toHaveProperty('patch_features');
    });

    test('should return attention analysis when requested', async () => {
      const request: ModelRequest = {
        model: 'vit-base-patch16-224',
        input: Buffer.from('fake-image-data'),
        parameters: {
          return_attention: true
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('attention_analysis');
      expect(response.content.attention_analysis).toHaveProperty('head_analysis');
      expect(response.content.attention_analysis).toHaveProperty('layer_analysis');
      expect(response.content.attention_analysis).toHaveProperty('global_attention_map');
      expect(response.content.attention_analysis).toHaveProperty('attention_rollout');
      
      // Check head analysis
      const headAnalysis = response.content.attention_analysis.head_analysis;
      expect(Array.isArray(headAnalysis)).toBe(true);
      if (headAnalysis.length > 0) {
        expect(headAnalysis[0]).toHaveProperty('head_id');
        expect(headAnalysis[0]).toHaveProperty('average_attention');
        expect(headAnalysis[0]).toHaveProperty('focused_patches');
      }
    });

    test('should validate ViT parameters', () => {
      const config: ModelConfig = {
        model: 'vit-base-patch16-224',
        provider: 'vision-transformer',
        parameters: {
          patch_size: 16,
          image_size: 224,
          num_heads: 12,
          return_attention: true
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid patch size and image size combination', () => {
      const config: ModelConfig = {
        model: 'vit-base-patch16-224',
        provider: 'vision-transformer',
        parameters: {
          patch_size: 16,
          image_size: 225 // Not divisible by patch_size
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameters.image_size')).toBe(true);
    });

    test('should handle specialized ViT models', async () => {
      const models = await provider.listModels();
      
      const maeModel = models.find(m => m.id === 'vit-mae-base');
      expect(maeModel).toBeDefined();
      expect(maeModel?.metadata.self_supervised).toBe(true);
      expect(maeModel?.metadata.reconstruction).toBe(true);
      expect(maeModel?.parameters.mask_ratio).toBe(0.75);
    });
  });

  describe('ImageSegmentationOCRProvider', () => {
    let provider: ImageSegmentationOCRProvider;

    beforeEach(() => {
      provider = new ImageSegmentationOCRProvider();
    });

    test('should support CNN, Vision, and Transformer types', () => {
      expect(provider.supports('CNN' as ModelType)).toBe(true);
      expect(provider.supports('Vision' as ModelType)).toBe(true);
      expect(provider.supports('Transformer' as ModelType)).toBe(true);
      expect(provider.supports('ASR' as ModelType)).toBe(false);
    });

    test('should return segmentation and OCR capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.capabilities).toContain('image-segmentation');
      expect(capabilities.capabilities).toContain('semantic-segmentation');
      expect(capabilities.capabilities).toContain('instance-segmentation');
      expect(capabilities.capabilities).toContain('ocr');
      expect(capabilities.capabilities).toContain('text-detection');
      expect(capabilities.capabilities).toContain('document-analysis');
    });

    test('should list segmentation and OCR models', async () => {
      const models = await provider.listModels();
      
      expect(models.length).toBeGreaterThan(0);
      
      // Check segmentation models
      const deeplab = models.find(m => m.id === 'deeplabv3-resnet50');
      expect(deeplab).toBeDefined();
      expect(deeplab?.metadata.category).toBe('semantic-segmentation');
      expect(deeplab?.metadata.miou).toBe(0.789);
      
      const unet = models.find(m => m.id === 'unet-resnet34');
      expect(unet).toBeDefined();
      expect(unet?.metadata.medical_imaging).toBe(true);
      
      const maskrcnn = models.find(m => m.id === 'mask-rcnn-resnet50');
      expect(maskrcnn).toBeDefined();
      expect(maskrcnn?.metadata.category).toBe('instance-segmentation');
      
      // Check OCR models
      const tesseract = models.find(m => m.id === 'tesseract-v5');
      expect(tesseract).toBeDefined();
      expect(tesseract?.metadata.open_source).toBe(true);
      
      const paddleocr = models.find(m => m.id === 'paddleocr-v3');
      expect(paddleocr).toBeDefined();
      expect(paddleocr?.metadata.multilingual).toBe(true);
      
      // Check document analysis
      const layoutlm = models.find(m => m.id === 'layoutlm-v3');
      expect(layoutlm).toBeDefined();
      expect(layoutlm?.type).toBe('Transformer');
      expect(layoutlm?.metadata.document_understanding).toBe(true);
    });

    test('should execute semantic segmentation', async () => {
      const request: ModelRequest = {
        model: 'deeplabv3-resnet50',
        input: Buffer.from('fake-image-data'),
        parameters: {
          segmentation_threshold: 0.5
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('segmentation');
      expect(response.content.segmentation).toHaveProperty('mask');
      expect(response.content.segmentation).toHaveProperty('class_statistics');
      expect(response.content.segmentation).toHaveProperty('detected_classes');
      expect(response.content.segmentation).toHaveProperty('average_confidence');
      
      // Check class statistics format
      const classStats = response.content.segmentation.class_statistics;
      expect(Array.isArray(classStats)).toBe(true);
      if (classStats.length > 0) {
        expect(classStats[0]).toHaveProperty('class_id');
        expect(classStats[0]).toHaveProperty('pixel_count');
        expect(classStats[0]).toHaveProperty('percentage');
        expect(classStats[0]).toHaveProperty('class_name');
      }
    });

    test('should execute OCR', async () => {
      const request: ModelRequest = {
        model: 'tesseract-v5',
        input: Buffer.from('fake-image-data'),
        parameters: {
          ocr_confidence_threshold: 0.6,
          languages: ['eng']
        }
      };

      const response = await provider.execute(request);
      
      expect(response.content).toHaveProperty('ocr');
      expect(response.content.ocr).toHaveProperty('text_detections');
      expect(response.content.ocr).toHaveProperty('full_text');
      expect(response.content.ocr).toHaveProperty('word_count');
      expect(response.content.ocr).toHaveProperty('average_confidence');
      expect(response.content.ocr).toHaveProperty('languages_detected');
      
      // Check text detection format
      const textDetections = response.content.ocr.text_detections;
      expect(Array.isArray(textDetections)).toBe(true);
      if (textDetections.length > 0) {
        expect(textDetections[0]).toHaveProperty('text');
        expect(textDetections[0]).toHaveProperty('confidence');
        expect(textDetections[0]).toHaveProperty('bbox');
        expect(textDetections[0]).toHaveProperty('language');
        expect(textDetections[0].bbox).toHaveProperty('x1');
        expect(textDetections[0].bbox).toHaveProperty('y1');
      }
    });

    test('should validate segmentation parameters', () => {
      const config: ModelConfig = {
        model: 'deeplabv3-resnet50',
        provider: 'segmentation-ocr',
        parameters: {
          segmentation_threshold: 0.5,
          input_size: 513
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should validate OCR parameters', () => {
      const config: ModelConfig = {
        model: 'tesseract-v5',
        provider: 'segmentation-ocr',
        parameters: {
          ocr_confidence_threshold: 0.6,
          languages: ['eng', 'fra']
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid threshold parameters', () => {
      const config: ModelConfig = {
        model: 'deeplabv3-resnet50',
        provider: 'segmentation-ocr',
        parameters: {
          segmentation_threshold: 1.5, // Invalid: > 1
          ocr_confidence_threshold: -0.1 // Invalid: < 0
        }
      };

      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    test('should infer correct task type from model ID', async () => {
      // Test segmentation task inference
      const segRequest: ModelRequest = {
        model: 'deeplabv3-resnet50',
        input: Buffer.from('fake-image-data')
      };

      const segResponse = await provider.execute(segRequest);
      expect(segResponse.metadata?.task_type).toBe('segmentation');

      // Test OCR task inference
      const ocrRequest: ModelRequest = {
        model: 'tesseract-v5',
        input: Buffer.from('fake-image-data')
      };

      const ocrResponse = await provider.execute(ocrRequest);
      expect(ocrResponse.metadata?.task_type).toBe('ocr');
    });
  });

  describe('Provider Integration', () => {
    test('should all providers have consistent interface', async () => {
      const providers = [
        new YOLOProvider(),
        new ImageClassificationProvider(),
        new VisionTransformerProvider(),
        new ImageSegmentationOCRProvider()
      ];

      for (const provider of providers) {
        // Test basic interface
        expect(provider.getName()).toBeTruthy();
        expect(provider.getType()).toBeTruthy();
        expect(typeof provider.supports).toBe('function');
        expect(typeof provider.execute).toBe('function');
        expect(typeof provider.getCapabilities).toBe('function');
        expect(typeof provider.validateConfig).toBe('function');
        expect(typeof provider.listModels).toBe('function');
        expect(typeof provider.isAvailable).toBe('function');

        // Test capabilities structure
        const capabilities = provider.getCapabilities();
        expect(capabilities).toHaveProperty('supportedTypes');
        expect(capabilities).toHaveProperty('capabilities');
        expect(Array.isArray(capabilities.supportedTypes)).toBe(true);
        expect(Array.isArray(capabilities.capabilities)).toBe(true);

        // Test model listing
        const models = await provider.listModels();
        expect(Array.isArray(models)).toBe(true);
        if (models.length > 0) {
          expect(models[0]).toHaveProperty('id');
          expect(models[0]).toHaveProperty('name');
          expect(models[0]).toHaveProperty('type');
          expect(models[0]).toHaveProperty('provider');
        }
      }
    });

    test('should handle image inputs consistently', async () => {
      const providers = [
        new YOLOProvider(),
        new ImageClassificationProvider(),
        new VisionTransformerProvider()
      ];

      const imageInput = Buffer.from('fake-image-data');
      
      for (const provider of providers) {
        const models = await provider.listModels();
        if (models.length > 0) {
          const request: ModelRequest = {
            model: models[0].id,
            input: imageInput
          };

          const response = await provider.execute(request);
          expect(response).toHaveProperty('content');
          expect(response).toHaveProperty('model');
          expect(response).toHaveProperty('usage');
          expect(response.usage?.duration).toBeGreaterThan(0);
        }
      }
    });

    test('should validate image input format consistently', async () => {
      const providers = [
        new YOLOProvider(),
        new ImageClassificationProvider(),
        new VisionTransformerProvider(),
        new ImageSegmentationOCRProvider()
      ];

      for (const provider of providers) {
        const invalidRequest: ModelRequest = {
          model: 'test-model',
          input: 123 // Invalid input type
        };

        await expect(provider.execute(invalidRequest)).rejects.toThrow();
      }
    });
  });
});