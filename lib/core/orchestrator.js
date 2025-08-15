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

class AgentOrchestrator {
  constructor() {
    this.providers = {
      openai: openaiProvider,
      huggingface: huggingfaceProvider,
      gemini: geminiProvider,
      ollama: ollamaProvider,
      llama: llamaProvider,
    };
  }

  async execute(ast, input = {}) {
    console.execution(ast.id, ast.version, input);

    const context = {
      input: input,
      vars: {},
      state: {},
      secrets: await secrets.resolveSecrets(ast.secrets),
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
        console.debug(`Variable '${name}' resolved from env: ${varDef.path}`);
      } else if (varDef.type === 'literal') {
        context.vars[name] = varDef.value;
        console.debug(`Variable '${name}' set to literal: ${varDef.value}`);
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
        default:
          throw new Error(`Unknown step kind: ${step.kind}`);
        }
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

    const renderedPrompt = await renderer.render(step.prompt, context);
    logger.debug(`Rendered prompt: ${renderedPrompt.substring(0, 100)}...`);

    const result = await provider(step.model, renderedPrompt, context);
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
    let result;

    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    return result;
  }

  async executeFunctionStep(step, _context) {
    logger.debug(`Executing function step: ${step.id}`);
    // Function execution is a placeholder for future implementation
    throw new Error('Function steps are not yet implemented');
  }

  async resolveOutput(ast, context) {
    logger.debug(`Resolving output: ${ast.output}`);
    return await renderer.render(ast.output, context);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AgentOrchestrator();
