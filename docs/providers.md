Providers
=========

Goal
- Single interface for language, vision, audio, multimodal, and traditional ML providers with health checks, caching, and fallbacks.

Main modules
- Router: `src/providers/ProviderRouter.ts`
- Registry: `src/providers/ModelRegistry.ts`
- Optimizer: `src/providers/ModelOptimizer.ts`
- Traditional ML: `src/providers/{ScikitLearn, XGBoost, LightGBM, TensorFlow}Provider.ts`
- Computer Vision: `src/providers/{YOLO, ImageClassification, ImageSegmentationOCR, VisionTransformer}Provider.ts`
- Audio: `src/providers/{Whisper, SpeakerEmotion, AudioEnhancement, RealTimeAudio}Provider.ts`

Usage
```ts
import { createProviderRouter } from '../src/providers';

const router = createProviderRouter();
const result = await router.execute({
  category: 'language',
  capability: 'completion',
  input: { prompt: 'Hello' }
});
```

Registration
- Providers register with `ModelRegistry` and expose capabilities and health.
- The router selects providers by capability, priority, and health, with fallback.

