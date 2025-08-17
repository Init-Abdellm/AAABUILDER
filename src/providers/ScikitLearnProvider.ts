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
 * Scikit-learn Model Provider
 * Supports traditional ML models via Python bridge
 */
export class ScikitLearnProvider extends ModelProvider {

  constructor(config: Record<string, any> = {}) {
    super('scikit-learn', 'traditional-ml', {
      pythonPath: config['pythonPath'] || 'python',
      timeout: config['timeout'] || 30000,
      maxConcurrency: config['maxConcurrency'] || 4,
      ...config
    });
  }

  override supports(modelType: ModelType): boolean {
    const supportedTypes: ModelType[] = [
      'MLP', 'CNN', 'RNN', 'Autoencoder'
    ];
    return supportedTypes.includes(modelType);
  }

  override async execute(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Prepare data for Python execution
      const pythonRequest = await this.preparePythonRequest(request);
      
      // Execute model via Python bridge
      const result = await this.executePythonModel(pythonRequest);

      // Build base response and run through provider post-processing
      const baseResponse: ModelResponse = {
        content: {
          predictions: result.predictions,
          probabilities: result.probabilities,
          feature_importance: result.feature_importance,
          model_info: result.model_info
        },
        model: request.model,
        usage: {
          inputSize: this.calculateInputSize(request.input),
          outputSize: Array.isArray(result.predictions) ? result.predictions.length : 0,
          duration: 0
        },
        finishReason: 'completed',
        metadata: {
          provider: this.name,
          task_type: result.model_info.task_type,
          n_features: result.model_info.n_features
        }
      };
      const response = await this.processResponse(baseResponse);
      
      const duration = Date.now() - startTime;
      
      return {
        ...response,
        usage: {
          ...response.usage,
          duration
        }
      };

    } catch (error) {
      throw new Error(`Scikit-learn execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  override getCapabilities(): ModelCapabilities {
    return {
      supportedTypes: ['MLP', 'CNN', 'RNN', 'Autoencoder'],
      capabilities: [
        'text-classification',
        'clustering',
        'anomaly-detection',
        'dimensionality-reduction',
        'feature-selection'
      ],
      maxInputSize: 1000000, // 1M features
      maxOutputSize: 10000,
      streaming: false,
      fineTuning: true,
      multimodal: false,
      batchProcessing: true
    };
  }

  override validateConfig(config: ModelConfig): ValidationResult {
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

    // Validate model type
    const validModels = [
      'RandomForestClassifier', 'RandomForestRegressor',
      'SVC', 'SVR', 'LogisticRegression', 'LinearRegression',
      'KMeans', 'DBSCAN', 'IsolationForest',
      'MLPClassifier', 'MLPRegressor'
    ];

    if (config.model && !validModels.includes(config.model)) {
      warnings.push({
        field: 'model',
        message: `Model '${config.model}' may not be supported`,
        suggestion: `Try one of: ${validModels.slice(0, 5).join(', ')}`
      });
    }

    // Validate parameters
    if (config.parameters) {
      this.validateModelParameters(config.model, config.parameters, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  override async listModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [
      // Classification Models
      {
        id: 'sklearn-random-forest-classifier',
        name: 'Random Forest Classifier',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          n_estimators: 100,
          max_depth: null,
          min_samples_split: 2,
          min_samples_leaf: 1
        },
        metadata: {
          version: '1.3.0',
          description: 'Ensemble classifier using multiple decision trees',
          category: 'classification',
          complexity: 'medium'
        },
        available: true
      },
      {
        id: 'sklearn-svc',
        name: 'Support Vector Classifier',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          C: 1.0,
          kernel: 'rbf',
          gamma: 'scale'
        },
        metadata: {
          version: '1.3.0',
          description: 'Support Vector Machine for classification',
          category: 'classification',
          complexity: 'high'
        },
        available: true
      },
      {
        id: 'sklearn-logistic-regression',
        name: 'Logistic Regression',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          C: 1.0,
          max_iter: 100,
          solver: 'lbfgs'
        },
        metadata: {
          version: '1.3.0',
          description: 'Linear model for classification',
          category: 'classification',
          complexity: 'low'
        },
        available: true
      },

      // Regression Models
      {
        id: 'sklearn-random-forest-regressor',
        name: 'Random Forest Regressor',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          n_estimators: 100,
          max_depth: null,
          min_samples_split: 2
        },
        metadata: {
          version: '1.3.0',
          description: 'Ensemble regressor using multiple decision trees',
          category: 'regression',
          complexity: 'medium'
        },
        available: true
      },
      {
        id: 'sklearn-linear-regression',
        name: 'Linear Regression',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          fit_intercept: true,
          normalize: false
        },
        metadata: {
          version: '1.3.0',
          description: 'Ordinary least squares linear regression',
          category: 'regression',
          complexity: 'low'
        },
        available: true
      },

      // Clustering Models
      {
        id: 'sklearn-kmeans',
        name: 'K-Means Clustering',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          n_clusters: 8,
          init: 'k-means++',
          max_iter: 300
        },
        metadata: {
          version: '1.3.0',
          description: 'K-means clustering algorithm',
          category: 'clustering',
          complexity: 'medium'
        },
        available: true
      },

      // Neural Network Models
      {
        id: 'sklearn-mlp-classifier',
        name: 'Multi-layer Perceptron Classifier',
        type: 'MLP',
        provider: this.name,
        capabilities: this.getCapabilities(),
        parameters: {
          hidden_layer_sizes: [100],
          activation: 'relu',
          solver: 'adam',
          learning_rate: 'constant'
        },
        metadata: {
          version: '1.3.0',
          description: 'Multi-layer perceptron neural network for classification',
          category: 'neural-network',
          complexity: 'high'
        },
        available: true
      }
    ];

    return models;
  }

  override async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  override async isAvailable(): Promise<boolean> {
    try {
      // Check if Python and scikit-learn are available
      const result = await this.executePythonCommand([
        '-c', 
        'import sklearn; print(sklearn.__version__)'
      ]);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  override async initialize(): Promise<void> {
    try {
      // Initialize Python bridge
      await this.initializePythonBridge();
      
      // Verify scikit-learn installation
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Scikit-learn is not available. Please install: pip install scikit-learn');
      }

      console.log('Scikit-learn provider initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Scikit-learn provider:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateRequest(request: ModelRequest): ValidationResult {
    const errors = [];

    if (!request.input) {
      errors.push({
        field: 'input',
        message: 'Input data is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (request.input && !Array.isArray(request.input) && typeof request.input !== 'object') {
      errors.push({
        field: 'input',
        message: 'Input must be an array or object',
        code: 'INVALID_TYPE'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private async preparePythonRequest(request: ModelRequest): Promise<any> {
    return {
      model: request.model,
      input: request.input,
      parameters: request.parameters || {},
      task: this.inferTaskType(request)
    };
  }

  private inferTaskType(request: ModelRequest): string {
    const modelName = request.model.toLowerCase();
    
    if (modelName.includes('classifier') || modelName.includes('svc')) {
      return 'classification';
    } else if (modelName.includes('regressor') || modelName.includes('svr')) {
      return 'regression';
    } else if (modelName.includes('kmeans') || modelName.includes('dbscan')) {
      return 'clustering';
    } else if (modelName.includes('isolation')) {
      return 'anomaly_detection';
    }
    
    return 'prediction';
  }

  private async executePythonModel(pythonRequest: any): Promise<any> {
    // This would execute the actual Python model
    // For now, return a mock response
    return {
      predictions: this.generateMockPredictions(pythonRequest),
      probabilities: pythonRequest.task === 'classification' ? this.generateMockProbabilities() : null,
      feature_importance: this.generateMockFeatureImportance(),
      model_info: {
        model_type: pythonRequest.model,
        task_type: pythonRequest.task,
        n_features: Array.isArray(pythonRequest.input) ? pythonRequest.input.length : 
                   Array.isArray(pythonRequest.input[0]) ? pythonRequest.input[0].length : 1
      }
    };
  }

  private generateMockPredictions(request: any): any[] {
    const inputSize = Array.isArray(request.input) ? request.input.length : 1;
    
    if (request.task === 'classification') {
      return Array.from({ length: inputSize }, () => Math.floor(Math.random() * 3));
    } else if (request.task === 'regression') {
      return Array.from({ length: inputSize }, () => Math.random() * 100);
    } else if (request.task === 'clustering') {
      return Array.from({ length: inputSize }, () => Math.floor(Math.random() * 5));
    }
    
    return [0.5];
  }

  private generateMockProbabilities(): number[][] {
    return [[0.7, 0.2, 0.1], [0.1, 0.8, 0.1], [0.3, 0.3, 0.4]];
  }

  private generateMockFeatureImportance(): number[] {
    return [0.3, 0.2, 0.15, 0.1, 0.25];
  }

  protected override async processResponse(response: ModelResponse): Promise<ModelResponse> {
    // Add any scikit-learn specific post-processing here if needed
    return response;
  }

  private calculateInputSize(input: any): number {
    if (Array.isArray(input)) {
      return input.length;
    } else if (typeof input === 'object') {
      return Object.keys(input).length;
    }
    return 1;
  }

  private validateModelParameters(
    modelName: string, 
    parameters: any, 
    errors: any[], 
    warnings: any[]
  ): void {
    // Model-specific parameter validation
    if (modelName === 'RandomForestClassifier' || modelName === 'RandomForestRegressor') {
      if (parameters.n_estimators && (parameters.n_estimators < 1 || parameters.n_estimators > 1000)) {
        warnings.push({
          field: 'parameters.n_estimators',
          message: 'n_estimators should be between 1 and 1000',
          suggestion: 'Use a value between 10 and 200 for best performance'
        });
      }
    }

    if (modelName === 'SVC' || modelName === 'SVR') {
      if (parameters.C && parameters.C <= 0) {
        errors.push({
          field: 'parameters.C',
          message: 'C parameter must be positive',
          code: 'INVALID_VALUE'
        });
      }
    }
  }

  private async initializePythonBridge(): Promise<void> {
    // Initialize Python bridge (mock implementation)
    // Bridge initialization completed
  }

  private async executePythonCommand(_args: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
    // Mock Python command execution
    return {
      success: true,
      output: '1.3.0'
    };
  }
}