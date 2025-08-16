const logger = require('../diagnostics/logger');
const console = require('../utils/console');
const renderer = require('./renderer');
const secrets = require('./secrets');

// Import providers
const openaiProvider = require('../providers/openai');
const huggingfaceProvider = require('../providers/huggingface');
const geminiProvider = require('../providers/gemini');
const ollamaProvider = require('../providers/ollama');
const llamaProvider = require('../providers/llama');
const visionProvider = require('../providers/vision');
const audioProvider = require('../providers/audio');
const VectorDBProvider = require('../providers/vectordb');
const FineTuneProvider = require('../providers/finetune');

class AgentOrchestrator {
  constructor() {
    this.providers = {
      openai: openaiProvider,
      huggingface: huggingfaceProvider,
      gemini: geminiProvider,
      ollama: ollamaProvider,
      llama: llamaProvider,
    };
    
    // Initialize advanced providers
    this.visionProvider = visionProvider;
    this.audioProvider = audioProvider;
    this.vectorDBProvider = null;
    this.fineTuneProvider = null;
  }

  async execute(ast, input = {}, options = {}) {
    console.execution(ast.id, ast.version, input);

    const context = {
      input: input,
      vars: {},
      state: {},
      secrets: await secrets.resolveSecrets(ast.secrets),
      // Execution options (e.g., streaming and generation params)
      ...options,
    };

    console.section('Initialization');
    console.debug('Resolving secrets and variables');
    
    // Resolve variables
    await this.resolveVariables(ast, context);
    console.success(`Variables resolved: ${Object.keys(context.vars).length} variables`);

    // Execute steps sequentially
    console.section('Step Execution');
    let stepNumber = 1;
    for (const step of ast.steps) {
      try {
        console.step(stepNumber, `${step.id} (${step.kind})`, 'running');
        await this.executeStep(ast, step, context);
        console.step(stepNumber, `${step.id} (${step.kind})`, 'success');
        stepNumber++;
      } catch (error) {
        console.step(stepNumber, `${step.id} (${step.kind})`, 'error');
        console.error(`Step '${step.id}' failed: ${error.message}`);
        throw error;
      }
    }

    // Resolve and return output
    console.section('Output Generation');
    const output = await this.resolveOutput(ast, context);
    console.success('Output generated successfully');
    console.json(output, 'Final Output');
    
    console.summary({
      'Agent': `${ast.id} v${ast.version}`,
      'Steps Executed': stepNumber - 1,
      'Variables Used': Object.keys(context.vars).length,
      'Success': true,
    });
    
    return output;
  }

  async resolveVariables(ast, context) {
    console.debug('Resolving variables');

    for (const [name, varDef] of Object.entries(ast.vars)) {
      if (varDef.type === 'input') {
        context.vars[name] = this.getNestedValue(context.input, varDef.path);
        console.debug(`Variable '${name}' resolved from input: ${context.vars[name]}`);
      } else if (varDef.type === 'env') {
        context.vars[name] = process.env[varDef.path];
        console.debug(`Variable '${name}' resolved from env: ${context.vars.path}`);
      } else if (varDef.type === 'literal') {
        context.vars[name] = varDef.value;
        console.debug(`Variable '${name}' set to literal: ${context.vars.value}`);
      }
    }
  }

  async executeStep(ast, step, context) {
    logger.debug(`Executing step: ${step.id} (${step.kind})`);

    // Check when condition
    if (step.when) {
      const conditionValue = await renderer.render(step.when, context);
      if (!conditionValue) {
        logger.debug(`Skipping step '${step.id}' due to when condition`);
        return;
      }
    }

    let result;
    let attempt = 0;
    const maxAttempts = (step.retries || 0) + 1;

    while (attempt < maxAttempts) {
      try {
        switch (step.kind) {
        case 'llm':
          result = await this.executeLLMStep(step, context);
          break;
        case 'http':
          result = await this.executeHTTPStep(step, context);
          break;
        case 'function':
          result = await this.executeFunctionStep(step, context);
          break;
        case 'vision':
          result = await this.executeVisionStep(step, context);
          break;
        case 'audio':
          result = await this.executeAudioStep(step, context);
          break;
        case 'vectordb':
          result = await this.executeVectorDBStep(step, context);
          break;
        case 'finetune':
          result = await this.executeFineTuneStep(step, context);
          break;
        default:
          throw new Error(`Unknown step kind: ${step.kind}`);
        }
        logger.debug(`Step execution completed, result: ${typeof result}, value: ${result ? JSON.stringify(result).substring(0, 100) : 'undefined'}`);
        break; // Success, exit retry loop
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw error;
        }
        logger.warn(`Step '${step.id}' attempt ${attempt} failed, retrying: ${error.message}`);
        await this.sleep(Math.pow(2, attempt - 1) * 1000); // Exponential backoff
      }
    }

    // Save result if specified
    if (step.save && result !== undefined) {
      context.state[step.save] = result;
      logger.debug(`Saved result to '${step.save}': ${typeof result === 'string' ? result.substring(0, 100) + '...' : JSON.stringify(result)}`);
    }
  }

  async executeLLMStep(step, context) {
    logger.debug(`Executing LLM step with provider: ${step.provider}`);

    if (!step.provider) {
      throw new Error(`LLM step '${step.id}' missing provider`);
    }

    if (!step.model) {
      throw new Error(`LLM step '${step.id}' missing model`);
    }

    if (!step.prompt) {
      throw new Error(`LLM step '${step.id}' missing prompt`);
    }

    const provider = this.providers[step.provider];
    if (!provider) {
      throw new Error(`Unknown provider: ${step.provider}`);
    }

    logger.debug(`Found provider: ${typeof provider}`);

    const renderedPrompt = await renderer.render(step.prompt, context);
    logger.debug(`Rendered prompt: ${renderedPrompt.substring(0, 100)}...`);

    logger.debug(`Calling provider with model: ${step.model}, prompt length: ${renderedPrompt.length}`);
    const result = await provider(step.model, renderedPrompt, context);
    logger.debug(`Provider returned: ${typeof result}, value: ${result ? JSON.stringify(result).substring(0, 100) : 'undefined'}`);
    
    return result;
  }

  async executeVisionStep(step, context) {
    logger.debug(`Executing Vision step with model: ${step.model}`);

    if (!step.model) {
      throw new Error(`Vision step '${step.id}' missing model`);
    }

    if (!step.input) {
      throw new Error(`Vision step '${step.id}' missing input image`);
    }

    const operation = step.operation || 'analyze';
    const imagePath = await renderer.render(step.input, context);
    
    logger.debug(`Processing image: ${imagePath} with operation: ${operation}`);
    
    let result;
    if (step.operation && this.visionProvider.operations[step.operation]) {
      result = await this.visionProvider.operations[step.operation](step.model, imagePath, context);
    } else {
      result = await this.visionProvider.run(step.model, imagePath, context);
    }
    
    return result;
  }

  async executeAudioStep(step, context) {
    logger.debug(`Executing Audio step with operation: ${step.operation}`);

    if (!step.operation) {
      throw new Error(`Audio step '${step.id}' missing operation`);
    }

    const input = await renderer.render(step.input || step.text || step.audio, context);
    
    logger.debug(`Processing audio operation: ${step.operation} with input: ${typeof input}`);
    
    let result;
    if (this.audioProvider.operations[step.operation]) {
      result = await this.audioProvider.operations[step.operation](input, context);
    } else {
      result = await this.audioProvider.run(step.operation, input, context);
    }
    
    return result;
  }

  async executeVectorDBStep(step, context) {
    logger.debug(`Executing VectorDB step with operation: ${step.operation}`);

    if (!step.operation) {
      throw new Error(`VectorDB step '${step.id}' missing operation`);
    }

    if (!step.backend) {
      throw new Error(`VectorDB step '${step.id}' missing backend`);
    }

    // Initialize vector DB provider if not already done
    if (!this.vectorDBProvider || this.vectorDBProvider.backend !== step.backend) {
      this.vectorDBProvider = new VectorDBProvider(step.backend);
      await this.vectorDBProvider.initialize({
        apiKey: context.secrets[step.backend.toUpperCase()] || process.env[`${step.backend.toUpperCase()}_API_KEY`],
        ...step.config,
      });
    }

    const operation = step.operation;
    let result;

    switch (operation) {
    case 'create':
      result = await this.vectorDBProvider.createCollection(step.collection, step.config);
      break;
    case 'add':
      result = await this.vectorDBProvider.addDocuments(step.collection, step.documents, step.embeddings);
      break;
    case 'search':
      result = await this.vectorDBProvider.search(step.collection, step.query, step.topK || 5, step.filter);
      break;
    case 'delete':
      result = await this.vectorDBProvider.deleteCollection(step.collection);
      break;
    default:
      throw new Error(`Unknown VectorDB operation: ${operation}`);
    }

    return result;
  }

  async executeFineTuneStep(step, context) {
    logger.debug(`Executing FineTune step with operation: ${step.operation}`);

    if (!step.operation) {
      throw new Error(`FineTune step '${step.id}' missing operation`);
    }

    if (!step.provider) {
      throw new Error(`FineTune step '${step.id}' missing provider`);
    }

    // Initialize fine-tune provider if not already done
    if (!this.fineTuneProvider || this.fineTuneProvider.provider !== step.provider) {
      this.fineTuneProvider = new FineTuneProvider(step.provider);
      await this.fineTuneProvider.initialize({
        apiKey: context.secrets[step.provider.toUpperCase()] || process.env[`${step.provider.toUpperCase()}_API_KEY`],
      });
    }

    const operation = step.operation;
    let result;

    switch (operation) {
    case 'create':
      result = await this.fineTuneProvider.createFineTuneJob(step.config);
      break;
    case 'list':
      result = await this.fineTuneProvider.listFineTuneJobs(step.limit);
      break;
    case 'status':
      result = await this.fineTuneProvider.getFineTuneStatus(step.jobId);
      break;
    case 'cancel':
      result = await this.fineTuneProvider.cancelFineTuneJob(step.jobId);
      break;
    case 'validate':
      result = await this.fineTuneProvider.validateTrainingData(step.filePath, step.format);
      break;
    default:
      throw new Error(`Unknown FineTune operation: ${operation}`);
    }

    return result;
  }

  async executeHTTPStep(step, context) {
    logger.debug(`Executing HTTP step: ${step.action} ${step.url}`);

    if (!step.url) {
      throw new Error(`HTTP step '${step.id}' missing url`);
    }

    const renderedUrl = await renderer.render(step.url, context);
    const renderedHeaders = await renderer.renderObject(step.headers || {}, context);
    const renderedBody = step.body ? await renderer.renderObject(step.body, context) : undefined;

    const options = {
      method: step.action || 'GET',
      headers: renderedHeaders,
    };

    if (renderedBody && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = typeof renderedBody === 'string' ? renderedBody : JSON.stringify(renderedBody);
    }

    logger.debug(`HTTP request: ${options.method} ${renderedUrl}`);

    const response = await fetch(renderedUrl, options);
    
    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: data,
    };
  }

  async executeFunctionStep(step, context) {
    logger.debug(`Executing Function step: ${step.function}`);

    if (!step.function) {
      throw new Error(`Function step '${step.id}' missing function name`);
    }

    // This would integrate with a function registry or allow custom functions
    // For now, we'll support some built-in functions
    const builtInFunctions = {
      'math': this.executeMathFunction,
      'string': this.executeStringFunction,
      'date': this.executeDateFunction,
      'json': this.executeJSONFunction,
    };

    const func = builtInFunctions[step.function];
    if (!func) {
      throw new Error(`Unknown function: ${step.function}`);
    }

    const args = step.args ? await renderer.renderObject(step.args, context) : {};
    return await func.call(this, args);
  }

  // Built-in function implementations
  async executeMathFunction(args) {
    const { operation, values } = args;
    
    switch (operation) {
    case 'add':
      return values.reduce((sum, val) => sum + parseFloat(val), 0);
    case 'multiply':
      return values.reduce((product, val) => product * parseFloat(val), 1);
    case 'average':
      return values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length;
    default:
      throw new Error(`Unknown math operation: ${operation}`);
    }
  }

  async executeStringFunction(args) {
    const { operation, input, ...params } = args;
    
    switch (operation) {
    case 'uppercase':
      return input.toUpperCase();
    case 'lowercase':
      return input.toLowerCase();
    case 'replace':
      return input.replace(new RegExp(params.search, 'g'), params.replace);
    case 'split':
      return input.split(params.delimiter || ' ');
    default:
      throw new Error(`Unknown string operation: ${operation}`);
    }
  }

  async executeDateFunction(args) {
    const { operation, ...params } = args;
    
    switch (operation) {
    case 'now':
      return new Date().toISOString();
    case 'format': {
      const date = new Date(params.date || Date.now());
      return date.toLocaleDateString(params.locale, params.options);
    }
    case 'add': {
      const baseDate = new Date(params.date || Date.now());
      baseDate.setDate(baseDate.getDate() + (params.days || 0));
      return baseDate.toISOString();
    }
    default:
      throw new Error(`Unknown date operation: ${operation}`);
    }
  }

  async executeJSONFunction(args) {
    const { operation, input, ...params } = args;
    
    switch (operation) {
    case 'parse':
      return JSON.parse(input);
    case 'stringify':
      return JSON.stringify(input, params.replacer, params.space);
    case 'get': {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      return this.getNestedValue(parsed, params.path);
    }
    default:
      throw new Error(`Unknown JSON operation: ${operation}`);
    }
  }

  async resolveOutput(ast, context) {
    if (!ast.outputs) {
      return null;
    }

    const output = {};
    
    for (const [key, value] of Object.entries(ast.outputs)) {
      try {
        const renderedValue = await renderer.render(value, context);
        output[key] = renderedValue;
      } catch (error) {
        logger.warn(`Failed to render output '${key}': ${error.message}`);
        output[key] = value;
      }
    }

    return output;
  }

  getNestedValue(obj, path) {
    if (!path) return obj;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AgentOrchestrator();
