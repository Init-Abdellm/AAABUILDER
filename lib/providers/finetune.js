const logger = require('../diagnostics/logger');
const mask = require('../diagnostics/mask');
const fs = require('fs');
const path = require('path');

/**
 * Fine-tuning Provider
 * Supports OpenAI and HuggingFace fine-tuning operations
 */
class FineTuneProvider {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = null;
  }

  /**
   * Initialize the fine-tuning provider
   */
  async initialize(config) {
    try {
      switch (this.provider) {
        case 'openai':
          await this.initializeOpenAI(config);
          break;
        case 'huggingface':
          await this.initializeHuggingFace(config);
          break;
        default:
          throw new Error(`Unsupported fine-tuning provider: ${this.provider}`);
      }
      logger.debug(`Fine-tuning provider ${this.provider} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.provider} fine-tuning: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize OpenAI fine-tuning
   */
  async initializeOpenAI(config) {
    const OpenAI = require('openai');
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for fine-tuning');
    }
    
    this.client = new OpenAI({ apiKey: config.apiKey });
    
    // Test connection
    await this.client.models.list();
  }

  /**
   * Initialize HuggingFace fine-tuning
   */
  async initializeHuggingFace(config) {
    if (!config.apiKey) {
      throw new Error('HuggingFace API key is required for fine-tuning');
    }
    
    this.apiKey = config.apiKey;
    this.apiUrl = 'https://api-inference.huggingface.co';
    
    // Test connection
    const response = await fetch(`${this.apiUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace API test failed: ${response.status}`);
    }
  }

  /**
   * Create a fine-tuning job
   */
  async createFineTuneJob(config) {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.createOpenAIFineTune(config);
        case 'huggingface':
          return await this.createHuggingFaceFineTune(config);
      }
    } catch (error) {
      logger.error(`Failed to create fine-tuning job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create OpenAI fine-tuning job
   */
  async createOpenAIFineTune(config) {
    const {
      trainingFile,
      validationFile,
      model = 'gpt-3.5-turbo',
      hyperparameters = {},
      suffix
    } = config;

    // Validate training file
    if (!trainingFile || !fs.existsSync(trainingFile)) {
      throw new Error(`Training file not found: ${trainingFile}`);
    }

    // Upload training file if it's a local file
    let trainingFileId = trainingFile;
    if (fs.existsSync(trainingFile)) {
      const file = await this.client.files.create({
        file: fs.createReadStream(trainingFile),
        purpose: 'fine-tune'
      });
      trainingFileId = file.id;
      logger.debug(`Training file uploaded: ${trainingFileId}`);
    }

    // Upload validation file if provided
    let validationFileId = validationFile;
    if (validationFile && fs.existsSync(validationFile)) {
      const file = await this.client.files.create({
        file: fs.createReadStream(validationFile),
        purpose: 'fine-tune'
      });
      validationFileId = file.id;
      logger.debug(`Validation file uploaded: ${validationFileId}`);
    }

    // Create fine-tuning job
    const fineTune = await this.client.fineTuning.jobs.create({
      training_file: trainingFileId,
      validation_file: validationFileId,
      model,
      hyperparameters,
      suffix
    });

    logger.debug(`Fine-tuning job created: ${fineTune.id}`);
    
    return {
      id: fineTune.id,
      status: fineTune.status,
      model,
      trainingFile: trainingFileId,
      validationFile: validationFileId,
      createdAt: fineTune.created_at,
      provider: 'openai'
    };
  }

  /**
   * Create HuggingFace fine-tuning job
   */
  async createHuggingFaceFineTune(config) {
    const {
      model,
      dataset,
      task = 'text-generation',
      hyperparameters = {}
    } = config;

    // For HuggingFace, we'll use their training API
    const trainingConfig = {
      model,
      dataset,
      task,
      hyperparameters: {
        learning_rate: hyperparameters.learningRate || 2e-5,
        num_train_epochs: hyperparameters.epochs || 3,
        per_device_train_batch_size: hyperparameters.batchSize || 8,
        ...hyperparameters
      }
    };

    // Note: HuggingFace fine-tuning is typically done through their training API
    // This is a simplified version - in practice, you'd need to set up a training job
    logger.info(`HuggingFace fine-tuning requires setting up a training job manually`);
    
    return {
      id: `hf_${Date.now()}`,
      status: 'pending',
      model,
      task,
      hyperparameters: trainingConfig.hyperparameters,
      provider: 'huggingface',
      note: 'Manual setup required for HuggingFace fine-tuning'
    };
  }

  /**
   * List fine-tuning jobs
   */
  async listFineTuneJobs(limit = 100) {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.listOpenAIFineTunes(limit);
        case 'huggingface':
          return await this.listHuggingFaceFineTunes(limit);
      }
    } catch (error) {
      logger.error(`Failed to list fine-tuning jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * List OpenAI fine-tuning jobs
   */
  async listOpenAIFineTunes(limit) {
    const fineTunes = await this.client.fineTuning.jobs.list({ limit });
    
    return fineTunes.data.map(job => ({
      id: job.id,
      status: job.status,
      model: job.model,
      trainingFile: job.training_file,
      validationFile: job.validation_file,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
      fineTunedModel: job.fine_tuned_model,
      provider: 'openai'
    }));
  }

  /**
   * List HuggingFace fine-tuning jobs
   */
  async listHuggingFaceFineTunes(limit) {
    // HuggingFace doesn't have a direct fine-tuning jobs API
    // This would typically be managed through their training platform
    logger.info(`HuggingFace fine-tuning jobs are managed through their training platform`);
    
    return [];
  }

  /**
   * Get fine-tuning job status
   */
  async getFineTuneStatus(jobId) {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.getOpenAIFineTuneStatus(jobId);
        case 'huggingface':
          return await this.getHuggingFaceFineTuneStatus(jobId);
      }
    } catch (error) {
      logger.error(`Failed to get fine-tuning status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get OpenAI fine-tuning status
   */
  async getOpenAIFineTuneStatus(jobId) {
    const job = await this.client.fineTuning.jobs.retrieve(jobId);
    
    return {
      id: job.id,
      status: job.status,
      model: job.model,
      trainingFile: job.training_file,
      validationFile: job.validation_file,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
      fineTunedModel: job.fine_tuned_model,
      trainingMetrics: job.training_metrics,
      validationMetrics: job.validation_metrics,
      provider: 'openai'
    };
  }

  /**
   * Get HuggingFace fine-tuning status
   */
  async getHuggingFaceFineTuneStatus(jobId) {
    // HuggingFace status would be checked through their training platform
    logger.info(`HuggingFace fine-tuning status is managed through their training platform`);
    
    return {
      id: jobId,
      status: 'unknown',
      provider: 'huggingface',
      note: 'Status managed through HuggingFace training platform'
    };
  }

  /**
   * Cancel fine-tuning job
   */
  async cancelFineTuneJob(jobId) {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.cancelOpenAIFineTune(jobId);
        case 'huggingface':
          return await this.cancelHuggingFaceFineTune(jobId);
      }
    } catch (error) {
      logger.error(`Failed to cancel fine-tuning job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel OpenAI fine-tuning job
   */
  async cancelOpenAIFineTune(jobId) {
    const job = await this.client.fineTuning.jobs.cancel(jobId);
    
    logger.debug(`Fine-tuning job ${jobId} cancelled`);
    
    return {
      id: job.id,
      status: job.status,
      cancelled: true,
      provider: 'openai'
    };
  }

  /**
   * Cancel HuggingFace fine-tuning job
   */
  async cancelHuggingFaceFineTune(jobId) {
    logger.info(`HuggingFace fine-tuning cancellation is managed through their training platform`);
    
    return {
      id: jobId,
      status: 'cancelled',
      cancelled: true,
      provider: 'huggingface',
      note: 'Cancellation managed through HuggingFace training platform'
    };
  }

  /**
   * Validate training data format
   */
  validateTrainingData(filePath, format = 'jsonl') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Training file not found: ${filePath}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      switch (format) {
        case 'jsonl':
          return this.validateJSONL(content);
        case 'json':
          return this.validateJSON(content);
        case 'csv':
          return this.validateCSV(content);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to validate training data: ${error.message}`);
    }
  }

  /**
   * Validate JSONL format
   */
  validateJSONL(content) {
    const lines = content.trim().split('\n');
    let validLines = 0;
    let errors = [];

    lines.forEach((line, index) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          validLines++;
        } else {
          errors.push(`Line ${index + 1}: Missing 'messages' array`);
        }
      } catch (e) {
        errors.push(`Line ${index + 1}: Invalid JSON`);
      }
    });

    return {
      valid: errors.length === 0,
      totalLines: lines.length,
      validLines,
      errors
    };
  }

  /**
   * Validate JSON format
   */
  validateJSON(content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return {
          valid: true,
          totalLines: parsed.length,
          validLines: parsed.length,
          errors: []
        };
      } else {
        return {
          valid: false,
          totalLines: 1,
          validLines: 0,
          errors: ['Root must be an array']
        };
      }
    } catch (e) {
      return {
        valid: false,
        totalLines: 1,
        validLines: 0,
        errors: ['Invalid JSON format']
      };
    }
  }

  /**
   * Validate CSV format
   */
  validateCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return {
        valid: false,
        totalLines: lines.length,
        validLines: 0,
        errors: ['CSV must have at least header and one data row']
      };
    }

    const headers = lines[0].split(',');
    const requiredHeaders = ['prompt', 'completion'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        valid: false,
        totalLines: lines.length,
        validLines: 0,
        errors: [`Missing required headers: ${missingHeaders.join(', ')}`]
      };
    }

    return {
      valid: true,
      totalLines: lines.length - 1, // Exclude header
      validLines: lines.length - 1,
      errors: []
    };
  }
}

module.exports = FineTuneProvider;
