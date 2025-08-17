declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      
      // AI Provider API Keys
      OPENAI_API_KEY?: string;
      GEMINI_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      COHERE_API_KEY?: string;
      REPLICATE_API_KEY?: string;
      HUGGINGFACE_API_KEY?: string;
      OLLAMA_URL?: string;
      
      // Security
      AAAB_ENCRYPTION_KEY?: string;
      AAAB_JWT_SECRET?: string;
      AAAB_SESSION_SECRET?: string;
      
      // Cloud Services
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
      GCP_PROJECT_ID?: string;
      GCP_CREDENTIALS?: string;
      AZURE_STORAGE_CONNECTION_STRING?: string;
      
      // Database
      DATABASE_URL?: string;
      REDIS_URL?: string;
      MONGODB_URI?: string;
      
      // Monitoring
      SENTRY_DSN?: string;
      NEW_RELIC_LICENSE_KEY?: string;
      DATADOG_API_KEY?: string;
      
      // Vector Databases
      PINECONE_API_KEY?: string;
      PINECONE_ENVIRONMENT?: string;
      WEAVIATE_API_KEY?: string;
      WEAVIATE_URL?: string;
      QDRANT_API_KEY?: string;
      QDRANT_URL?: string;
      CHROMA_URL?: string;
    }
  }
}

// AI/ML Model Types
export interface AIModel {
  id: string;
  name: string;
  type: ModelType;
  provider: string;
  capabilities: ModelCapability[];
  parameters: ModelParameters;
  metadata: ModelMetadata;
}

export type ModelType = 
  | 'LLM' | 'SLM' | 'MLM' | 'Vision' | 'ASR' | 'TTS' 
  | 'RL' | 'GNN' | 'RNN' | 'CNN' | 'GAN' | 'Diffusion' 
  | 'Transformer' | 'MLP' | 'Autoencoder' | 'BERT' 
  | 'RAG' | 'Hybrid' | 'Foundation';

export type ModelCapability = 
  | 'text-generation' | 'text-completion' | 'text-embedding'
  | 'image-generation' | 'image-classification' | 'image-segmentation'
  | 'object-detection' | 'face-recognition' | 'ocr'
  | 'speech-to-text' | 'text-to-speech' | 'voice-cloning'
  | 'code-generation' | 'code-completion' | 'code-analysis'
  | 'mathematical-reasoning' | 'logical-reasoning'
  | 'multimodal' | 'streaming' | 'fine-tuning'
  | 'reinforcement-learning' | 'graph-processing'
  | 'time-series' | 'anomaly-detection' | 'recommendation'
  | 'image-captioning' | 'language-detection' | 'text-classification'
  | 'clustering' | 'dimensionality-reduction' | 'feature-selection';

export interface ModelParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  [key: string]: any;
}

export interface ModelMetadata {
  version: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  size?: number;
  architecture?: string;
  trainingData?: string;
  lastUpdated?: string;
  [key: string]: any;
}

// Provider Types
export interface AIProvider {
  name: string;
  type: ProviderType;
  models: AIModel[];
  capabilities: ProviderCapability[];
  config: ProviderConfig;
}

export type ProviderType = 
  | 'openai' | 'anthropic' | 'google' | 'cohere' | 'replicate'
  | 'huggingface' | 'ollama' | 'local' | 'custom';

export type ProviderCapability = 
  | 'chat' | 'completion' | 'embedding' | 'vision' | 'audio'
  | 'streaming' | 'fine-tuning' | 'function-calling' | 'tools';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: RateLimitConfig;
  [key: string]: any;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// Agent Types
export interface Agent {
  id: string;
  version: string;
  name: string;
  description?: string;
  trigger: AgentTrigger;
  secrets: Record<string, Secret>;
  variables: Record<string, Variable>;
  steps: AgentStep[];
  output: string;
  metadata: AgentMetadata;
}

export interface AgentTrigger {
  type: 'http' | 'cron' | 'event' | 'webhook' | 'stream';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path?: string;
  schedule?: string;
  event?: string;
  config?: Record<string, any>;
}

export interface Secret {
  type: 'env' | 'file' | 'vault' | 'encrypted';
  value: string;
  description?: string;
  required?: boolean;
}

export interface Variable {
  type: 'input' | 'env' | 'literal' | 'computed';
  path?: string;
  value?: any;
  required?: boolean;
  default?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value: any;
  message?: string;
}

export interface AgentStep {
  id: string;
  type: StepType;
  name?: string;
  description?: string;
  when?: string;
  retries?: number;
  timeout?: number;
  save?: string;
  config: StepConfig;
}

export type StepType = 
  | 'llm' | 'http' | 'function' | 'vision' | 'asr' | 'tts'
  | 'ml' | 'data' | 'file' | 'database' | 'cache' | 'loop'
  | 'condition' | 'parallel' | 'error-handler';

export interface StepConfig {
  [key: string]: any;
}

export interface AgentMetadata {
  author?: string;
  tags?: string[];
  category?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  estimatedRuntime?: number;
  dependencies?: string[];
  examples?: AgentExample[];
  [key: string]: any;
}

export interface AgentExample {
  name: string;
  description: string;
  input: Record<string, any>;
  output: Record<string, any>;
}

// Execution Types
export interface ExecutionContext {
  agent: Agent;
  input: Record<string, any>;
  variables: Record<string, any>;
  state: Record<string, any>;
  secrets: Record<string, string>;
  metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  executionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: ExecutionStatus;
  steps: StepExecution[];
  errors: ExecutionError[];
  metrics: ExecutionMetrics;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StepExecution {
  stepId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: ExecutionError;
}

export interface ExecutionError {
  stepId?: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  retryable?: boolean;
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  averageStepDuration: number;
  memoryUsage: number;
  cpuUsage: number;
  [key: string]: any;
}

// Plugin Types
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  hooks: PluginHook[];
  config?: Record<string, any>;
}

export interface PluginHook {
  name: string;
  handler: (context: ExecutionContext, ...args: any[]) => Promise<any>;
  priority?: number;
}

// Vision Types
export interface VisionModel extends AIModel {
  type: 'Vision';
  capabilities: VisionCapability[];
  imageFormats: string[];
  maxImageSize: number;
  maxImages: number;
}

export type VisionCapability = 
  | 'image-classification' | 'object-detection' | 'image-segmentation'
  | 'face-recognition' | 'ocr' | 'image-generation' | 'image-editing'
  | 'image-captioning' | 'visual-question-answering' | 'image-similarity';

export interface VisionInput {
  images: ImageInput[];
  prompt?: string;
  parameters?: VisionParameters;
}

export interface ImageInput {
  data: Buffer | string;
  format: string;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  channels?: number;
  filename?: string;
  mimeType?: string;
  [key: string]: any;
}

export interface VisionParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  confidence?: number;
  [key: string]: any;
}

// Audio Types
export interface AudioModel extends AIModel {
  type: 'ASR' | 'TTS';
  capabilities: AudioCapability[];
  audioFormats: string[];
  sampleRates: number[];
  channels: number[];
}

export type AudioCapability = 
  | 'speech-to-text' | 'text-to-speech' | 'voice-cloning'
  | 'speaker-identification' | 'emotion-detection' | 'language-detection'
  | 'noise-reduction' | 'audio-enhancement';

export interface AudioInput {
  audio: AudioData;
  parameters?: AudioParameters;
}

export interface AudioData {
  data: Buffer;
  format: string;
  sampleRate: number;
  channels: number;
  duration?: number;
  metadata?: AudioMetadata;
}

export interface AudioMetadata {
  filename?: string;
  mimeType?: string;
  bitrate?: number;
  [key: string]: any;
}

export interface AudioParameters {
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  [key: string]: any;
}

// Machine Learning Types
export interface MLModel extends AIModel {
  type: 'MLP' | 'CNN' | 'RNN' | 'GNN' | 'GAN' | 'Diffusion' | 'Transformer' | 'Autoencoder';
  architecture: MLArchitecture;
  inputShape: number[];
  outputShape: number[];
  parameters: MLParameters;
}

export interface MLArchitecture {
  type: string;
  layers: Layer[];
  optimizer: string;
  loss: string;
  metrics: string[];
}

export interface Layer {
  type: string;
  units?: number;
  activation?: string;
  kernelSize?: number[];
  filters?: number;
  dropout?: number;
  [key: string]: any;
}

export interface MLParameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  [key: string]: any;
}

// Database Types
export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'level' | 'rocksdb';
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
}

// Vector Database Types
export interface VectorDatabase {
  type: 'pinecone' | 'weaviate' | 'qdrant' | 'chroma' | 'milvus';
  config: VectorDBConfig;
  collections: Collection[];
}

export interface VectorDBConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  [key: string]: any;
}

export interface Collection {
  name: string;
  dimensions: number;
  distance: 'cosine' | 'euclidean' | 'dotproduct';
  metadata?: Record<string, any>;
}

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  payload?: any;
}

// Fine-tuning Types
export interface FineTuningJob {
  id: string;
  modelId: string;
  status: FineTuningStatus;
  trainingData: TrainingData;
  hyperparameters: Hyperparameters;
  metrics: FineTuningMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export type FineTuningStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TrainingData {
  format: 'jsonl' | 'csv' | 'json';
  data: string | Buffer;
  validationSplit: number;
  metadata?: Record<string, any>;
}

export interface Hyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  warmupSteps: number;
  weightDecay: number;
  [key: string]: any;
}

export interface FineTuningMetrics {
  loss: number[];
  accuracy: number[];
  validationLoss: number[];
  validationAccuracy: number[];
  [key: string]: any;
}

export {};
